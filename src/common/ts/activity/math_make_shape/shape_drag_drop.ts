// #region Imports
import SoundManager from "@module/audio/sound_manager";
import { log } from "@module/utilities/util";
import HandleShape from "./handle_shape";
// #endregion

// #region Types
export interface DragDropConfig {
  sourceSelector: string;
  targetSelector: string;
  onDragStart?: (element: SVGElement, shapeIndex: number) => void;
  onDropSuccess?: (element: SVGElement, shapeIndex: number, dropTarget: HTMLElement) => void;
  onDropFail?: (element: SVGElement, shapeIndex: number) => void;
  enableSounds?: boolean;
  handleShape: HandleShape;
}

interface DraggableShape {
  element: SVGElement;
  index: number;
  originalParent: HTMLElement;
  originalNextSibling: Node | null;
  clonedElement?: SVGElement; // 복제 요소
}

enum DragOrigin {
  SOURCE = "source",
  PLAYGROUND = "playground",
  UNKNOWN = "unknown",
}
// #endregion

export default class ShapeDragAndDrop {
  // #region 상수
  private static readonly SHAPE_LIST_SELECTOR = ".shape__list";
  private static readonly PLAYGROUND_SELECTOR = ".playground__box";
  // #endregion

  // #region 필드
  private config: DragDropConfig;
  private sourceContainer: HTMLElement | null = null;
  private targetContainer: HTMLElement | null = null;
  private draggableShapes: DraggableShape[] = [];

  private isDragging: boolean = false;
  private currentDragShape: DraggableShape | null = null;
  private currentDragOrigin: DragOrigin = DragOrigin.UNKNOWN;

  private centerDragOffset = { x: 0, y: 0 };
  private dragContext: { wrapRect: DOMRect; scale: number } | null = null;

  private boundHandleDragStart: (shape: DraggableShape, event: MouseEvent | TouchEvent) => void;
  private boundHandleDragMove: (event: MouseEvent | TouchEvent) => void;
  private boundHandleDragEnd: (event: MouseEvent | TouchEvent) => void;
  // #endregion

  // #region 생성자
  constructor(config: DragDropConfig) {
    this.config = {
      enableSounds: true,
      ...config,
    };

    this.boundHandleDragStart = this.handleDragStart.bind(this);
    this.boundHandleDragMove = this.handleDragMove.bind(this);
    this.boundHandleDragEnd = this.handleDragEnd.bind(this);
  }
  // #endregion

  // #region 유틸
  private getDragOrigin(element: SVGElement | null): DragOrigin {
    if (!element) return DragOrigin.UNKNOWN;
    let currentElement = element.parentElement;
    while (currentElement) {
      if (currentElement.matches(ShapeDragAndDrop.SHAPE_LIST_SELECTOR)) {
        return DragOrigin.SOURCE;
      }
      if (currentElement.matches(ShapeDragAndDrop.PLAYGROUND_SELECTOR)) {
        return DragOrigin.PLAYGROUND;
      }
      currentElement = currentElement.parentElement;
    }
    return DragOrigin.UNKNOWN;
  }
  // #endregion

  // #region Life Cycle
  public init(): void {
    this.findContainers();
    this.identifyDraggableShapes();
    this.addEventListeners();
    log("Drag and Drop init", this.draggableShapes.length, "shapes");
  }

  public destroy(): void {
    this.removeEventListeners();
    this.draggableShapes = [];
    this.currentDragShape = null;
    this.currentDragOrigin = DragOrigin.UNKNOWN;
    this.isDragging = false;
    log("Drag and Drop destroy");
  }

  public refresh(): void {
    this.removeEventListeners();
    this.identifyDraggableShapes();
    this.addEventListeners();
  }
  // #endregion

  // #region DOM 준비
  private findContainers(): void {
    this.sourceContainer = document.querySelector(this.config.sourceSelector);
    this.targetContainer = document.querySelector(this.config.targetSelector);
    if (!this.sourceContainer || !this.targetContainer) {
      throw new Error("Drag and drop containers not found.");
    }
  }

  private identifyDraggableShapes(): void {
    this.draggableShapes = [];
    if (this.sourceContainer) {
      const sourceSvgElements = this.sourceContainer.querySelectorAll("svg");
      const sourceShapes = Array.from(sourceSvgElements).map((svg, index) => ({
        element: svg as SVGElement,
        index,
        originalParent: svg.parentElement as HTMLElement,
        originalNextSibling: svg.nextSibling,
      }));
      this.draggableShapes.push(...sourceShapes);
    }
    if (this.targetContainer) {
      const playgroundSvgElements = this.targetContainer.querySelectorAll("svg");
      const playgroundShapes = Array.from(playgroundSvgElements).map((svg, index) => ({
        element: svg as SVGElement,
        index: index + 1000,
        originalParent: svg.parentElement as HTMLElement,
        originalNextSibling: svg.nextSibling,
      }));
      this.draggableShapes.push(...playgroundShapes);
    }
  }
  // #endregion

  // #region 이벤트 바인딩
  private addEventListeners(): void {
    this.draggableShapes.forEach((shape) => {
      shape.element.addEventListener("mousedown", (e) => this.boundHandleDragStart(shape, e));
      shape.element.addEventListener("touchstart", (e) => this.boundHandleDragStart(shape, e), { passive: false });
    });
  }

  private removeEventListeners(): void {
    // document/window에 이벤트 추가 시 구현이 필요할 수 있음
  }
  // #endregion

  // #region 이벤트 헬퍼
  private getEventCoords(event: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
    return "touches" in event ? event.touches[0] || event.changedTouches[0] : event;
  }

  private getShapeBaseDimensions(element: SVGElement): { width: number; height: number } {
    const width = parseFloat(element.getAttribute("width") || "0");
    const height = parseFloat(element.getAttribute("height") || "0");
    return { width, height };
  }
  // #endregion

  // #region 드래그 흐름
  private handleDragStart(shape: DraggableShape, event: MouseEvent | TouchEvent): void {
    if (this.isDragging) return;
    const target = event.target as SVGElement;
    const tag = target.tagName.toLowerCase();
    // 투명영역/컨테이너 클릭 방지: 채워진 도형 요소에만 반응 (use 포함)
    const allowed = ["path", "use", "polygon", "rect", "circle", "ellipse"]; // g, svg 비허용
    if (!allowed.includes(tag)) return;
    this.currentDragShape = shape;
    const moveEvent = "touches" in event ? "touchmove" : "mousemove";
    const endEvent = "touches" in event ? "touchend" : "mouseup";
    document.addEventListener(moveEvent, this.boundHandleDragMove, { passive: false });
    document.addEventListener(endEvent, this.boundHandleDragEnd);
  }

  private handleDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.currentDragShape) return;
    if (!this.isDragging) {
      this.isDragging = true;
      this.initializeDrag(event);
    }
    if (!this.isDragging || !this.dragContext) return;
    event.preventDefault();
    const { clientX, clientY } = this.getEventCoords(event);
    const dragElement = this.currentDragShape.clonedElement || this.currentDragShape.element;
    const { wrapRect, scale } = this.dragContext;
    const newShapeCenterX = (clientX - wrapRect.left) / scale - this.centerDragOffset.x;
    const newShapeCenterY = (clientY - wrapRect.top) / scale - this.centerDragOffset.y;
    const { width: baseWidth, height: baseHeight } = this.getShapeBaseDimensions(dragElement);
    const newLeft = newShapeCenterX - baseWidth / 2;
    const newTop = newShapeCenterY - baseHeight / 2;
    dragElement.style.left = `${newLeft}px`;
    dragElement.style.top = `${newTop}px`;
  }

  private initializeDrag(event: MouseEvent | TouchEvent): void {
    if (!this.currentDragShape) return;
    this.config.handleShape.deselectShape();
    const shape = this.currentDragShape;
    const { clientX, clientY } = this.getEventCoords(event);
    const rect = shape.element.getBoundingClientRect();
    const wrapElement = document.querySelector<HTMLElement>("#wrap") || document.body;
    const wrapRect = wrapElement.getBoundingClientRect();
    const scale = window.bound.scale || 1;
    const shapeCenterX = (rect.left - wrapRect.left + rect.width / 2) / scale;
    const shapeCenterY = (rect.top - wrapRect.top + rect.height / 2) / scale;
    const mouseX = (clientX - wrapRect.left) / scale;
    const mouseY = (clientY - wrapRect.top) / scale;
    this.centerDragOffset = { x: mouseX - shapeCenterX, y: mouseY - shapeCenterY };
    this.dragContext = { wrapRect, scale };
    const origin = this.getDragOrigin(shape.element);
    this.currentDragOrigin = origin;
    let dragElement: SVGElement;
    const existingTransform = shape.element.style.transform;
    if (origin === DragOrigin.SOURCE) {
      const clonedElement = shape.element.cloneNode(true) as SVGElement;
      shape.clonedElement = clonedElement;
      dragElement = clonedElement;
    } else {
      dragElement = shape.element;
      shape.clonedElement = undefined;
    }
    wrapElement.appendChild(dragElement);
    const { width: baseWidth, height: baseHeight } = this.getShapeBaseDimensions(dragElement);
    const newLeft = shapeCenterX - baseWidth / 2;
    const newTop = shapeCenterY - baseHeight / 2;
    Object.assign(dragElement.style, {
      position: "absolute",
      left: `${newLeft}px`,
      top: `${newTop}px`,
      zIndex: "9999",
      pointerEvents: "none",
      transform: existingTransform,
      margin: "0",
    });
    this.config.onDragStart?.(dragElement, shape.index);
    if (this.config.enableSounds) SoundManager.play("drag_start");
  }

  private handleDragEnd(event: MouseEvent | TouchEvent): void {
    const moveEvent = "touches" in event ? "touchmove" : "mousemove";
    const endEvent = "touches" in event ? "touchend" : "mouseup";
    document.removeEventListener(moveEvent, this.boundHandleDragMove);
    document.removeEventListener(endEvent, this.boundHandleDragEnd);
    if (this.isDragging) {
      if (!this.currentDragShape) return;
      const { clientX, clientY } = this.getEventCoords(event);
      const dragElement = this.currentDragShape.clonedElement || this.currentDragShape.element;
      dragElement.style.display = "none";
      const elementUnderMouse = document.elementFromPoint(clientX, clientY);
      dragElement.style.display = "";
      const dropTarget = this.targetContainer?.contains(elementUnderMouse) ? this.targetContainer : null;
      if (dropTarget) {
        this.completeDrop(this.currentDragShape, dropTarget, clientX, clientY);
      } else {
        this.cancelDrag(this.currentDragShape);
      }
    } else {
      if (!this.currentDragShape) return;
      const clickedShape = this.currentDragShape.element;
      if (this.getDragOrigin(clickedShape) === DragOrigin.PLAYGROUND) {
        this.config.handleShape.selectShape(clickedShape);
      }
    }
    this.isDragging = false;
    this.currentDragShape = null;
    this.currentDragOrigin = DragOrigin.UNKNOWN;
    this.dragContext = null;
    const wrapElement = document.querySelector<HTMLElement>("#wrap") || document.body;
    wrapElement.style.cursor = "";
  }
  // #endregion

  // #region 드롭/취소
  private completeDrop(shape: DraggableShape, dropTarget: HTMLElement, dropScreenX: number, dropScreenY: number): void {
    const dragElement = shape.clonedElement || shape.element;
    const playgroundRect = dropTarget.getBoundingClientRect();
    const scale = window.bound.scale || 1;
    const newCenterX = (dropScreenX - playgroundRect.left) / scale - this.centerDragOffset.x;
    const newCenterY = (dropScreenY - playgroundRect.top) / scale - this.centerDragOffset.y;
    const { width: baseWidth, height: baseHeight } = this.getShapeBaseDimensions(dragElement);
    const finalX = newCenterX - baseWidth / 2;
    const finalY = newCenterY - baseHeight / 2;
    Object.assign(dragElement.style, {
      position: "absolute",
      left: `${finalX}px`,
      top: `${finalY}px`,
      zIndex: "auto",
      cursor: "default",
      pointerEvents: "", // svg 컨테이너는 기본적으로 포인터 비활성(CSS)에 따르도록 함
    });
    dropTarget.appendChild(dragElement);
    // 복제 참조를 지우기 전에 드롭 유형 결정
    const dropType = shape.clonedElement ? "clone placed" : "element moved";
    // 이제 영구적으로 플레이그라운드에 있으므로 복제 참조 지우기
    if (shape.clonedElement) {
      shape.clonedElement = undefined;
    }
    this.config.onDropSuccess?.(dragElement, shape.index, dropTarget);
    if (this.config.enableSounds) SoundManager.play("drop_success");
    log(`Drop completed ${shape.index} (${dropType})`, { x: finalX, y: finalY });
    // 새로 드롭된 도형을 드래그 가능하게 등록하기 위해 새로고침
    setTimeout(() => this.refresh(), 0);
  }

  private cancelDrag(shape: DraggableShape): void {
    if (shape.clonedElement) {
      // 복제된 요소가 드래그 중이었음 - 제거하기
      this.removeClonedShape(shape.clonedElement);
      shape.clonedElement = undefined;
      log(`Drag cancelled ${shape.index} (clone removed)`);
    } else {
      // 원본 요소가 드래그 중이었음
      if (this.currentDragOrigin === DragOrigin.PLAYGROUND) {
        // 플레이그라운드 도형이 밖으로 드래그됨 - 삭제하기
        this.deletePlaygroundShape(shape);
        log(`Drag cancelled ${shape.index} (playground shape deleted)`);
      } else {
        // 소스 도형이 밖으로 드래그됨 - 원래 위치로 되돌리기
        this.returnShapeToOriginal(shape);
        log(`Drag cancelled ${shape.index} (source shape returned)`);
      }
    }
    this.config.onDropFail?.(shape.element, shape.index);
    if (this.config.enableSounds) SoundManager.play("drop_fail");
  }
  // #endregion

  // #region 헬퍼
  // DOM에서 복제된 도형을 제거하는 헬퍼 메서드
  private removeClonedShape(clonedElement: SVGElement | undefined): void {
    if (clonedElement && clonedElement.parentElement) {
      clonedElement.remove();
      log(`Cloned shape removed from DOM`);
    }
  }

  // 밖으로 드래그된 플레이그라운드 도형을 삭제하는 헬퍼 메서드
  private deletePlaygroundShape(shape: DraggableShape): void {
    const svgElement = shape.element;
    if (svgElement && svgElement.parentElement) {
      svgElement.remove();
      log(`Playground shape ${shape.index} deleted from DOM`);
      // 드래그 가능한 도형 목록을 업데이트하기 위해 새로고침
      setTimeout(() => this.refresh(), 0);
    }
  }

  private returnShapeToOriginal(shape: DraggableShape): void {
    const svgElement = shape.element;
    // 요소 스타일을 원래 상태로 리셋
    Object.assign(svgElement.style, {
      position: "",
      left: "",
      top: "",
      transform: "",
      cursor: "default",
      zIndex: "auto",
      pointerEvents: "auto",
    });
    // 필요한 경우, 요소를 원래 부모에게 되돌려 보내기
    if (svgElement.parentElement !== shape.originalParent) {
      if (shape.originalNextSibling && shape.originalParent.contains(shape.originalNextSibling)) {
        shape.originalParent.insertBefore(svgElement, shape.originalNextSibling);
      } else {
        shape.originalParent.appendChild(svgElement);
      }
    }
    log(`Shape ${shape.index} returned to original position`);
  }
  // #endregion
}
