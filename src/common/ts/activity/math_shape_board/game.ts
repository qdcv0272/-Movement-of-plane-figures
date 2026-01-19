import AnimateCC from "@ts/animate/animate_cc";
import SoundManager from "@ts/module/audio/sound_manager";
import { sendMessage } from "@module/utilities/util";
import Step from "@ts/step";
import gsap from "gsap";

import { OverlayScrollbars, ScrollbarsHidingPlugin, SizeObserverPlugin, ClickScrollPlugin } from "overlayscrollbars";

import shapeBoardMain from "./shape_board_main";
import { GsapExecutor, GsapConfig } from "./modules/gsap_manager";
import { GameBtnManager } from "./modules/game_btn_manager";

gsap.config({
  nullTargetWarn: false,
  autoSleep: 60,
  force3D: true,
});

type Props = StepProps & {
  itemUrl?: string; // itemUrl 추가
  beforeBgW?: string; // itemUrl 추가
  beforeBgH?: string; // itemUrl 추가
};

export default class Game extends Step {
  // 홈
  public homeReset: IButton;
  public home: IButton;

  // 옵션 버튼
  public btnOk: IButton;
  public optionPush: IButton;
  public optionFlip: IButton;
  public optionswing: IButton;
  public optionBtnList: any[] = [];
  public arrowBtnList: any[] = [];
  public cmBtnList: any[] = [];
  public flipBtnList: any[] = [];
  public swingBtnList: any[] = [];

  public warnPopBtn: IButton;
  public warnCountPopBtn: IButton;

  // left-popup
  public openPopBtn: IButton;
  public addBtn: IButton;

  // right-popup
  public playBtn: IButton;
  public resetBtn: IButton;
  public onOffBtn: IButton;
  public shapeHomeBtn: IButton;

  // 도형 움직이는 옵션
  private moveRight: boolean = false;
  private moveLeft: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;

  private moveUnitValue: number = 0;

  private swingRotateValue: number = 0;

  public selectedActionModes: {
    push: boolean;
    flip: boolean;
    swing: boolean;
    playState: boolean;
  } = {
    push: false,
    flip: false,
    swing: false,
    playState: true,
  };

  // 마지막에 선택된 옵션 인덱스 저장 (0: push, 1: flip, 2: swing)
  private lastSelectedOptionIndex: number = 0;

  private aniList: GsapConfig[] = [];

  public bindClick: EventListener;
  private bindKeyDown: EventListener;
  private bindKeyUp: EventListener;

  // gsap 실행
  private gsapExecutor: GsapExecutor | null = null;

  // 버튼 모듈
  private btnManager: GameBtnManager;

  constructor(props: Props) {
    super(props);
    this.btnManager = new GameBtnManager(this);
  }

  // root 요소에 대한 public game_btn_manager
  public get rootElement(): HTMLElement {
    return this.root;
  }

  // 마지막에 선택된 옵션 인덱스 반환
  public get getLastSelectedOptionIndex(): number {
    return this.lastSelectedOptionIndex;
  }

  public override start() {
    super.start();

    this.showRoot();
    console.warn("게임 페이지");

    // 누적 rotate 값 초기화
    if (this.gsapExecutor) this.gsapExecutor.updateAccumulatedRotate(0);

    if ((this.props as Props).itemUrl) {
      let originalShape = this.root.querySelector(".originalShape") as HTMLElement;
      let testBox = this.root.querySelector(".shape-box") as HTMLElement;

      // originalShape가 없으면 생성
      if (!originalShape && testBox) {
        originalShape = document.createElement("div");
        originalShape.classList.add("shape", "originalShape");
        originalShape.removeAttribute("style");
        testBox.appendChild(originalShape);
      }

      if (originalShape && testBox) {
        // svg 태그인 경우와 일반 요소인 경우 다르게 처리
        if (originalShape.tagName.toLowerCase() !== "svg") originalShape.style.backgroundImage = `url("${(this.props as Props).itemUrl}")`;

        const scale = 0.78;
        if ((this.props as Props).beforeBgW) {
          const w = parseFloat((this.props as Props).beforeBgW || "0");
          originalShape.style.width = w ? `${Math.ceil(w * scale)}px` : "";
        }
        if ((this.props as Props).beforeBgH) {
          const h = parseFloat((this.props as Props).beforeBgH || "0");
          originalShape.style.height = h ? `${Math.ceil(h * scale)}px` : "";
        }
        originalShape.style.position = "absolute";
        originalShape.style.transformOrigin = "center center";
        gsap.set(originalShape, {
          x: 0,
          y: 0,
          scale: 1,
        });

        this.checkAndAddCustomClass((this.props as Props).itemUrl);
      }
    }
    this.home.classList.remove("dim");
  }

  // w, h 짝수칸 돌릴때 문제가있음
  private checkAndAddCustomClass(itemUrl: string | undefined): void {
    if (itemUrl && itemUrl.includes("num_icon_05.png")) {
      const originalShape = this.root.querySelector(".originalShape") as HTMLElement;
      if (originalShape) {
        originalShape.classList.add("custom-01");
        gsap.set(originalShape, {
          x: 15,
          y: 0,
          transformOrigin: "60px 90px",
          scale: 1,
        });
      }
    }

    if (itemUrl && itemUrl.includes("k_icon_08.png")) {
      const originalShape = this.root.querySelector(".originalShape") as HTMLElement;
      if (originalShape) {
        originalShape.classList.add("custom-02");
        gsap.set(originalShape, {
          x: 0,
          y: -15,
          transformOrigin: "60px 90px",
          scale: 1,
        });
      }
    }
  }

  public override init(cc?: AnimateCC): void {
    super.init(cc);

    this.bindClick = this.hnClick.bind(this);
    this.bindKeyDown = this.onKeyDown.bind(this) as EventListener;
    this.bindKeyUp = this.onKeyUp.bind(this) as EventListener;

    this.btnManager.initAllButtons(); // 버튼 모듈 로 뺌

    this.createScroll();
    this.initGsapExecutor();

    this.root.addEventListener("keydown", this.bindKeyDown, true);
    this.root.addEventListener("keyup", this.bindKeyUp, true);
  }

  // 키보드 막기
  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    if (key !== " " && key !== "Spacebar" && key !== "Enter") return;
    const target = (event.target as HTMLElement) ?? (document.activeElement as HTMLElement | null);
    if (this.isDisabledByClass(target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const key = event.key;
    if (key !== " " && key !== "Spacebar" && key !== "Enter") return;
    const target = (event.target as HTMLElement) ?? (document.activeElement as HTMLElement | null);
    if (this.isDisabledByClass(target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  // gsap 세팅
  private initGsapExecutor(): void {
    this.gsapExecutor = new GsapExecutor(this.root, this.aniList, {
      resetBtn: this.resetBtn,
      onOffBtn: this.onOffBtn,
      openPopBtn: this.openPopBtn,
      playBtn: this.playBtn,
    });
  }

  //OverlayScrollbars 생성 초기화
  private createScroll() {
    this.root.querySelectorAll(".js-scroll-cont").forEach((elem) => {
      const scrollObj = OverlayScrollbars(elem as HTMLElement, {
        scrollbars: {
          theme: "os-theme-custom ",
        },
        overflow: {
          x: "hidden",
          y: "scroll",
        },
      });
      // @ts-ignore
      (elem as any).scrollObj = scrollObj;
      scrollObj.update();
    });
  }

  private hnClick(event: Event): void {
    const e = event as PointerEvent;
    const target = e.target as HTMLElement;
    const btn = e.target as IButton;
    const btnType = btn.btnType;
    const idx = btn.idx;

    e.stopPropagation();
    e.stopImmediatePropagation();

    // .dim 또는 .pe-none 상태에서는 활성화 모두 차단
    if (this.isDisabledByClass(target)) {
      e.preventDefault();
      return;
    }

    SoundManager.play("button");

    switch (btnType) {
      case "option-box":
        this.handleOptionBoxClick(target, idx);
        break;
      case "arrow":
        this.handleArrowClick(target, idx);
        break;
      case "cm":
        this.handleCmClick(target, idx);
        break;
      case "flip":
        this.handleFlipClick(target);
        break;
      case "swing":
        this.handleSwingClick(target);
        break;
      case "popup":
        this.handlePopupClick(target);
        break;
      case "add-btn":
        this.addCurrentActionToList();
        break;
      case "play":
        this.handlePlayClick(target);
        this.removeActive();
        break;
      case "all-on-off":
        this.handleAllOnOffClick(target);
        break;
      case "reset":
        this.resetMethod();
        break;

      case "warn-pop":
        this.hidWarnPop();
        break;
      case "warn-count-pop":
        this.hidWarnCountPop();
        break;

      case "home":
        console.warn("교구 메인");
        break;
      case "home-reset":
        // this.handleHomeResetClick(target);
        break;
      case "shape-home":
        this.homeMethod();
        break;
    }
  }

  // dim pe-none check
  private isDisabledByClass(element: HTMLElement | null): boolean {
    if (!element) return false;
    let current: HTMLElement | null = element;
    while (current && current !== this.root) {
      if (current.classList && (current.classList.contains("dim") || current.classList.contains("pe-none"))) {
        return true;
      }
      current = current.parentElement as HTMLElement | null;
    }
    return false;
  }

  // ============================== 이동 방법 버튼 설정 ==============================
  /**
   * ------------------ option-box ------------------
   *
   * * 옵션 박스 클릭 핸들러 (밀기/뒤집기/돌리기)
   * * 선택된 모드에 따라 UI와 내부 상태를 변경
   */
  private handleOptionBoxClick(target: HTMLElement, idx: number): void {
    // 모드 전환 시 active 초기화
    this.clearAllActive();
    const options = this.root.querySelectorAll(".option-pop-left .option-control .control");
    options.forEach((option) => option.classList.add("d-none"));
    this.clearActiveClasses(this.optionBtnList);
    target.classList.add("active");

    options[idx].classList.remove("d-none");

    // 마지막 선택된 옵션 인덱스 저장
    this.lastSelectedOptionIndex = idx;

    const optionControl = this.root.querySelector(".option-control");

    // optionControl에 target의 클래스 추가
    if (optionControl) {
      // 기존 option 클래스들 제거
      optionControl.classList.remove("option-push", "option-flip", "option-swing");

      // target의 클래스 중 option-push, option-flip, option-swing 찾아서 추가
      if (target.classList.contains("option-push")) {
        optionControl.classList.add("option-push");
      } else if (target.classList.contains("option-flip")) {
        optionControl.classList.add("option-flip");
      } else if (target.classList.contains("option-swing")) {
        optionControl.classList.add("option-swing");
      }
    }

    // 모드 상태 세팅
    this.selectedActionModes = {
      push: idx === 0,
      flip: idx === 1,
      swing: idx === 2,
      playState: true,
    };
    if (this.addBtn) this.addBtn.classList.add("dim");
  }

  // 모든 액티브 상태 초기화
  private clearAllActive(): void {
    this.clearActiveClasses(this.arrowBtnList);
    this.clearActiveClasses(this.cmBtnList);
    this.clearActiveClasses(this.flipBtnList);
    this.clearActiveClasses(this.swingBtnList);
    if (this.addBtn) this.addBtn.classList.add("dim");
  }

  private clearActiveClasses(buttonList: any[]): void {
    buttonList.forEach((btn) => btn.classList.remove("active"));
  }

  /**
   * ------------------ arrow ------------------
   *
   * * 방향 화살표 도형 이동 방향을 설정
   */
  private handleArrowClick(target: HTMLElement, idx: number): void {
    this.clearActiveClasses(this.arrowBtnList);
    target.classList.add("active");

    // 방향 상태 설정
    this.resetMoveState();
    this.setDirectionByIndex(idx);

    // cm 버튼 중 active된 것이 있으면 moveUnitValue도 세팅
    const activeCmBtn = this.cmBtnList.find((btn) => btn.classList.contains("active"));
    if (activeCmBtn) {
      this.moveUnitValue = (activeCmBtn.idx + 1) * 30;
    }
    this.checkAddBtnActive();
  }

  // 이동 상태 초기화 , 모든 방향 및 값 변수들을 초기 상태
  private resetMoveState(): void {
    this.moveRight = false;
    this.moveLeft = false;
    this.moveUp = false;
    this.moveDown = false;
    this.moveUnitValue = 0;
    this.swingRotateValue = 0;
  }

  /**
   * * 인덱스에 따른 방향 설정
   * * 0: 위, 1: 오른쪽, 2: 아래, 3: 왼쪽
   */
  private setDirectionByIndex(idx: number): void {
    if (idx === 0) this.moveUp = true;
    else if (idx === 1) this.moveRight = true;
    else if (idx === 2) this.moveDown = true;
    else if (idx === 3) this.moveLeft = true;
  }

  /**
   * ------------------ arrow, cm, flip, swing ------------------
   *
   * * 추가 버튼 활성화 조건 체크
   * * 각 모드별로 필요한 설정이 모두 완료되었는지 확인하여 추가 버튼을 활성화
   */
  private checkAddBtnActive() {
    if (!this.addBtn) return;
    this.addBtn.classList.add("dim");

    if (this.root.querySelector(".option-push.active")) {
      const controlPush = this.root.querySelector(".option-control .control-push");
      if (controlPush) {
        const arrowActive = controlPush.querySelectorAll(".arrow.active").length;
        const cmActive = controlPush.querySelectorAll(".cm.active").length;
        // 화살표 , cm 체크
        if (arrowActive === 1 && cmActive === 1) {
          this.addBtn.classList.remove("dim");
        }
      }
    } else if (this.root.querySelector(".option-flip.active")) {
      const controlFlip = this.root.querySelector(".option-control .control-flip");
      if (controlFlip) {
        const flipActive = controlFlip.querySelectorAll(".flip.active").length;
        if (flipActive === 1) {
          this.addBtn.classList.remove("dim");
        }
      }
    } else if (this.root.querySelector(".option-swing.active")) {
      const controlSwing = this.root.querySelector(".option-control .control-swing");
      if (controlSwing) {
        const swingActive = controlSwing.querySelectorAll(".swing.active").length;
        if (swingActive === 1) {
          this.addBtn.classList.remove("dim");
        }
      }
    }
  }

  /**
   * ------------------ cm ------------------
   *
   * * 센티미터 버튼
   * * 도형 이동 거리를 설정 (1cm = 30px)
   */
  private handleCmClick(target: HTMLElement, idx: number): void {
    this.clearActiveClasses(this.cmBtnList);
    target.classList.add("active");
    this.moveUnitValue = (idx + 1) * 30;

    // 방향 정보는 그대로 둔다! (resetMoveState() 호출 X)
    this.checkAddBtnActive();
  }

  /**
   * ------------------ flip ------------------
   *
   * * 뒤집기 버튼
   * * 도형 뒤집기 방향을 설정
   */
  private handleFlipClick(target: HTMLElement): void {
    this.clearActiveClasses(this.flipBtnList);
    target.classList.add("active");
    this.checkAddBtnActive();
  }

  /**
   * ------------------ swing ------------------
   *
   * * 돌리기 버튼
   * * 도형 회전 각도와 방향을 설정
   */
  private handleSwingClick(target: HTMLElement): void {
    this.clearActiveClasses(this.swingBtnList);
    target.classList.add("active");
    this.swingRotateValue = this.calculateSwingAngle(target);
    this.checkAddBtnActive();
  }

  /**
   * 회전 각도 계산 함수
   * 시계방향은 양수, 반시계방향은 음수로 반환
   */
  private calculateSwingAngle(target: HTMLElement): number {
    const angleAttr = target.getAttribute("data-angle");
    let angle = angleAttr ? parseInt(angleAttr, 10) : 90;

    target.classList.contains("swing-l") ? (angle = -Math.abs(angle)) : (angle = Math.abs(angle));
    return angle;
  }
  // ============================== 이동 방법 버튼 설정 ==============================

  /**
   * ------------------ Popup ------------------
   *
   * closePopupAnimation , closePopup 다르게 작동함
   */
  private handlePopupClick(target: HTMLElement): void {
    target.classList.contains("active") ? this.gsapExecutor?.closePopup(target) : this.gsapExecutor?.openPopup(target);
  }

  // ============================== 이동세팅 애니 설정&이동 ==============================
  /**
   * ------------------ add-btn ------------------
   *
   * * 현재 설정된 액션을 리스트에 추가
   * * 선택된 모드(밀기/뒤집기/돌리기)와 설정값에 따라 애니메이션 설정을 생성하고 aniList에 추가
   */
  private addCurrentActionToList() {
    const optionBtns = this.root.querySelectorAll(".option-pop-left .option-box .option");
    optionBtns.forEach((btn: Element, idx: number) => {
      if (btn.classList.contains("active")) {
        this.selectedActionModes = {
          push: idx === 0,
          flip: idx === 1,
          swing: idx === 2,
          playState: true,
        };
      }
    });

    // T의 모든 속성을 선택적(?)으로 바꿔
    const currentAnimConfig: Partial<GsapConfig> = {};
    // push 모드
    if (this.selectedActionModes.push) {
      let finalMoveX = 0;
      let finalMoveY = 0;
      if (this.moveRight) finalMoveX = this.moveUnitValue;
      else if (this.moveLeft) finalMoveX = -this.moveUnitValue;
      if (this.moveUp) finalMoveY = -this.moveUnitValue;
      else if (this.moveDown) finalMoveY = this.moveUnitValue;

      currentAnimConfig.type = "push";
      currentAnimConfig.moveX = finalMoveX;
      currentAnimConfig.moveY = finalMoveY;
      currentAnimConfig.playState = true;
    }
    // flip 모드
    if (this.selectedActionModes.flip) {
      // arrowBtnList, moveUp/moveDown/moveLeft/moveRight 등은 무시
      // flipBtnList에서 active된 버튼의 data-direction만 사용
      const activeFlipBtn = this.flipBtnList.find((btn) => btn.classList.contains("active"));
      let direction = activeFlipBtn?.getAttribute("data-direction");
      let flipRotateX_relative = 0;
      let flipRotateY_relative = 0;
      let flipMoveX = 0;
      let flipMoveY = 0;

      // 실행 시점 동적 계산을 위해 방향만 저장하고, 이동 거리는 실행 시에 계산되도록 함
      // const originalShape = this.root.querySelector(".originalShape") as HTMLElement;
      // const bgW = originalShape ? parseFloat(originalShape.style.width) || originalShape.offsetWidth || 0 : 0;
      // const bgH = originalShape ? parseFloat(originalShape.style.height) || originalShape.offsetHeight || 0 : 0;

      switch (direction) {
        case "up":
          flipRotateX_relative = 180;
          break;
        case "down":
          flipRotateX_relative = -180;
          break;
        case "left":
          flipRotateY_relative = -180;
          break;
        case "right":
          flipRotateY_relative = 180;
          break;
      }

      currentAnimConfig.type = "flip";
      currentAnimConfig.flipRotateX_relative = flipRotateX_relative;
      currentAnimConfig.flipRotateY_relative = flipRotateY_relative;
      // 이동 거리는 실행 시점에 도형 크기로 재계산되도록 방향만 저장
      currentAnimConfig.flipMoveX = flipMoveX;
      currentAnimConfig.flipMoveY = flipMoveY;
      currentAnimConfig.flipDirection = (direction as any) || undefined;
      currentAnimConfig.playState = true;
    }
    // swing 모드
    if (this.selectedActionModes.swing) {
      currentAnimConfig.type = "swing";
      currentAnimConfig.swingValue = this.swingRotateValue;
      currentAnimConfig.playState = true;
    }
    // aniList에 추가
    if (currentAnimConfig.type) {
      this.aniList.push(currentAnimConfig as GsapConfig);
      this.renderActionItem(currentAnimConfig, this.aniList.length - 1);
      (Object.keys(this.selectedActionModes) as Array<keyof typeof this.selectedActionModes>).forEach((key) => {
        // 상태 초기화
        this.selectedActionModes[key] = false;
      });
      // 추가하기 누른후 초기화 제거
      // this.clearAllActive();
      // this.root.querySelectorAll(".option-control .active").forEach((btn) => btn.classList.remove("active"));
      // this.resetMoveState();
      // if (this.addBtn) this.addBtn.classList.add("dim");
      // this.updateActionIndices();
      this.updatePlayBtnDim();
      this.updateActionNumbers();
    } else {
      console.warn("선택된 애니 모드가 없어 aniList에 추가되지 않았습니다. (push, flip, swing 중 하나를 선택하세요)");
    }

    if (this.aniList.length === 1) this.onOffBtn.classList.remove("pe-none");
    if (this.aniList.length === 10) this.showWarnCountPop();
  }

  // 인덱스 및 버튼 이벤트 재정렬
  private updateActionIndices() {
    const actionList = this.root.querySelector(".action-list");
    const actions = actionList?.querySelectorAll(".action") || [];
    actions.forEach((item, i) => {
      item.setAttribute("data-idx", i.toString());

      // 번호 요소 업데이트
      const numberEl = item.querySelector(".number");
      if (numberEl) {
        numberEl.textContent = `${i + 1}`;
      }

      // up/down/del/onOff 버튼 data-idx 및 이벤트 재등록
      const upBtn = item.querySelector(".arr-up.btn");
      if (upBtn) {
        upBtn.setAttribute("data-idx", i.toString());
        upBtn.replaceWith(upBtn.cloneNode(true));
        (item.querySelector(".arr-up.btn") as HTMLElement).addEventListener("click", () => this.moveActionItemUp(i));
      }
      const downBtn = item.querySelector(".arr-down.btn");
      if (downBtn) {
        downBtn.setAttribute("data-idx", i.toString());
        downBtn.replaceWith(downBtn.cloneNode(true));
        (item.querySelector(".arr-down.btn") as HTMLElement).addEventListener("click", () => this.moveActionItemDown(i));
      }
      const delBtn = item.querySelector(".del.btn");
      if (delBtn) {
        delBtn.setAttribute("data-idx", i.toString());
        delBtn.replaceWith(delBtn.cloneNode(true));
        (item.querySelector(".del.btn") as HTMLElement).addEventListener("click", () => this.deleteActionItem(i));
      }
      const onOffBtn = item.querySelector(".on-off.btn");
      if (onOffBtn) {
        onOffBtn.setAttribute("data-idx", i.toString());
        onOffBtn.replaceWith(onOffBtn.cloneNode(true));
        (item.querySelector(".on-off.btn") as HTMLElement).addEventListener("click", (e) => this.toggleActionOnOff(i, e.currentTarget as HTMLElement));
      }
    });

    // 모든 arr-up/arr-down에서 dim 제거
    actions.forEach((item) => {
      const upBtn = item.querySelector(".arr-up.btn");
      if (upBtn) upBtn.classList.remove("dim");
      const downBtn = item.querySelector(".arr-down.btn");
      if (downBtn) downBtn.classList.remove("dim");
    });

    // 0번째 arr-up에 dim 추가
    if (actions[0]) {
      const upBtn = actions[0].querySelector(".arr-up.btn");
      if (upBtn) upBtn.classList.add("dim");
    }
    // 마지막 arr-down에 dim 추가
    if (actions.length > 0) {
      const downBtn = actions[actions.length - 1].querySelector(".arr-down.btn");
      if (downBtn) downBtn.classList.add("dim");
    }
  }

  // 위로 이동
  private moveActionItemUp(index: number) {
    if (index === 0) return;
    SoundManager.play("button");
    this.swap(this.aniList, index, index - 1);

    const actionList = this.root.querySelector(".action-list");
    const actions = Array.from(actionList?.children || []);

    if (actions[index] && actions[index - 1]) actionList?.insertBefore(actions[index], actions[index - 1]);

    this.updateActionIndices(); // 재정렬 다시
    this.updateActionNumbers(); // 번호 갱신
  }

  // 아래로 이동
  private moveActionItemDown(index: number) {
    if (index === this.aniList.length - 1) return;
    SoundManager.play("button");
    this.swap(this.aniList, index, index + 1);

    const actionList = this.root.querySelector(".action-list");
    const actions = Array.from(actionList?.children || []);

    if (actions[index] && actions[index + 1]) actionList?.insertBefore(actions[index + 1], actions[index]);

    this.updateActionIndices(); // 재정렬 다시
    this.updateActionNumbers(); // 번호 갱신
  }

  // 개별 삭제 버튼
  private deleteActionItem(index: number) {
    SoundManager.play("button");
    this.aniList.splice(index, 1);

    const actionList = this.root.querySelector(".action-list");
    const actionElem = actionList?.querySelector(`.action[data-idx="${index}"]`);
    if (actionElem) {
      actionElem.remove();
    }

    // 인덱스 재정렬 (data-idx, 버튼 등)
    actionList?.querySelectorAll(".action").forEach((item, i) => {
      item.setAttribute("data-idx", i.toString());
      const delBtn = item.querySelector(".del.btn");
      if (delBtn) {
        delBtn.setAttribute("data-idx", i.toString());
        // 기존 이벤트 제거 후 재등록
        const newDelBtn = delBtn.cloneNode(true) as HTMLElement;
        delBtn.replaceWith(newDelBtn);
        newDelBtn.addEventListener("click", () => this.deleteActionItem(i));
      }
    });

    this.updateActionIndices(); // 재정렬 다시
    this.updatePlayBtnDim(); // dim 갱신
    this.updateActionNumbers(); // 번호 갱신

    if (this.aniList.length === 0) {
      this.onOffBtn.classList.add("pe-none");
      this.onOffBtn.classList.remove("active");
    }
  }

  /**
   * on-Off 토글
   * * on 이면 건너뜀 playState가 false면 active
   */
  private toggleActionOnOff(index: number, btn: HTMLElement) {
    SoundManager.play("button");
    const action = this.aniList[index];
    if (!action) return;
    action.playState = !action.playState;

    btn.classList.toggle("active", !action.playState); // playState가 false면 active

    const parentAction = btn.closest(".action") as HTMLElement;

    if (btn.classList.contains("active")) {
      parentAction.classList.add("dim");

      // 맨위 올리기
      // if (parentAction.classList.contains("act-select")) {
      //   // 원래 위치 저장
      //   const originalIndex = parseInt(parentAction.getAttribute("data-idx") || "0");
      //   parentAction.setAttribute("data-original-index", originalIndex.toString());

      //   // action-list의 맨 앞으로 이동
      //   const actionList = this.root.querySelector(".action-list") as HTMLElement;
      //   if (actionList && parentAction) {
      //     actionList.insertBefore(parentAction, actionList.firstChild);

      //     // DOM 갱신 및 재정렬
      //     // this.updateActionIndices();
      //     this.updateActionNumbers();

      //     // 스크롤을 맨 위로 이동
      //     setTimeout(() => {
      //       const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
      //       if (!elem || !("scrollObj" in elem)) return;

      //       const scrollObj = (elem as any).scrollObj as any;
      //       const viewport = scrollObj.elements().viewport;
      //       viewport.scrollTo({ top: 0, behavior: "smooth" });
      //     }, 0);
      //   }
      // }
    } else {
      parentAction.classList.remove("dim");

      // 원래 자리 돌리기
      // if (parentAction.classList.contains("act-select")) {
      //   // 원래 자리로 돌려주기
      //   const actionList = this.root.querySelector(".action-list") as HTMLElement;
      //   if (actionList && parentAction) {
      //     // 저장된 원래 인덱스 가져오기
      //     const originalIndex = parseInt(parentAction.getAttribute("data-original-index") || "0");

      //     // 현재 모든 액션들을 배열로 가져오기
      //     const allActions = Array.from(actionList.children) as HTMLElement[];

      //     // 현재 액션을 배열에서 제거
      //     const currentActionIndex = allActions.indexOf(parentAction);
      //     if (currentActionIndex > -1) {
      //       allActions.splice(currentActionIndex, 1);
      //     }

      //     // 원래 인덱스 위치에 삽입
      //     if (originalIndex >= allActions.length) {
      //       allActions.push(parentAction);
      //     } else {
      //       allActions.splice(originalIndex, 0, parentAction);
      //     }

      //     // DOM을 새로운 순서로 재구성
      //     allActions.forEach((action) => {
      //       actionList.appendChild(action);
      //     });

      //     // 원래 인덱스 속성 제거
      //     parentAction.removeAttribute("data-original-index");

      //     // DOM 갱신 및 재정렬
      //     this.updateActionIndices();
      //     this.updateActionNumbers();

      //     // 스크롤을 해당 위치로 이동
      //     setTimeout(() => {
      //       const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
      //       if (!elem || !("scrollObj" in elem)) return;

      //       const scrollObj = (elem as any).scrollObj as any;
      //       const viewport = scrollObj.elements().viewport;

      //       // 해당 액션의 위치 계산
      //       const actionTop = parentAction.offsetTop;
      //       const containerHeight = viewport.clientHeight;
      //       const scrollTop = Math.max(0, actionTop - containerHeight / 2);

      //       viewport.scrollTo({ top: scrollTop, behavior: "smooth" });
      //     }, 0);
      //   }
      // }
    }

    // play 버튼 dim 토글
    const actions = Array.from(this.root.querySelectorAll(".action-list .action"));
    const allDim = actions.length > 0 && actions.every((action) => action.classList.contains("dim"));
    allDim ? this.playBtn.classList.add("dim") : this.playBtn.classList.remove("dim");

    // number textContent 다시 렌더링
    this.updateActionNumbers();
  }

  // 액션 리스트 변화에 따라 playBtn의 dim 상태를 갱신
  private updatePlayBtnDim() {
    const actionListElem = this.root.querySelector(".action-list");
    const playBtn = this.playBtn;
    if (!actionListElem || !playBtn) return;
    const actionCount = actionListElem.querySelectorAll(".action").length;

    actionCount > 0 ? playBtn.classList.remove("dim") : playBtn.classList.add("dim");
    actionCount > 0 ? this.resetBtn.classList.remove("dim") : this.resetBtn.classList.add("dim");
  }

  /**
   * 액션 번호를 다시 렌더링
   * playState가 true인 액션들만 순서대로 번호를 매김
   */
  private updateActionNumbers() {
    const actions = Array.from(this.root.querySelectorAll(".action-list .action"));
    let visibleNumber = 1;

    actions.forEach((action) => {
      const numberEl = action.querySelector(".number") as HTMLElement;
      if (!numberEl) return;

      // playState가 true인 액션만 번호를 표시
      const onOffBtn = action.querySelector(".on-off.btn") as HTMLElement;
      if (onOffBtn && !onOffBtn.classList.contains("active")) {
        // playState가 true인 경우 (on 상태)
        numberEl.textContent = visibleNumber.toString();
        visibleNumber++;
      } else {
        // playState가 false인 경우 (off 상태)
        numberEl.textContent = "";
      }
    });
  }

  private removeActive() {
    this.root.querySelectorAll(".option-control .control .active").forEach((btn) => btn.classList.remove("active"));
    this.addBtn.classList.add("dim");
  }

  // ============================== 이동세팅 애니 설정&이동 ==============================

  // ============================== Warn_pop ==============================
  private hidWarnPop() {
    const warnPopup = this.root.querySelector(".warn-pop") as HTMLElement;
    warnPopup.classList.add("d-none");

    this.openPopBtn.classList.remove("pe-none");
    const optionPopLeft = this.root.querySelector(".option-pop-left") as HTMLElement;
    optionPopLeft.classList.remove("pe-none");
    const scrolls = this.root.querySelector(".option-pop-right  .scroll-cont") as HTMLElement;
    scrolls.classList.remove("pe-none");

    this.playBtn.textContent = "움직이기";
    this.playBtn.classList.remove("dim");
    this.playBtn.classList.remove("active");

    this.onOffBtn.classList.remove("pe-none");

    const firstClonedShapes = this.root.querySelectorAll(".shape-box .firstCopyShape");
    firstClonedShapes.forEach((element) => {
      element.remove();
    });

    this.gsapExecutor?.openPopupAnimation();
  }
  private showWarnCountPop() {
    this.aniList.pop();
    this.root.querySelector(".warn-pop-count")?.classList.remove("d-none");
  }

  private hidWarnCountPop() {
    this.root.querySelector(".warn-pop-count")?.classList.add("d-none");
  }
  // ============================== Warn_pop ==============================

  // ============================== right_pop ==============================
  private handlePlayClick(target: HTMLElement): void {
    target.classList.add("active");
    target.textContent = "정지";

    if (this.gsapExecutor) {
      this.root.querySelectorAll(".action.act-select").forEach((act) => act.classList.remove("act-select"));
      this.gsapExecutor.executeAllActions(); // 모듈로 뺌
    }
    // 스크롤을 맨 위로 이동
    setTimeout(() => {
      const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
      if (!elem || !("scrollObj" in elem)) return;

      const scrollObj = (elem as any).scrollObj as any;
      const viewport = scrollObj.elements().viewport;
      viewport.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  // 이동 순서 화살표 on off
  private handleAllOnOffClick(target: HTMLElement): void {
    const isActive = target.classList.toggle("active");
    const actionList = this.root.querySelector(".action-list") as HTMLElement;

    actionList.querySelectorAll(".action .sub-change-box").forEach((onOff) => onOff.classList.toggle("invisible", !isActive));

    if (target.classList.contains("active")) {
      const actions = actionList.querySelectorAll(".action");
      const allDim = actions.length > 0 && Array.from(actions).every((action) => action.classList.contains("dim"));
      this.playBtn.classList.add("dim");
    } else {
      const actions = actionList.querySelectorAll(".action");
      const allDim = actions.length > 0 && Array.from(actions).every((action) => action.classList.contains("dim"));
      this.playBtn.classList.remove("dim");
    }
  }

  private resetMethod(): void {
    // 애니메이션 실행 중이면 중단
    if (this.gsapExecutor) {
      if (this.gsapExecutor.getIsPlaying()) {
        this.gsapExecutor.setIsPlaying(false);
        const currentTimeline = this.gsapExecutor.getCurrentTimeline();
        if (currentTimeline) {
          currentTimeline.kill();
        }
      }
      this.gsapExecutor.enableControls();
    }

    const actionListElem = this.root.querySelector(".action-list");
    if (actionListElem) {
      actionListElem.innerHTML = "";
    }

    // 복제 도형 삭제
    const copyShapes = this.root.querySelectorAll(".shape-box .copyShape, .shape-box .firstCopyShape");
    copyShapes.forEach((shape) => shape.remove());

    // 내부 상태 초기화
    this.resetMoveState();
    if (this.gsapExecutor) {
      this.gsapExecutor.updateAccumulatedRotate(0); // 누적 rotate 값 초기화
      this.gsapExecutor.openPopupAnimation();
      let originalShape = this.root.querySelector(".originalShape") as HTMLElement;
      this.gsapExecutor.revertBackgroundImageUrl(originalShape);
    }
    this.selectedActionModes = {
      push: false,
      flip: false,
      swing: false,
      playState: true,
    };
    this.clearAllActive();
    if (this.addBtn) this.addBtn.classList.add("dim");
    this.playBtn.classList.remove("active");
    this.playBtn.textContent = "움직이기";
    this.updatePlayBtnDim();

    const shapes = this.root.querySelectorAll(".shape-box .shape");
    shapes.forEach((shape) => {
      if (shape.classList.contains("copyShale")) shape.remove();
      if (shape.classList.contains("firstCopyShape")) {
        shape.remove();
      }
    });

    this.aniList.length = 0; // [] 하면 안됨
    this.updateActionNumbers(); // 번호 초기화
    this.openPopBtn.classList.remove("dim");

    this.handleAllOnOffClick(this.onOffBtn);
    this.playBtn.classList.add("dim");
    this.onOffBtn.classList.remove("active");
    this.onOffBtn.classList.add("pe-none");
  }
  // ============================== right_pop ==============================

  // ============================== create ==============================
  private renderActionItem(config: any, index: number) {
    const actionList = this.root.querySelector(".action-list");
    if (!actionList) return;
    if (this.aniList.length === 10) return;

    const action = this.createActionElement(config, index);
    const { subActBox, subChangeBox } = this.createActionButtons(config, index);
    const subModeBox = this.createModeElements(config);
    const actionNum = this.createActionNumber(index);

    action.appendChild(subActBox);
    action.appendChild(subChangeBox);
    action.appendChild(subModeBox);
    action.appendChild(actionNum);

    action.style.position = "relative";

    this.positionSubChangeBox(subChangeBox, subModeBox);

    actionList.appendChild(action);
    this.updateActionIndices();

    // 액션 아이템이 추가된 후 스크롤을 맨 아래로 이동
    setTimeout(() => {
      const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
      if (!elem || !("scrollObj" in elem)) return;

      const scrollObj = (elem as any).scrollObj as any;
      const viewport = scrollObj.elements().viewport;
      const maxScrollTop = scrollObj.state().overflowAmount.y;

      if (maxScrollTop > 0) viewport.scrollTo({ top: maxScrollTop, behavior: "smooth" });
    }, 0);
  }

  private createActionElement(config: any, index: number): HTMLElement {
    const action = document.createElement("div");
    action.classList.add("action");
    action.setAttribute("data-idx", index.toString());

    if (config.type === "push") {
      action.classList.add("mode-push");
    } else if (config.type === "flip") {
      action.classList.add("mode-flip");
    } else if (config.type === "swing") {
      action.classList.add("mode-swing");
    }

    return action;
  }
  private createActionNumber(index: number): HTMLElement {
    const number = document.createElement("div");
    number.classList.add("number");
    number.textContent = `${index + 1}`;

    return number;
  }
  private createActionButtons(config: any, index: number): { subActBox: HTMLElement; subChangeBox: HTMLElement } {
    const subActBox = document.createElement("div");
    subActBox.classList.add("sub-act-box");

    const onOff = this.createOnOffButton(config, index);
    const del = this.createDeleteButton(index);
    const { up, down } = this.createArrowButtons(index);

    const subChangeBox = document.createElement("div");

    this.onOffBtn.classList.contains("active") ? subChangeBox.classList.add("sub-change-box") : subChangeBox.classList.add("sub-change-box", "invisible");

    subChangeBox.appendChild(up);
    subChangeBox.appendChild(down);

    subActBox.appendChild(onOff);
    subActBox.appendChild(del);

    return { subActBox, subChangeBox };
  }
  private createOnOffButton(config: any, index: number): HTMLElement {
    const onOff = document.createElement("button");
    onOff.classList.add("on-off", "btn");
    onOff.setAttribute("data-idx", index.toString());

    if (!config.playState) onOff.classList.add("active");

    onOff.addEventListener("click", (e) => {
      this.toggleActionOnOff(index, e.currentTarget as HTMLElement);
    });
    return onOff;
  }
  private createDeleteButton(index: number): HTMLElement {
    const del = document.createElement("button");
    del.classList.add("del", "btn");
    del.setAttribute("data-idx", index.toString());
    del.addEventListener("click", (e) => {
      this.deleteActionItem(index);
    });
    return del;
  }
  private createArrowButtons(index: number): { up: HTMLElement; down: HTMLElement } {
    const up = document.createElement("button");
    up.classList.add("arr-up", "btn");
    up.setAttribute("data-idx", index.toString());
    up.addEventListener("click", () => this.moveActionItemUp(index));

    const down = document.createElement("button");
    down.classList.add("arr-down", "btn");
    down.setAttribute("data-idx", index.toString());
    down.addEventListener("click", () => this.moveActionItemDown(index));

    return { up, down };
  }
  private createModeElements(config: any): HTMLElement {
    const mode = document.createElement("div");
    mode.classList.add("mode", "item");
    const move = document.createElement("div");
    move.classList.add("move", "item");
    const length = document.createElement("div");
    length.classList.add("length", "item");

    const subModeBox = document.createElement("div");
    subModeBox.classList.add("sub-mode-box");
    subModeBox.appendChild(mode);
    subModeBox.appendChild(move);

    if (config.type === "push") subModeBox.appendChild(length);

    this.setModeTexts(config, mode, move, length);

    return subModeBox;
  }
  private setModeTexts(config: any, mode: HTMLElement, move: HTMLElement, length: HTMLElement): void {
    if (config.type === "push") {
      mode.textContent = "밀기";
      if (config.moveX > 0) move.textContent = "오른쪽";
      else if (config.moveX < 0) move.textContent = "왼쪽";
      else if (config.moveY < 0) move.textContent = "위쪽";
      else if (config.moveY > 0) move.textContent = "아래쪽";

      const lengthValue = Math.abs(config.moveX || config.moveY) / 30;
      length.textContent = `${lengthValue}cm`;
    } else if (config.type === "flip") {
      mode.textContent = "뒤집기";
      if (config.flipRotateX_relative !== 0) move.textContent = config.flipRotateX_relative > 0 ? "위쪽" : "아래쪽";
      else if (config.flipRotateY_relative !== 0) move.textContent = config.flipRotateY_relative > 0 ? "오른쪽" : "왼쪽";
    } else if (config.type === "swing") {
      mode.textContent = "돌리기";
      // 각도 정보 추가
      const direction = config.swingValue > 0 ? "시계 방향" : "시계 반대 방향";
      move.textContent = `${direction} ${Math.abs(config.swingValue)}°`;
    }
  }
  private positionSubChangeBox(subChangeBox: HTMLElement, subModeBox: HTMLElement): void {
    requestAnimationFrame(() => {
      const top = subModeBox.offsetTop + subModeBox.offsetHeight / 2 - subChangeBox.offsetHeight / 2;
      const left = subModeBox.offsetLeft + subModeBox.offsetWidth;
      gsap.set(subChangeBox, {
        position: "absolute",
        top: top - 2,
        left: left + 10,
      });
    });
  }
  // ============================== create ==============================

  // ============================== home, swap[], clear ==============================
  private homeMethod(): void {
    sendMessage(window, {
      message: shapeBoardMain.GO_INTRO,
      self: this,
    });

    if (this.gsapExecutor) this.gsapExecutor.updateAccumulatedRotate(0);

    const shapes = this.root.querySelectorAll(".shape-box .shape");
    shapes.forEach((shape) => {
      shape.removeAttribute("style");

      if (shape) {
        if (shape.tagName.toLowerCase() === "svg") {
          shape.remove();
        }
      }
    });

    if (this.gsapExecutor) {
      if (this.gsapExecutor.getIsPlaying()) {
        this.gsapExecutor.setIsPlaying(false);
        const currentTimeline = this.gsapExecutor.getCurrentTimeline();
        if (currentTimeline) {
          currentTimeline.kill();
        }
      }
      this.gsapExecutor.enableControls();
      this.root.querySelectorAll(".action.act-select").forEach((act) => act.classList.remove("act-select"));
      this.playBtn.textContent = "움직이기";
      this.playBtn.classList.remove("active");

      this.gsapExecutor.openPopupAnimation();
    }

    this.aniList.length > 0 ? this.onOffBtn.classList.remove("pe-none") : this.onOffBtn.classList.add("pe-none");

    this.openPopBtn.classList.remove("dim");
  }

  private swap(arr: any[], i: number, j: number) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }

  public override clear() {
    super.clear();

    gsap.killTweensOf(this.root);

    this.root.removeEventListener("keydown", this.bindKeyDown, true);
    this.root.removeEventListener("keyup", this.bindKeyUp, true);
    this.hideRoot();
  }

  private showRoot() {
    this.root.classList.remove("d-none");
  }
  private hideRoot() {
    this.root.classList.add("d-none");
  }
}

