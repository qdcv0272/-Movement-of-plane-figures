// #region Imports
import { log } from "@module/utilities/util";
// #endregion

// #region Types
// HandleShape 클래스 설정 인터페이스
interface HandleShapeConfig {
  containerSelector: string; // 도형이 포함된 컨테이너의 셀렉터
  controlBoxScale?: number; // 도형 주위의 컨트롤 박스 크기 배율
}

// 조작 상태 인터페이스
interface InteractionState {
  element: SVGElement;
  startX: number;
  startY: number;
  initialTransform: {
    scale: number;
    rotation: number;
  };
  initialMetrics: {
    cx: number;
    cy: number;
  };
  previousAngle: number; // 이전 각도 추적
}
// #endregion

export default class HandleShape {
  // #region 필드
  private container: HTMLElement;
  private config: Required<HandleShapeConfig>;

  // 현재 선택된 요소 및 상태
  public selectedShape: SVGElement | null = null;
  private controller: HTMLElement | null = null;
  private controlBox: HTMLElement | null = null;

  // 조작 관련 상태
  private isInteracting: "scale" | "rotate" | false = false;
  private interactionState: InteractionState | null = null;
  private isUpdateScheduled = false;
  private latestTransform = { scale: 1, rotation: 0 };

  // 이벤트 핸들러 바인딩
  private boundHandleClick: (event: MouseEvent) => void;
  private boundHandleMouseDown: (event: MouseEvent) => void;
  private boundHandleMouseMove: (event: MouseEvent) => void;
  private boundHandleMouseUp: (event: MouseEvent) => void;
  private boundHandleMouseLeaveControlBox: () => void;
  // #endregion

  // #region 생성자
  constructor(config: HandleShapeConfig) {
    this.config = {
      containerSelector: config.containerSelector,
      controlBoxScale: 1.5,
    };

    const containerEl = document.querySelector<HTMLElement>(this.config.containerSelector);
    if (!containerEl) {
      throw new Error(`Container with selector "${this.config.containerSelector}" not found.`);
    }
    this.container = containerEl;

    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleMouseLeaveControlBox = this.deselectShape.bind(this);
  }
  // #endregion

  // #region Life Cycle
  public init(): void {
    this.container.addEventListener("click", this.boundHandleClick);
    log("HandleShape initialized.");
  }
  // #endregion

  // #region 외부 클릭 처리
  // 도형 외부 클릭 시 선택 해제
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isShape = target.closest("svg");

    if (!isShape && !target.closest(".shape-controller")) {
      this.deselectShape();
    }
  }
  // #endregion

  // #region 선택/해제
  // 도형 선택
  public selectShape(shape: SVGElement): void {
    if (this.selectedShape === shape) return;

    this.deselectShape(); // 이전 선택 해제

    this.selectedShape = shape;
    this.selectedShape.classList.add("selected");

    this.createController(shape);
  }

  // 도형 선택 해제
  public deselectShape(): void {
    if (!this.selectedShape) return;

    this.selectedShape.classList.remove("selected");
    this.selectedShape = null;
    this.removeController();
  }
  // #endregion

  // #region 컨트롤러 생성
  private createController(shape: SVGElement): void {
    if (this.controller) this.removeController();

    // 컨트롤 박스 생성 (도형 주변의 투명한 영역)
    this.controlBox = document.createElement("div");
    this.controlBox.className = "control-box";
    this.controlBox.addEventListener("mouseleave", this.boundHandleMouseLeaveControlBox);

    // 컨트롤러(버튼 그룹) 생성
    this.controller = document.createElement("div");
    this.controller.className = "shape-controller";

    // 버튼 생성
    const deleteBtn = this.createButton("delete", "삭제");
    const scaleBtn = this.createButton("scale", "크기 조절");
    const rotateBtn = this.createButton("rotate", "회전");

    this.controller.append(deleteBtn, scaleBtn, rotateBtn);
    // this.controlBox.appendChild(this.controller);
    this.container.appendChild(this.controller);
    this.container.appendChild(this.controlBox);

    this.updateControllerPosition(shape);

    // 이벤트 리스너 등록
    deleteBtn.addEventListener("click", () => this.handleDelete());
    scaleBtn.addEventListener("mousedown", this.boundHandleMouseDown);
    rotateBtn.addEventListener("mousedown", this.boundHandleMouseDown);
  }

  // 컨트롤러 UI 제거
  private removeController(): void {
    if (this.controlBox) {
      // this.controlBox.remove();
      this.controlBox = null;
    }
    if (this.controller) {
      this.controller = null;
    }
  }
  // #endregion

  // #region 컨트롤러 위치 갱신
  // 컨트롤러 위치 업데이트
  private updateControllerPosition(shape: SVGElement): void {
    if (!this.controller || !this.controlBox) return;

    const shapeRect = shape.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const shapeWidth = shapeRect.width;
    const shapeHeight = shapeRect.height;

    const boxSize = Math.max(shapeWidth, shapeHeight) * this.config.controlBoxScale;
    const translateX = shapeRect.left - containerRect.left + shapeWidth / 2 - boxSize / 2;
    const translateY = shapeRect.top - containerRect.top + shapeHeight / 2 - boxSize / 2;

    this.controlBox.style.width = `${boxSize}px`;
    this.controlBox.style.height = `${boxSize}px`;
    this.controlBox.style.transform = `translate(${translateX}px, ${translateY}px)`;
  }
  // #endregion

  // #region 버튼 생성
  private createButton(type: "delete" | "scale" | "rotate", ariaLabel: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = `ctrl-btn btn-${type}`;
    button.setAttribute("aria-label", ariaLabel);
    button.dataset.type = type;
    return button;
  }
  // #endregion

  // #region 핸들러
  // 도형 삭제 핸들러
  private handleDelete(): void {
    if (!this.selectedShape) return;
    this.selectedShape.remove();
    this.deselectShape();
  }

  // 컨트롤러 mousedown 핸들러 (크기/회전 시작)
  private handleMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.currentTarget as HTMLButtonElement;
    const type = target.dataset.type as "scale" | "rotate";

    if (!this.selectedShape || !type) return;

    this.isInteracting = type;

    const { scale, rotation } = this.getCurrentTransform(this.selectedShape);
    const rect = this.selectedShape.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseStartAngle = Math.atan2(event.clientY - cy, event.clientX - cx) * (180 / Math.PI);

    this.latestTransform = { scale, rotation }; // 최신 transform 값 초기화

    this.interactionState = {
      element: this.selectedShape,
      startX: event.clientX,
      startY: event.clientY,
      initialTransform: {
        scale,
        rotation,
      },
      initialMetrics: { cx, cy },
      previousAngle: mouseStartAngle, // 시작 각도를 이전 각도로 설정
    };

    document.addEventListener("mousemove", this.boundHandleMouseMove);
    document.addEventListener("mouseup", this.boundHandleMouseUp);
  }
  // #endregion

  // #region 상호작용
  // mousemove 핸들러 (크기/회전 중)
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isInteracting || !this.interactionState) return;

    const { element, initialTransform, initialMetrics } = this.interactionState;

    if (this.isInteracting === "scale") {
      const { startX, startY } = this.interactionState;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const direction = event.clientX > startX ? 1 : -1;
      this.latestTransform.scale = Math.max(0.1, initialTransform.scale + (distance * direction) / 200);
    }

    if (this.isInteracting === "rotate") {
      const currentAngle = Math.atan2(event.clientY - initialMetrics.cy, event.clientX - initialMetrics.cx) * (180 / Math.PI);
      let deltaAngle = currentAngle - this.interactionState.previousAngle;

      // 각도 래핑(wrapping) 현상 보정
      if (deltaAngle > 180) {
        deltaAngle -= 360;
      } else if (deltaAngle < -180) {
        deltaAngle += 360;
      }

      const newRotation = initialTransform.rotation + deltaAngle;
      this.interactionState.initialTransform.rotation = newRotation; // 현재 회전값 누적
      this.interactionState.previousAngle = currentAngle; // 이전 각도 업데이트
      this.latestTransform.rotation = newRotation;
    }
    this.scheduleUpdate();
  }

  private scheduleUpdate(): void {
    if (this.isUpdateScheduled) return;
    this.isUpdateScheduled = true;
    requestAnimationFrame(() => this.updateOnFrame());
  }

  private updateOnFrame(): void {
    this.isUpdateScheduled = false;
    if (!this.interactionState) return;

    const { element } = this.interactionState;
    this.applyTransform(element, this.latestTransform.scale, this.latestTransform.rotation);
    this.updateControllerPosition(element);
  }

  // mouseup 핸들러 (크기/회전 종료)
  private handleMouseUp(): void {
    this.isInteracting = false;
    this.interactionState = null;
    document.removeEventListener("mousemove", this.boundHandleMouseMove);
    document.removeEventListener("mouseup", this.boundHandleMouseUp);
  }
  // #endregion

  // #region 변환 유틸
  // 현재 transform 값 파싱
  private getCurrentTransform(element: SVGElement): { scale: number; rotation: number } {
    const transform = element.style.transform;
    const scaleMatch = transform.match(/scale\(([^)]+)\)/);
    const rotateMatch = transform.match(/rotate\(([^)]+)\)/);
    return {
      scale: scaleMatch ? parseFloat(scaleMatch[1]) : 1,
      rotation: rotateMatch ? parseFloat(rotateMatch[1]) : 0,
    };
  }

  // transform 스타일 적용
  private applyTransform(element: SVGElement, scale: number, rotation: number): void {
    element.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
  }
  // #endregion

  // #region 컨트롤러 숨기기
  public hideController(): void {
    this.deselectShape();
  }
  // #endregion
}
