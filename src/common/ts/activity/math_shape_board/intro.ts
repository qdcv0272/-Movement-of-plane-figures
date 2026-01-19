import AnimateCC from "@ts/animate/animate_cc";
import SoundManager from "@ts/module/audio/sound_manager";
import { log, sendMessage } from "@ts/module/utilities/util";
import Step from "@ts/step";

import shapeBoardMain from "./shape_board_main";
import { SvgShapeBoardManager } from "./modules/svg_manager";

type Props = StepProps & {
  // 필요한 파라미터 타입 추가
};

export default class Intro extends Step {
  private btnOk: IButton;
  private bindClick: EventListener;
  private bindKeyDown: EventListener;
  private bindKeyUp: EventListener;

  private btnList: any[];
  private makeBoard: any[];

  private kIconPlayList: any[];
  private shapePlayList: any[];
  private numberPlayList: any[];

  private shapeBtn: HTMLElement | any;
  private kIconBtn: HTMLElement | any;
  private numberBtn: HTMLElement | any;
  private customBtn: HTMLElement | any;

  private kIconPlay: HTMLElement | any;

  private svgManager: SvgShapeBoardManager | null = null;

  private itemUrl: any;
  private beforeBgW: string | undefined;
  private beforeBgH: string | undefined;

  constructor(props: Props) {
    super(props);
  }

  public override init(cc?: AnimateCC): void {
    super.init(cc);

    this.bindClick = this.hnClick.bind(this);
    this.bindKeyDown = this.onKeyDown.bind(this) as EventListener;
    this.bindKeyUp = this.onKeyUp.bind(this) as EventListener;

    this.btnOk = this.root.querySelector(".btn-ok") as IButton;
    this.btnOk.btnType = "btn-ok";
    this.btnOk.addEventListener("click", this.bindClick);

    this.root.addEventListener("keydown", this.bindKeyDown, true);
    this.root.addEventListener("keyup", this.bindKeyUp, true);

    this.btnList = [];
    this.makeBoard = [];
    this.kIconPlayList = [];
    this.shapePlayList = [];
    this.numberPlayList = [];
    this.setBtn();
    this.setMakeBoard();
  }

  private setBtn() {
    this.setMainBtns();
    this.setPlayBtns();
    this.setButtonList();
  }

  private setMakeBoard() {
    this.root.querySelectorAll(".make-board-list .make-board").forEach((btn) => this.makeBoard.push(btn));
  }

  public override clear() {
    super.clear();
    // if (this.btnOk) this.btnOk.removeEventListener("click", this.bindClick);
    this.root.removeEventListener("keydown", this.bindKeyDown, true);
    this.root.removeEventListener("keyup", this.bindKeyUp, true);
    this.hideRoot();
  }

  public override start() {
    super.start();
    this.showRoot();
    
    // 초기 상태 설정
    this.btnOk.classList.add("dim");
    
    // 현재 활성화된 탭에 따라 적절한 체크 실행
    const activeTab = this.root.querySelector(".btn-list .btn.active");
    if (activeTab) {
      const btnType = (activeTab as IButton).btnType;
      if (btnType === "custom") {
        this.checkSVG();
      } else {
        this.checkItems();
      }
    } else {
      // 기본적으로 첫 번째 탭 활성화
      this.makeBoard[0].classList.remove("d-none");
      this.shapeBtn.classList.add("active");
      this.checkItems();
    }

    console.warn("인트로 페이지");
  }

  private showRoot() {
    this.root.classList.remove("d-none");
  }
  private hideRoot() {
    this.root.classList.add("d-none");
  }

  public checkSVG() {
    const svgCanvas = this.root.querySelector("#svgCanvas") as SVGElement;
    if (!svgCanvas) {
      this.btnOk.classList.add("dim");
      return;
    }

    const targetElements = svgCanvas.querySelectorAll("line, rect, polygon");
    let hasValidShape = false;

    targetElements.forEach((element) => {
      const fill = element.getAttribute("fill") || window.getComputedStyle(element).fill;

      if (fill && fill !== "transparent" && fill !== "none" && fill !== "rgba(0, 0, 0, 0)") {
        hasValidShape = true;
      }
    });

    // 즉시 실행하되, DOM 업데이트를 위해 requestAnimationFrame 사용
    requestAnimationFrame(() => {
      if (hasValidShape) {
        this.btnOk.classList.remove("dim");
      } else {
        this.btnOk.classList.add("dim");
      }
    });
  }

  public checkItems() {
    const visibleMakeBoard = this.makeBoard.find((board) => !board.classList.contains("d-none"));

    if (!visibleMakeBoard) {
      this.btnOk.classList.add("dim");
      return;
    }

    const activeItem = visibleMakeBoard.querySelector(".item.active");

    // 즉시 실행하되, DOM 업데이트를 위해 requestAnimationFrame 사용
    requestAnimationFrame(() => {
      if (activeItem) {
        this.btnOk.classList.remove("dim");
      } else {
        this.btnOk.classList.add("dim");
      }
    });
  }

  private hnClick(event: Event): void {
    const e = event as PointerEvent;
    const target = e.target as HTMLElement;
    const btn = e.target as IButton;
    const btnType = btn.btnType;

    // .dim 또는 .pe-none 상태에서는 활성화 모두 차단
    if (this.isDisabledByClass(target)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // this.resetButtonStates();
    SoundManager.play("button");

    switch (btnType) {
      case "btn-ok":
        this.handleOkButtonClick();
        break;
      case "shape":
      case "k-icon":
      case "number":
      case "custom":
        this.handleTabButtonClick(target, btnType);
        break;
      case "k-icon-item":
      case "shape-item":
      case "number-item":
        this.handleItemButtonClick(target, btnType);
        this.checkItems();
        break;
    }
  }

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

  // ============================== 버튼 세팅 ==============================

  private setMainBtns(): void {
    this.shapeBtn = this.root.querySelector(".shape-btn") as HTMLElement;
    this.shapeBtn.btnType = "shape";
    this.shapeBtn.addEventListener("click", this.bindClick);

    this.kIconBtn = this.root.querySelector(".k-icon-btn") as HTMLElement;
    this.kIconBtn.btnType = "k-icon";
    this.kIconBtn.addEventListener("click", this.bindClick);

    this.numberBtn = this.root.querySelector(".number-btn") as HTMLElement;
    this.numberBtn.btnType = "number";
    this.numberBtn.addEventListener("click", this.bindClick);

    this.customBtn = this.root.querySelector(".custom-btn") as HTMLElement;
    this.customBtn.btnType = "custom";
    this.customBtn.addEventListener("click", this.bindClick);
  }

  private setPlayBtns(): void {
    this.setKIconPlayBtns();
    this.setShapePlayBtns();
    this.setNumberPlayBtns();
  }

  private setKIconPlayBtns(): void {
    this.kIconPlay = this.root.querySelector(".k-icon-play") as HTMLElement;
    this.kIconPlay.querySelectorAll(".k-icon-item").forEach((kIcon: Element, i: number) => {
      const button = kIcon as IButton;
      button.idx = i;
      button.btnType = "k-icon-item";
      button.addEventListener("click", this.bindClick);
      this.kIconPlayList.push(button);
    });
  }

  private setShapePlayBtns(): void {
    const shapePlay = this.root.querySelector(".shape-play") as HTMLElement;
    shapePlay.querySelectorAll(".shape-item").forEach((shapeItem: Element, i: number) => {
      const button = shapeItem as IButton;
      button.idx = i;
      button.btnType = "shape-item";
      button.addEventListener("click", this.bindClick);
      this.shapePlayList.push(button);
    });
  }

  private setNumberPlayBtns(): void {
    const numberPlay = this.root.querySelector(".number-play") as HTMLElement;
    numberPlay.querySelectorAll(".number-item").forEach((numberItem: Element, i: number) => {
      const button = numberItem as IButton;
      button.idx = i;
      button.btnType = "number-item";
      button.addEventListener("click", this.bindClick);
      this.numberPlayList.push(button);
    });
  }

  private setButtonList(): void {
    this.root.querySelectorAll(".btn-list .btn").forEach((btn) => this.btnList.push(btn));
  }

  // resetButtonStates() 메서드는 더 이상 사용하지 않음
  // private resetButtonStates(): void {
  //   this.btnOk.classList.add("dim");
  //   this.kIconPlayList.forEach((btn) => btn.classList.remove("active"));
  //   this.shapePlayList.forEach((btn) => btn.classList.remove("active"));
  //   this.numberPlayList.forEach((btn) => btn.classList.remove("active"));
  // }
  // ============================== 버튼 세팅 ==============================

  // ============================== 버튼 OK ==============================
  private handleOkButtonClick(): void {
    const customPlay = this.root.querySelector(".custom-play");
    customPlay && !customPlay.classList.contains("d-none") ? this.handleCustomPlayMode() : this.handleNormalMode();
  }

  private handleCustomPlayMode(): void {
    this.createSVGInShapeBox();

    if (this.svgManager) {
      this.svgManager.exportImageAndSize().then((result) => {
        if (!result || !result.success) return;
        this.addClassesToTargetSvg();
      });
    }

    sendMessage(window, {
      message: shapeBoardMain.GO_GAME,
      self: this,
    });

    const originalShape = document.querySelector(".originalShape") as HTMLElement;
    if (originalShape) originalShape.remove();
  }

  private handleNormalMode(): void {
    sendMessage(window, {
      message: shapeBoardMain.GO_GAME,
      self: this,
      itemUrl: this.itemUrl,
      beforeBgW: this.beforeBgW,
      beforeBgH: this.beforeBgH,
    });
  }

  // ============================== 버튼 OK ==============================

  // ============================== handleCustomPlayMode ==============================
  private createSVGInShapeBox(): void {
    const shapeBox = document.querySelector(".shape-box") as HTMLElement;
    if (!shapeBox) return;

    // 기존 SVG가 있으면 제거
    const existingSvg = shapeBox.querySelector("svg");
    if (existingSvg) {
      existingSvg.remove();
    }

    // 새로운 SVG 요소 생성
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 150 150");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "1px";
    svg.style.width = "150px";
    svg.style.height = "150px";
    svg.style.pointerEvents = "none";

    this.createDotGrid(svg);
    shapeBox.appendChild(svg);
  }

  private createDotGrid(svg: SVGElement): void {
    const N = 6; // 6x6 격자
    const dotRadius = 4; // 점의 크기
    const spacing = 30; // 점과 점 사이 간격
    const leftOffset = 1; // 왼쪽 여백
    const topOffset = 0; // 위쪽 여백

    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const cx = leftOffset + col * spacing;
        const cy = topOffset + row * spacing;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", cx.toString());
        circle.setAttribute("cy", cy.toString());
        circle.setAttribute("r", dotRadius.toString());
        circle.setAttribute("fill", "#666");

        svg.appendChild(circle);
      }
    }
  }

  private addClassesToTargetSvg(): void {
    const shapeBox = document.querySelector(".shape-box") as HTMLElement;
    const targetSvg = shapeBox?.querySelector("svg") as SVGSVGElement;

    if (targetSvg) {
      targetSvg.classList.add("shape", "originalShape", "custom");
    }
  }

  // ============================== handleCustomPlayMode ==============================

  private handleTabButtonClick(target: HTMLElement, btnType: string): void {
    this.btnList.forEach((btn) => btn.classList.remove("active"));
    this.makeBoard.forEach((board) => board.classList.add("d-none"));
    target.classList.add("active");

    // 탭 변경 시 버튼 상태 초기화
    this.btnOk.classList.add("dim");

    switch (btnType) {
      case "shape":
        this.makeBoard[0].classList.remove("d-none");
        this.checkItems();
        break;
      case "k-icon":
        this.makeBoard[1].classList.remove("d-none");
        this.checkItems();
        break;
      case "number":
        this.makeBoard[2].classList.remove("d-none");
        this.checkItems();
        break;
      case "custom":
        this.makeBoard[3].classList.remove("d-none");
        this.initCustomMode();
        this.checkSVG();
        break;
    }
  }

  private initCustomMode(): void {
    if (!this.svgManager) {
      this.svgManager = new SvgShapeBoardManager("svgCanvas");
    }
  }

  private handleItemButtonClick(target: HTMLElement, btnType: string): void {
    const playList = this.getPlayListByType(btnType);
    if (playList) {
      this.root.querySelectorAll(".board .item.active").forEach((item: Element) => {
        item.classList.remove("active");
      });
      target.classList.add("active");
      this.extractItemUrl(target);
      
      // 아이템 선택 시 즉시 버튼 상태 업데이트
      requestAnimationFrame(() => {
        this.btnOk.classList.remove("dim");
      });
    }
  }

  private getPlayListByType(btnType: string): IButton[] | null {
    switch (btnType) {
      case "k-icon-item":
        return this.kIconPlayList;
      case "shape-item":
        return this.shapePlayList;
      case "number-item":
        return this.numberPlayList;
      default:
        return null;
    }
  }

  // StepProps before 영역 준비
  private extractItemUrl(target: HTMLElement) {
    const beforeBgImage = window.getComputedStyle(target, "::before").backgroundImage;
    const beforeBgW = window.getComputedStyle(target, "::before").width;
    const beforeBgH = window.getComputedStyle(target, "::before").height;

    const urlMatch = beforeBgImage.match(/url\(["']?([^"')]+)["']?\)/);
    if (urlMatch) {
      let url = urlMatch[1];
      url = url.replace(/^http:\/\/localhost:3001/, "..");
      this.itemUrl = url;
      this.beforeBgW = beforeBgW;
      this.beforeBgH = beforeBgH;
    }
  }
}

