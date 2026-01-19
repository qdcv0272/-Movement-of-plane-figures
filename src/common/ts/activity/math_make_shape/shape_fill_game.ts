// #region Imports
import Step from "@ts/step";
import SoundManager from "@module/audio/sound_manager";
import { log, sendMessage } from "@module/utilities/util";
import MakeShape from "./make_shape";
import { PIECE_LIST } from "./piece";
import ShapeDragAndDrop from "./shape_drag_drop";
import HandleShape from "./handle_shape";
import { OverlayScrollbars } from "overlayscrollbars";
// #endregion

// #region Types
type Props = StepProps & {
  //
};
// #endregion

export default class ShapeFillGame extends Step {
  // #region 필드
  private scrollbarInstance: OverlayScrollbars | null = null;
  private isModalOpen: boolean = false;

  protected props: StepProps;

  private playground: HTMLDivElement | null = null;

  private btnHome: HTMLButtonElement | null = null;
  private btnSelect: HTMLButtonElement | null = null;
  private btnSave: HTMLButtonElement | null = null;
  private btnRetry: HTMLButtonElement | null = null;

  private modalShapeList: HTMLDivElement[] = [];

  private shapeDragAndDrop: ShapeDragAndDrop;
  private handleShape: HandleShape;

  // 이벤트 핸들링
  private boundToggleModal: () => void;
  private boundHandleHome: () => void;
  private boundCloseModal: () => void;
  private boundHandleShapeSelect: (shapeIndex: number) => void;
  private boundHandleRetry: () => void;
  // #endregion

  // #region 생성자
  constructor(props: Props) {
    super(props);

    this.props = props;

    this.boundToggleModal = this.handleModal.bind(this);
    this.boundHandleHome = this.handleHome.bind(this);
    this.boundCloseModal = this.closeModal.bind(this);
    this.boundHandleShapeSelect = this.handleShapeSelect.bind(this);
    this.boundHandleRetry = this.handleRetry.bind(this);
    if (!this.props.root) {
      console.error("root is undefined");
      return;
    }

    this.root = document.querySelector(this.props.root) as HTMLElement;

    this.playground = this.root.querySelector(".playground__box") as HTMLDivElement;

    this.btnHome = this.root.querySelector(".btn__home") as HTMLButtonElement;
    this.btnSelect = this.root.querySelector(".btn__select") as HTMLButtonElement;
    // this.btnSave = this.root.querySelector(".btn__save") as HTMLButtonElement;
    this.btnRetry = this.root.querySelector(".btn__retry") as HTMLButtonElement;

    this.modalShapeList = Array.from(this.root.querySelectorAll(".select__shape__modal .grid-box .shape-item")) as HTMLDivElement[];

    this.shapeDragAndDrop = new ShapeDragAndDrop({
      sourceSelector: ".shape__list",
      targetSelector: ".playground__box",
      handleShape: this.handleShape, // HandleShape 인스턴스 주입
    });
    this.handleShape = new HandleShape({
      containerSelector: ".playground__box",
    });
  }
  // #endregion

  // #region Life Cycle
  public override init(): void {
    super.init();
  }

  public override start(): void {
    super.start();

    this.show();
    this.renderPieces();
    this.initShapeHandler(); // HandleShape 먼저 초기화
    this.initDragAndDrop(); // 그 다음 DragAndDrop 초기화

    // 이벤트
    this.registerEvent();
  }

  public override clear(): void {
    super.clear();
    this.destroyDragAndDrop();
    this.handleShape?.deselectShape();

    // 모달이 열려있으면 닫기
    if (this.isModalOpen) {
      this.closeModal();
    }

    this.destroyScrollbar();

    // 이벤트
    this.unregisterEvent();
  }
  // #endregion

  // #region 표시
  public hide(): void {
    this.root.classList.add("hide");
  }

  public show(): void {
    this.root.classList.remove("hide");
  }
  // #endregion

  // #region 이벤트
  private registerEvent(): void {
    this.btnSelect?.addEventListener("click", this.boundToggleModal);
    this.btnHome?.addEventListener("click", this.boundHandleHome);
    this.modalShapeList.forEach((shape, index) => {
      shape.addEventListener("click", this.boundHandleShapeSelect.bind(this, index));
    });
    this.btnRetry?.addEventListener("click", this.boundHandleRetry);
  }

  private unregisterEvent(): void {
    this.btnSelect?.removeEventListener("click", this.boundToggleModal);
    this.btnHome?.removeEventListener("click", this.boundHandleHome);
    this.modalShapeList.forEach((shape, index) => {
      shape.removeEventListener("click", this.boundHandleShapeSelect.bind(this, index));
    });
    this.btnRetry?.removeEventListener("click", this.boundHandleRetry);
  }

  private handleHome(): void {
    sendMessage(window, {
      message: MakeShape.GO_INTRO,
    });
  }

  private handleRetry(): void {
    const baseShape = this.root.querySelector(".base-shape");
    if (baseShape) {
      const classesToRemove = Array.from(baseShape.classList).filter((className) => className.startsWith("piece-"));
      baseShape.classList.remove(...classesToRemove);
    }

    const playgroundChildren = Array.from(this.playground?.children || []);
    playgroundChildren.forEach((child) => {
      if (child.classList.contains("base-shape")) return;
      child.remove();
    });
  }
  // #endregion

  // #region 모달
  private handleModal(): void {
    if (this.isModalOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  private openModal(): void {
    const modal = this.root.querySelector(".select__shape__modal");
    if (!modal) return;

    const btnClose = modal.querySelector(".btn-close");
    if (btnClose) {
      btnClose.addEventListener("click", this.boundCloseModal);
    }

    modal.classList.remove("hide");
    this.isModalOpen = true;
    this.initScrollbar();
  }

  private closeModal(): void {
    const modal = this.root.querySelector(".select__shape__modal");
    if (!modal) return;

    const btnClose = modal.querySelector(".btn-close");
    if (btnClose) {
      btnClose.removeEventListener("click", this.boundCloseModal);
    }

    modal.classList.add("hide");
    this.isModalOpen = false;
    this.destroyScrollbar();
  }
  // #endregion

  // #region 도형 렌더링
  private renderPieces(): void {
    const shapeList = this.root.querySelector(".shape__list");
    if (!shapeList) return;

    shapeList.innerHTML = "";

    PIECE_LIST.forEach((piece, index) => {
      const pieceElement = document.createElement("div");
      pieceElement.classList.add(`piece-${index}`);
      pieceElement.innerHTML = piece.svg;
      shapeList.appendChild(pieceElement);
    });
  }
  // #endregion

  // #region 드래그 앤 드롭
  private initDragAndDrop(): void {
    if (this.shapeDragAndDrop) {
      this.shapeDragAndDrop.destroy();
    }
    this.shapeDragAndDrop = new ShapeDragAndDrop({
      sourceSelector: ".shape__list",
      targetSelector: ".playground__box",
      handleShape: this.handleShape,
    });
    this.shapeDragAndDrop.init();
  }

  private initShapeHandler(): void {
    // this.handleShape?.destroy(); // 만약 destroy 메서드가 있다면 호출
    this.handleShape = new HandleShape({
      containerSelector: ".playground__box",
    });
    this.handleShape.init();
  }

  private destroyDragAndDrop(): void {
    if (this.shapeDragAndDrop) {
      this.shapeDragAndDrop.destroy();
    }
  }
  // #endregion

  // #region 스크롤바
  private initScrollbar(): void {
    const modal = this.root.querySelector(".select__shape__modal");
    if (!modal) return;

    const scrollContainer = modal.querySelector("#scroll-container");
    if (scrollContainer && !this.scrollbarInstance) {
      this.scrollbarInstance = OverlayScrollbars(scrollContainer as HTMLElement, {
        scrollbars: {
          // theme: "os-theme-dark",
          // visibility: "auto",
          // autoHide: "leave",
          // autoHideDelay: 1500,
          clickScroll: true,
        },
        overflow: {
          x: "hidden",
          y: "scroll",
        },
        // paddingAbsolute: false,
        showNativeOverlaidScrollbars: false,
        update: {
          // elementEvents: [["img", "load"]],
          debounce: [0, 30],
          // attributes: null,
          // ignoreMutation: null,
        },
      });
    }
  }

  private destroyScrollbar(): void {
    if (this.scrollbarInstance) {
      this.scrollbarInstance.destroy();
      this.scrollbarInstance = null;
    }
  }
  // #endregion

  // #region 도형 선택
  private handleShapeSelect(shapeIndex: number): void {
    log(`shapeIndex: ${shapeIndex}`);

    const baseShape = this.root.querySelector(".base-shape");
    if (baseShape) {
      const classesToRemove = Array.from(baseShape.classList).filter((className) => className.startsWith("piece-"));
      baseShape.classList.remove(...classesToRemove);
    }

    // playGround base-shape 제외 모든 요소 지우기
    const playgroundChildren = Array.from(this.playground?.children || []);
    playgroundChildren.forEach((child) => {
      if (child.classList.contains("base-shape")) return;
      child.remove();
    });

    // drop된 도형만 지움
    // const dropShapes = Array.from(this.playground?.querySelectorAll("svg") || []);

    // if (dropShapes) {
    //   dropShapes.forEach((shape) => {
    //     shape.remove();
    //   });
    // }

    // base-shape에 모양 추가
    const shape = this.modalShapeList[shapeIndex];
    if (shape) {
      baseShape?.classList.add(`piece-${shapeIndex}`);
    } else {
      log("shape is undefined");
    }

    // 모달 닫기
    this.closeModal();
  }
  // #endregion
}
