import gsap from "gsap";

export interface GsapConfig {
  type: "push" | "flip" | "swing";
  moveX?: number;
  moveY?: number;
  flipRotateX_relative?: number;
  flipRotateY_relative?: number;
  flipMoveX?: number;
  flipMoveY?: number;
  // 현재 도형 크기에 따라 실행 시 동적으로 이동 거리를 계산하기 위한 방향 정보
  flipDirection?: "up" | "down" | "left" | "right";
  swingValue?: number;
  playState: boolean;
}

export class GsapExecutor {
  private root: HTMLElement;
  private aniList: GsapConfig[];
  private originalShape: HTMLElement | null = null;
  private currentClonedShape: HTMLElement | null = null;
  private firstClonedShape: HTMLElement | null = null;
  private isPlaying: boolean = false;
  private currentTimeline: gsap.core.Timeline | null = null;
  private accumulatedRotate: number = 0;
  private currentAnimationIndex: number = -1; // 현재 실행 중인 애니메이션 인덱스
  private shouldStopAfterCurrent: boolean = false; // 현재 단계 완료 후 멈출지 여부

  // UI 요소들
  private resetBtn: HTMLElement;
  private onOffBtn: HTMLElement;
  private openPopBtn: HTMLElement;
  private playBtn: HTMLElement;

  constructor(
    root: HTMLElement,
    aniList: GsapConfig[],
    uiElements: {
      resetBtn: HTMLElement;
      onOffBtn: HTMLElement;
      openPopBtn: HTMLElement;
      playBtn: HTMLElement;
    }
  ) {
    this.root = root;
    this.aniList = aniList;
    this.resetBtn = uiElements.resetBtn;
    this.onOffBtn = uiElements.onOffBtn;
    this.openPopBtn = uiElements.openPopBtn;
    this.playBtn = uiElements.playBtn;
  }

  // 모든 액션 실행 함수, aniList에 저장된 모든 애니메이션을 순차적으로 실행
  public executeAllActions(): void {
    if (this.aniList.length === 0) {
      console.warn("aniList에 실행할 애니메이션이 없습니다. 먼저 '도형 추가' 버튼으로 애니메이션을 추가하세요.");
      return;
    }

    if (this.isPlaying) {
      // 현재 실행 중인 애니메이션 단계에서 멈추기
      this.playBtn.classList.add("pe-none");
      this.stopAtCurrentStep();
      return;
    }

    // .open-pop-btn이 active 상태인지 확인
    if (this.openPopBtn.classList.contains("active")) {
      // 팝업 닫기 애니메이션 실행
      this.closePopupAnimation();
      return;
    } else {
      const optionPopbtn = this.root.querySelector(".open-pop-btn") as HTMLElement;
      optionPopbtn.classList.add("dim");
    }

    this.isPlaying = true;
    this.createClonedShapes();
    this.executeGsapTimeline();
  }

  // 현재 실행 중인 애니메이션 단계에서 멈추기
  private stopAtCurrentStep(): void {
    // 즉시 멈추기
    this.isPlaying = false;
    this.currentAnimationIndex = -1;
    this.shouldStopAfterCurrent = false;
    this.currentTimeline?.kill();
    console.warn("즉시 애니메이션 중단");
    this.openPopupAnimation();
    this.playBtn.classList.remove("active");
    this.playBtn.textContent = "움직이기";
    this.playBtn.classList.remove("pe-none");
    this.enableControls();
  }

  private createClonedShapes(): void {
    const shapeBox = this.root.querySelector(".shape-box") as HTMLElement;
    const originalShape = this.root.querySelector(".originalShape") as HTMLElement;

    if (!shapeBox || !originalShape) return;

    // 기존 복제 도형 정리
    this.cleanupExistingShapes();

    // 매 실행마다 누적 회전값 초기화
    this.accumulatedRotate = 0;

    // 새로운 복제 도형 생성
    this.createCurrentClonedShape(shapeBox, originalShape);
    this.createFirstClonedShape(shapeBox, originalShape);
  }
  // ============================== clone 설정 ==============================

  private cleanupExistingShapes(): void {
    // 기존 GSAP 정리
    if (this.currentTimeline) {
      this.currentTimeline.kill();
      this.currentTimeline = null;
    }

    // 현재 클론 트윈 제거 및 삭제
    if (this.currentClonedShape) {
      gsap.killTweensOf(this.currentClonedShape);
      this.currentClonedShape.remove();
      this.currentClonedShape = null;
    } else {
      const oldCopy = this.root.querySelector(".copyShape") as HTMLElement | null;
      if (oldCopy) {
        gsap.killTweensOf(oldCopy);
        oldCopy.remove();
      }
    }

    // 경계 체크용 클론 트윈 제거 및 노드 삭제
    if (this.firstClonedShape) {
      gsap.killTweensOf(this.firstClonedShape);
      this.firstClonedShape.remove();
      this.firstClonedShape = null;
    } else {
      const oldFirst = this.root.querySelector(".firstCopyShape") as HTMLElement | null;
      if (oldFirst) {
        gsap.killTweensOf(oldFirst);
        oldFirst.remove();
      }
    }
  }

  // 현재 애니메이션용 복제 도형 생성
  private createCurrentClonedShape(shapeBox: HTMLElement, originalShape: HTMLElement): void {
    this.revertBackgroundImageUrl(originalShape);
    this.currentClonedShape = originalShape.cloneNode(true) as HTMLElement;
    this.currentClonedShape.classList.remove("originalShape");
    this.currentClonedShape.classList.add("copyShape");

    // custom 모드인 경우 svg 태그 처리
    if (originalShape.classList.contains("custom") && originalShape.tagName.toLowerCase() === "svg") {
      // unknown 타입 우회 해서 다시 svg 로 에러가 계속뜸
      this.setSvgStyles(this.currentClonedShape as unknown as SVGElement, originalShape as unknown as SVGElement);
      (this.currentClonedShape as unknown as SVGElement).style.zIndex = "10";
      (this.currentClonedShape as unknown as SVGElement).style.opacity = "1";
    } else {
      this.setShapeStyles(this.currentClonedShape, originalShape);
      this.currentClonedShape.style.zIndex = "10";
      this.currentClonedShape.style.opacity = "1";
    }

    shapeBox.appendChild(this.currentClonedShape);
    this.syncGsapTransform(this.currentClonedShape, originalShape);
  }

  //경계 검사용 복제 도형 생성
  private createFirstClonedShape(shapeBox: HTMLElement, originalShape: HTMLElement): void {
    this.firstClonedShape = originalShape.cloneNode(true) as HTMLElement;
    this.firstClonedShape.classList.remove("originalShape");
    this.firstClonedShape.classList.add("firstCopyShape", "pe-none");

    // custom 모드인 경우 svg 태그 처리
    if (originalShape.classList.contains("custom") && originalShape.tagName.toLowerCase() === "svg") {
      this.setSvgStyles(this.firstClonedShape as unknown as SVGElement, originalShape as unknown as SVGElement);
      (this.firstClonedShape as unknown as SVGElement).style.opacity = "0";
    } else {
      this.setShapeStyles(this.firstClonedShape, originalShape);
      this.firstClonedShape.style.opacity = "0";
    }

    shapeBox.appendChild(this.firstClonedShape);
    this.syncGsapTransform(this.firstClonedShape, originalShape);
  }

  //GSAP 변환 값 동기화
  private syncGsapTransform(clonedShape: HTMLElement, originalShape: HTMLElement): void {
    gsap.set(clonedShape, {
      x: gsap.getProperty(originalShape, "x"),
      y: gsap.getProperty(originalShape, "y"),
      scale: gsap.getProperty(originalShape, "scale"),
      rotationY: gsap.getProperty(originalShape, "rotationY"),
      rotationX: gsap.getProperty(originalShape, "rotationX"),
      rotate: gsap.getProperty(originalShape, "rotate"),
      force3D: true,
    });
  }
  // ============================== clone 설정 ==============================

  // ============================== clone div, svg ==============================

  //일반 도형 스타일 설정
  private setShapeStyles(clonedShape: HTMLElement, originalShape: HTMLElement): void {
    clonedShape.style.position = "absolute";
    clonedShape.style.width = originalShape.style.width;
    clonedShape.style.height = originalShape.style.height;
    clonedShape.style.transformOrigin = originalShape.style.transformOrigin;
    clonedShape.style.left = originalShape.style.left;
    clonedShape.style.top = originalShape.style.top;
    clonedShape.style.transform = originalShape.style.transform;
    clonedShape.style.backgroundImage = originalShape.style.backgroundImage;

    // 하드웨어 가속
    clonedShape.style.willChange = "transform, opacity";
  }

  // SVG 도형 스타일 설정
  private setSvgStyles(clonedSvg: SVGElement, originalSvg: SVGElement): void {
    clonedSvg.style.position = "absolute";
    clonedSvg.style.width = originalSvg.style.width;
    clonedSvg.style.height = originalSvg.style.height;
    clonedSvg.style.transformOrigin = originalSvg.style.transformOrigin;
    clonedSvg.style.left = originalSvg.style.left;
    clonedSvg.style.top = originalSvg.style.top;
    clonedSvg.style.transform = originalSvg.style.transform;

    // SVG의 경우 backgroundImage 대신 다른 속성들을 복사
    if (originalSvg.getAttribute("viewBox")) clonedSvg.setAttribute("viewBox", originalSvg.getAttribute("viewBox")!);
    if (originalSvg.getAttribute("width")) clonedSvg.setAttribute("width", originalSvg.getAttribute("width")!);
    if (originalSvg.getAttribute("height")) clonedSvg.setAttribute("height", originalSvg.getAttribute("height")!);

    // 하드웨어 가속
    clonedSvg.style.willChange = "transform, opacity";
  }
  // ============================== clone div, svg ==============================

  // ============================== 타임라인 설정 ==============================

  // 애니메이션 타임라인 실행
  private executeGsapTimeline(): void {
    this.scrollToAction();

    const GsapTimeline = this.createGsapTimeline();
    this.currentTimeline = GsapTimeline;

    this.aniList.forEach((GsapConfig, index) => {
      if (!GsapConfig.playState) return;

      const props = this.createGsapProps(GsapConfig, index);
      this.addGsapToTimeline(GsapTimeline, props, index);
    });
  }

  // 애니메이션 속성 생성
  private createGsapProps(GsapConfig: GsapConfig, index: number): any {
    const props: any = {
      duration: 1,
      delay: 0.3,
      ease: "power2.out",
      force3D: true,
    };

    // custom 모드 감지 및 보정값 계산
    const originalShape = this.root.querySelector(".originalShape") as HTMLElement;
    const isCustomMode = originalShape && originalShape.classList.contains("custom") && originalShape.tagName.toLowerCase() === "svg";

    // custom 모드일 때 viewBox와 position 보정값 안써도됨
    let customModeOffsetX = 0;
    let customModeOffsetY = 0;

    if (isCustomMode) {
      customModeOffsetX = 0;
      customModeOffsetY = 0;
    }

    switch (GsapConfig.type) {
      case "push":
        props.x = `+=${(GsapConfig.moveX || 0) + customModeOffsetX}`;
        props.y = `+=${(GsapConfig.moveY || 0) + customModeOffsetY}`;
        break;
      case "flip":
        // 현재 시점까지의 누적된 rotate 값을 계산
        let currentAccumulatedRotate = this.accumulatedRotate;

        // 현재 애니메이션 이전까지의 swing 애니메이션들의 rotate 값을 누적
        for (let i = 0; i < index; i++) {
          const prevConfig = this.aniList[i];
          if (prevConfig && prevConfig.type === "swing" && prevConfig.playState) {
            currentAccumulatedRotate += prevConfig.swingValue || 0;
          }
        }

        const normalizedRotate = ((currentAccumulatedRotate % 360) + 360) % 360;

        const shouldSwapAxes =
          Math.abs(normalizedRotate - 90) < 1 ||
          Math.abs(normalizedRotate - 270) < 1 ||
          Math.abs(normalizedRotate + 90) < 1 ||
          Math.abs(normalizedRotate + 270) < 1;

        // 실행 시점에 현재 도형의 크기를 기준으로 이동 거리 계산 (flipDirection 우선)
        let runtimeMoveX = GsapConfig.flipMoveX ?? 0;
        let runtimeMoveY = GsapConfig.flipMoveY ?? 0;

        // flipDirection 이 없으면 회전 값으로 유추
        let direction: "up" | "down" | "left" | "right" | undefined = GsapConfig.flipDirection;
        if (!direction) {
          if ((GsapConfig.flipRotateX_relative || 0) !== 0) {
            direction = (GsapConfig.flipRotateX_relative as number) > 0 ? "up" : "down";
          } else if ((GsapConfig.flipRotateY_relative || 0) !== 0) {
            direction = (GsapConfig.flipRotateY_relative as number) > 0 ? "right" : "left";
          }
        }

        if (direction) {
          const shapeEl = (this.currentClonedShape || this.firstClonedShape) as HTMLElement | null;
          const widthPx = shapeEl ? parseFloat(shapeEl.style.width) || shapeEl.offsetWidth || 0 : 0;
          const heightPx = shapeEl ? parseFloat(shapeEl.style.height) || shapeEl.offsetHeight || 0 : 0;

          switch (direction) {
            case "up":
              runtimeMoveX = 0;
              runtimeMoveY = -heightPx;
              break;
            case "down":
              runtimeMoveX = 0;
              runtimeMoveY = heightPx;
              break;
            case "left":
              runtimeMoveX = -widthPx;
              runtimeMoveY = 0;
              break;
            case "right":
              runtimeMoveX = widthPx;
              runtimeMoveY = 0;
              break;
          }
        }

        if (shouldSwapAxes) {
          props.rotationY = `+=${GsapConfig.flipRotateX_relative}`;
          props.rotationX = `+=${GsapConfig.flipRotateY_relative}`;
          props.x = `+=${runtimeMoveX + customModeOffsetX}`;
          props.y = `+=${runtimeMoveY + customModeOffsetY}`;
        } else {
          props.rotationX = `+=${GsapConfig.flipRotateX_relative}`;
          props.rotationY = `+=${GsapConfig.flipRotateY_relative}`;
          props.x = `+=${runtimeMoveX + customModeOffsetX}`;
          props.y = `+=${runtimeMoveY + customModeOffsetY}`;
        }

        break;
      case "swing":
        props.rotate = `+=${GsapConfig.swingValue}`;
        break;
    }

    return props;
  }

  // 타임라인에 애니메이션 추가
  private addGsapToTimeline(timeline: gsap.core.Timeline, props: any, index: number): void {
    const actionList = this.root.querySelector(".action-list");

    // 경계 체크를 위한 즉시 실행 애니메이션
    timeline.to(this.firstClonedShape, {
      ...props,
      duration: 0,
      force3D: true,
      onComplete: () => {
        if (this.checkBoundsCheck()) {
          this.showWarnPop();
          timeline.kill();
        }
      },
    });

    // 실제 애니메이션 - 경계 체크 직후에 실행
    props.onStart = () => {
      this.currentAnimationIndex = index; // 현재 실행 중인 애니메이션 인덱스 설정
      const itemBox = actionList?.querySelector(`.action[data-idx="${index}"]`);
      if (itemBox) {
        this.scrollToAction(itemBox as HTMLElement);
        itemBox.classList.add("act-select");
      }
    };

    props.onComplete = () => {
      // swing 애니메이션인 경우 누적 rotate 값 업데이트
      const currentAnimConfig = this.aniList[index];
      if (currentAnimConfig && currentAnimConfig.type === "swing" && currentAnimConfig.playState) {
        this.accumulatedRotate += currentAnimConfig.swingValue || 0;
      }

      const itemBox = actionList?.querySelector(`.action[data-idx="${index}"]`);
      console.warn(`${index + 1} 번째 gsap 끝`);

      const check = this.checkBoundsCheck();

      if (!check) {
        if (itemBox) itemBox.classList.remove("act-select");
      }
    };

    timeline.to(this.currentClonedShape, props);
  }

  // 애니메이션 타임라인 생성
  private createGsapTimeline(): gsap.core.Timeline {
    return gsap.timeline({
      onStart: () => {
        this.originalShape = this.root.querySelector(".originalShape") as HTMLElement;
        this.originalShape.classList.add("ani-play");

        // originalShape가 ani-play 클래스를 가질 때 background-image URL 교체
        if (this.originalShape) {
          this.convertBackgroundImageUrl(this.originalShape);
        }
      },
      onComplete: () => {
        this.resetGsapState();
        this.originalShape = this.root.querySelector(".originalShape") as HTMLElement;
        this.originalShape.classList.remove("ani-play");
      },
    });
  }

  // intro_board URL을 game_board URL로 변환하는 메서드
  private convertBackgroundImageUrl(element: HTMLElement): void {
    const currentBgImage = element.style.backgroundImage;

    if (currentBgImage) {
      const urlMatch = currentBgImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        let url = urlMatch[1];

        // shape_icon 변환
        if (url.includes("intro_board/shape_icon/")) {
          const newUrl = url.replace("intro_board/shape_icon/", "game_board/shape_origin/shape_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
        // k_icon 변환
        else if (url.includes("intro_board/k_icon/")) {
          const newUrl = url.replace("intro_board/k_icon/", "game_board/shape_origin/k_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
        // num_icon 변환
        else if (url.includes("intro_board/num_icon/")) {
          const newUrl = url.replace("intro_board/num_icon/", "game_board/shape_origin/num_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
      }
    }

    if (element.tagName.toLowerCase() === "svg") {
      this.convertSVGColor(element);
    }
  }

  // game_board URL을 intro_board URL로 되돌리는 메서드
  public revertBackgroundImageUrl(element: HTMLElement): void {
    const currentBgImage = element.style.backgroundImage;

    if (currentBgImage) {
      const urlMatch = currentBgImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        let url = urlMatch[1];

        // shape_icon 되돌리기
        if (url.includes("game_board/shape_origin/shape_icon/")) {
          const newUrl = url.replace("game_board/shape_origin/shape_icon/", "intro_board/shape_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
        // k_icon 되돌리기
        else if (url.includes("game_board/shape_origin/k_icon/")) {
          const newUrl = url.replace("game_board/shape_origin/k_icon/", "intro_board/k_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
        // num_icon 되돌리기
        else if (url.includes("game_board/shape_origin/num_icon/")) {
          const newUrl = url.replace("game_board/shape_origin/num_icon/", "intro_board/num_icon/");
          element.style.backgroundImage = `url("${newUrl}")`;
        }
      }
    }

    // SVG 색상도 되돌리기
    if (element.tagName.toLowerCase() === "svg") {
      this.revertSVGColor(element);
    }
  }

  public convertSVGColor(svg: HTMLElement): void {
    if (svg.tagName.toLowerCase() !== "svg") return;

    // rect, polygon 요소들의 fill 색상 변경
    const fillElements = [...Array.from(svg.querySelectorAll("rect")), ...Array.from(svg.querySelectorAll("polygon"))];
    fillElements.forEach((element) => {
      const fill = element.getAttribute("fill") || element.style.fill;
      if (fill && fill !== "none" && fill !== "transparent") {
        // 원래 색상 저장
        element.setAttribute("data-original-fill", fill);
        // 새 색상 적용
        if (element.hasAttribute("fill")) {
          element.setAttribute("fill", "#899397");
        } else {
          element.style.fill = "#899397";
        }
      }
    });

    // line 요소들의 stroke 색상 변경
    const lineElements = svg.querySelectorAll("line");
    lineElements.forEach((line) => {
      const stroke = line.getAttribute("stroke") || line.style.stroke;
      if (stroke && stroke !== "none" && stroke !== "transparent") {
        // 원래 색상 저장
        line.setAttribute("data-original-stroke", stroke);
        // 새 색상 적용
        if (line.hasAttribute("stroke")) {
          line.setAttribute("stroke", "#52585a");
        } else {
          line.style.stroke = "#52585a";
        }
      }
    });
  }

  public revertSVGColor(svg: HTMLElement): void {
    if (svg.tagName.toLowerCase() !== "svg") return;

    // rect, polygon 요소들의 fill 색상 복원
    const fillElements = [...Array.from(svg.querySelectorAll("rect")), ...Array.from(svg.querySelectorAll("polygon"))];
    fillElements.forEach((element) => {
      const originalFill = element.getAttribute("data-original-fill");
      if (originalFill) {
        if (element.hasAttribute("fill")) {
          element.setAttribute("fill", originalFill);
        } else {
          element.style.fill = originalFill;
        }
        element.removeAttribute("data-original-fill");
      }
    });

    // line 요소들의 stroke 색상 복원
    const lineElements = svg.querySelectorAll("line");
    lineElements.forEach((line) => {
      const originalStroke = line.getAttribute("data-original-stroke");
      if (originalStroke) {
        if (line.hasAttribute("stroke")) {
          line.setAttribute("stroke", originalStroke);
        } else {
          line.style.stroke = originalStroke;
        }
        line.removeAttribute("data-original-stroke");
      }
    });
  }

  // 애니메이션 상태 리셋
  private resetGsapState(): void {
    this.isPlaying = false;
    this.currentTimeline = null;
    this.currentAnimationIndex = -1; // 현재 애니메이션 인덱스 초기화
    this.shouldStopAfterCurrent = false; // 멈춤 플래그 초기화
    // 실행 종료 시 누적 회전값도 초기화
    this.accumulatedRotate = 0;
    setTimeout(() => {
      console.warn("다 끝");
      this.playBtn.classList.remove("active");
      this.playBtn.textContent = "움직이기";
      this.openPopupAnimation();
    }, 600);
  }
  // ============================== 타임라인 설정 ==============================

  // ============================== 컨크롤 버튼 설정 ==============================

  //컨트롤 비활성화
  public disableControls(): void {
    // this.resetBtn.classList.add("pe-none");
    this.openPopBtn.classList.add("pe-none");
    this.onOffBtn.classList.add("pe-none");
    const scrolls = this.root.querySelector(".option-pop-right .scroll-cont") as HTMLElement;
    scrolls.classList.add("pe-none");
    const optionPopLeft = this.root.querySelector(".option-pop-left");
    if (optionPopLeft) optionPopLeft.classList.add("pe-none");
  }

  //컨트롤 활성화
  public enableControls(): void {
    // this.resetBtn.classList.remove("pe-none");
    this.onOffBtn.classList.remove("pe-none");
    this.openPopBtn.classList.remove("pe-none");
    const scrolls = this.root.querySelector(".option-pop-right .scroll-cont") as HTMLElement;
    scrolls.classList.remove("pe-none");
    const optionPopLeft = this.root.querySelector(".option-pop-left");
    if (optionPopLeft) optionPopLeft.classList.remove("pe-none");
  }
  // ============================== 컨크롤 버튼 설정 ==============================

  // ============================== 모눈판 경계 체크 ==============================

  //도형 경계 검사 함수
  private checkBoundsCheck(): boolean | undefined {
    const shapeContainer = this.root.querySelector(".shape-container") as HTMLElement;
    if (!shapeContainer) return false;

    const containerRect = shapeContainer.getBoundingClientRect();
    let shapeRect: DOMRect;

    // custom 모드인 경우 (svg 태그) svg 자식 안의 g 태그를 기준으로 체크
    if ((this.firstClonedShape as HTMLElement).classList.contains("custom") && (this.firstClonedShape as HTMLElement).tagName.toLowerCase() === "svg") {
      const gTag = (this.firstClonedShape as HTMLElement).querySelector("g") as Element;
      gTag ? (shapeRect = gTag.getBoundingClientRect()) : (shapeRect = (this.firstClonedShape as HTMLElement).getBoundingClientRect());
    } else {
      // 일반 모드는 기존처럼 전체 도형으로 체크
      shapeRect = (this.firstClonedShape as HTMLElement).getBoundingClientRect();
    }

    // 도형의 각 모서리가 컨테이너 경계를 벗어나는지 정확히 체크
    const isOutsideLeft = shapeRect.left < containerRect.left;
    const isOutsideRight = shapeRect.right > containerRect.right;
    const isOutsideTop = shapeRect.top < containerRect.top;
    const isOutsideBottom = shapeRect.bottom > containerRect.bottom;

    const isOutside = isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom;

    // console.log(`현재 실행된 애니메이션 인덱스: ${this.currentAnimationIndex + 1}번째`);

    if (isOutside) {
      const actionList = this.root.querySelector(".action-list");

      // 현재 애니메이션 인덱스 다음부터 시작해서 dim이 아닌 첫 번째 액션을 찾기
      let targetIndex = this.currentAnimationIndex + 1;
      let itemBox: HTMLElement | null = null;

      // dim이 아닌 다음 액션을 찾을 때까지 반복
      while (targetIndex < this.aniList.length) {
        const nextItemBox = actionList?.querySelector(`.action[data-idx="${targetIndex}"]`) as HTMLElement;

        if (nextItemBox && !nextItemBox.classList.contains("dim")) {
          itemBox = nextItemBox;
          break;
        }

        targetIndex++;
      }

      // dim이 아닌 액션을 찾았으면 act-select 클래스 추가
      if (itemBox) {
        itemBox.classList.add("act-select");
      }
    }
    return isOutside;
  }

  //컨테이너 내에서의 오프셋 계산
  private getOffsetInContainer(element: HTMLElement, container: HTMLElement, center?: boolean) {
    let offset = { x: 0, y: 0 };
    if (center) {
      offset.x += element.offsetWidth / 2;
      offset.y += element.offsetHeight / 2;
    }
    let el: HTMLElement | null = element;
    while (el && el !== container) {
      offset.x += el.offsetLeft;
      offset.y += el.offsetTop;
      el = el.offsetParent as HTMLElement;
    }
    return offset;
  }

  //경고 팝업 표시
  private showWarnPop(): void {
    this.isPlaying = false;
    this.currentTimeline = null;

    const warnPopup = this.root.querySelector(".warn-pop") as HTMLElement;
    warnPopup.classList.remove("d-none");

    setTimeout(() => {
      const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
      const parentAction = this.root.querySelector(".act-select") as HTMLElement;
      if (!elem || !("scrollObj" in elem)) return;

      const scrollObj = (elem as any).scrollObj as any;
      const viewport = scrollObj.elements().viewport;

      // 해당 액션의 위치 계산
      const actionTop = parentAction.offsetTop;
      const containerHeight = viewport.clientHeight;
      const scrollTop = Math.max(0, actionTop - containerHeight / 2);

      viewport.scrollTo({ top: scrollTop, behavior: "smooth" });
    }, 0);
  }

  // ============================== 모눈판 경계 체크 ==============================

  //액션 스크롤
  private scrollToAction(actElem?: HTMLElement): void {
    const elem = this.root.querySelector(".js-scroll-cont") as HTMLElement;
    if (!elem || !("scrollObj" in elem)) return;
    const scrollObj = (elem as any).scrollObj as any;
    const viewport = scrollObj.elements().viewport;

    if (actElem) {
      const offset = this.getOffsetInContainer(actElem, elem);
      const targetY = offset.y;
      let scrollToY = targetY + actElem.offsetHeight - viewport.offsetHeight;
      const maxScrollTop = scrollObj.state().overflowAmount.y;
      scrollToY = Math.min(scrollToY, maxScrollTop);
      scrollToY = Math.max(0, scrollToY);
      const currentScrollTop = viewport.scrollTop;
      const elemBottomRelative = offset.y + actElem.offsetHeight - currentScrollTop;
      const elemTopRelative = offset.y - currentScrollTop;
      if (elemBottomRelative > viewport.offsetHeight || elemTopRelative < 0) {
        viewport.scrollTo({ top: scrollToY + 195, behavior: "smooth" });
      }
    } else {
      viewport.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /**
   * 누적 회전값 업데이트
   * rotate 랑 rotation 같이 쓰는거 이상해서
   */
  public updateAccumulatedRotate(value: number): void {
    this.accumulatedRotate = value;
  }

  //현재 애니메이션 상태 반환
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // 애니메이션 상태 설정
  public setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  //현재 타임라인 반환
  public getCurrentTimeline(): gsap.core.Timeline | null {
    return this.currentTimeline;
  }

  // 애니 실행 정료 팝업 닫고 열기 애니메이션
  public closePopupAnimation(): void {
    const shapeContainer = this.root.querySelector(".shape-container") as HTMLElement;
    const optionPopLeft = this.root.querySelector(".option-pop-left") as HTMLElement;
    const optionPopbtn = this.root.querySelector(".open-pop-btn") as HTMLElement;

    this.resetBtn.classList.add("pe-none");
    this.playBtn.classList.add("pe-none");

    // 팝업 닫기 애니메이션을 하나의 타임라인으로 배치 처리
    const tl = gsap.timeline();

    tl.to(optionPopbtn, {
      left: 976,
      duration: 0.6,
      ease: "power2.out",
      force3D: true,
      onStart: () => {
        optionPopbtn.classList.remove("active");
        optionPopbtn.classList.add("dim");
      },
    });

    tl.to(
      optionPopLeft,
      {
        left: 1000,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
        onComplete: () => {
          optionPopLeft.classList.remove("on");
          this.openPopBtn.classList.remove("active");

          // 팝업 닫기 완료 후 애니메이션 실행
          this.isPlaying = true;
          this.createClonedShapes();
          this.executeGsapTimeline();
          this.resetBtn.classList.remove("pe-none");
          this.playBtn.classList.remove("pe-none");
        },
      },
      "<"
    ); // 동시 실행

    tl.to(
      shapeContainer,
      {
        left: 339,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
      },
      "<"
    ); // 동시 실행

    tl.to(
      optionPopLeft.querySelectorAll(".title-box"),
      {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        force3D: true,
      },
      "<+=0.05"
    ); // 약간의 지연 후 실행

    this.disableControls();
  }

  public openPopupAnimation(): void {
    const shapeContainer = this.root.querySelector(".shape-container") as HTMLElement;
    const optionPopLeft = this.root.querySelector(".option-pop-left") as HTMLElement;
    const optionPopbtn = this.root.querySelector(".open-pop-btn") as HTMLElement;

    // 팝업 열기 애니메이션을 하나의 타임라인으로 배치 처리
    const tl = gsap.timeline();

    tl.to(optionPopbtn, {
      onStart: () => {
        optionPopbtn.classList.add("active");
        optionPopbtn.classList.remove("dim");
      },
      left: 660,
      duration: 0.6,
      ease: "power2.out",
      force3D: true,
    });
    tl.to(
      optionPopLeft,
      {
        left: 685,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
        onStart: () => {
          optionPopLeft.classList.add("on");
        },
      },
      "<"
    );

    tl.to(
      shapeContainer,
      {
        left: 39,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
      },
      "<"
    ); // 동시 실행

    tl.to(
      optionPopLeft.querySelectorAll(".title-box"),
      {
        opacity: 1,
        delay: 0.05,
        duration: 0.3,
        ease: "power2.out",
        force3D: true,
      },
      "<+=0.05"
    ); // 약간의 지연 후 실행

    this.playBtn.classList.remove("pe-none");
    this.resetBtn.classList.remove("pe-none");
    this.enableControls();
  }

  // 애니 실행 x 단독 팝업 닫고 열기
  public closePopup(target: HTMLElement): void {
    const optionPopLeft = this.root.querySelector(".option-pop-left") as HTMLElement;
    const shapeContainer = this.root.querySelector(".shape-container") as HTMLElement;

    const tl = gsap.timeline();

    tl.to(target, {
      left: 976,
      duration: 0.6,
      ease: "power2.out",
      force3D: true,
    });

    tl.to(
      optionPopLeft,
      {
        left: 1000,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
        onComplete: () => {
          optionPopLeft.classList.remove("on");
        },
      },
      "<"
    );

    tl.to(
      shapeContainer,
      {
        left: 339,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
      },
      "<"
    );

    tl.to(
      optionPopLeft.querySelectorAll(".title-box"),
      {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        force3D: true,
      },
      "<+=0.05"
    );

    target.classList.remove("active");
  }

  public openPopup(target: HTMLElement): void {
    const optionPopLeft = this.root.querySelector(".option-pop-left") as HTMLElement;
    const shapeContainer = this.root.querySelector(".shape-container") as HTMLElement;

    const tl = gsap.timeline();

    tl.to(target, {
      left: 660,
      duration: 0.6,
      ease: "power2.out",
      force3D: true,
    });

    tl.to(
      optionPopLeft,
      {
        left: 685,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
        onStart: () => {
          optionPopLeft.classList.add("on");
        },
      },
      "<"
    );

    tl.to(
      shapeContainer,
      {
        left: 39,
        duration: 0.6,
        ease: "power2.out",
        force3D: true,
      },
      "<"
    );

    tl.to(
      optionPopLeft.querySelectorAll(".title-box"),
      {
        opacity: 1,
        delay: 0.05,
        duration: 0.3,
        ease: "power2.out",
        force3D: true,
      },
      "<+=0.05"
    );

    target.classList.add("active");
  }
}

