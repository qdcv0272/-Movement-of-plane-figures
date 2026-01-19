// 드래그 이미지 기능 모듈 (크로스 플랫폼)
import type { GraphData } from "./types";

export class DragImg {
  private dragArea: NodeListOf<HTMLDivElement>;
  private isDragging: boolean = false;
  private dragData: string | null = null;
  private isMobile: boolean;
  private currentGraphData: GraphData | null = null;

  constructor() {
    // 모바일/태블릿 감지 (정확한 감지)
    this.isMobile = this.detectMobile();

    this.dragArea = document.querySelectorAll(".column-right .num-data-area");
    this.init();
  }

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent;

    // 모바일/태블릿 기기 감지
    const mobileDevices = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // 터치 지원 여부 확인
    const touchSupport = "ontouchstart" in window;

    // 모바일 기기이거나 터치 지원하는 기기
    return mobileDevices || touchSupport;
  }

  private init(): void {
    if (this.isMobile) {
      // 모바일/태블릿: 터치 이벤트 사용
      this.setupTouchEvents();
    } else {
      // 데스크톱: HTML5 Drag and Drop 사용
      this.setupDragEvents();
    }
  }

  private setupTouchEvents(): void {
    const dragElements = document.querySelectorAll(".drag-img .drag-item");

    dragElements.forEach((element) => {
      element.addEventListener("touchstart", (e) => {
        // Safari 호환성을 위한 preventDefault 처리
        try {
          e.preventDefault();
        } catch (error) {
          // Safari에서 preventDefault 실패 시 무시
        }

        const touchEvent = e as TouchEvent;
        const touch = touchEvent.touches[0];
        const imgType = element.getAttribute("data-img-type");
        this.startTouchDrag(touch.clientX, touch.clientY, imgType || "");
      });
    });

    // 드롭 영역에 터치 이벤트 추가
    this.dragArea.forEach((area) => {
      area.addEventListener("touchend", (e) => {
        if (this.isDragging) {
          this.handleTouchDrop(e);
        }
      });

      area.addEventListener("touchstart", (e) => {
        if (this.isDragging) {
          this.handleTouchDrop(e);
        }
      });
    });

    // 터치 이동 시 잔상 업데이트
    document.addEventListener("touchmove", (e) => {
      if (this.isDragging) {
        // Safari에서 스크롤 방지
        try {
          e.preventDefault();
        } catch (error) {
          // Safari에서 preventDefault 실패 시 무시
        }

        const touch = e.touches[0];
        this.updateGhostPosition(touch.clientX, touch.clientY);
      }
    });

    // 문서 전체에서 터치 종료 감지
    document.addEventListener("touchend", (e) => {
      if (this.isDragging) {
        this.handleTouchDrop(e);
      }
    });
  }

  private setupDragEvents(): void {
    const dragElements = document.querySelectorAll(".drag-img .drag-item");

    dragElements.forEach((element) => {
      element.setAttribute("draggable", "true");

      element.addEventListener("dragstart", (e) => {
        const dragEvent = e as DragEvent;
        const dragElement = e.target as HTMLElement;
        const imgType = dragElement.getAttribute("data-img-type");
        dragEvent.dataTransfer?.setData("text/plain", imgType || "");
        console.log("드래그 시작:", imgType);
      });
    });

    // 드롭 영역 설정
    this.dragArea.forEach((area) => {
      area.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      area.addEventListener("drop", (e) => {
        e.preventDefault();
        // .num-data-content 안에 드롭되었는지 확인
        const target = e.target as HTMLElement;
        const contentElement = target.closest(".num-data-content");

        if (contentElement && e.dataTransfer) {
          const imgType = e.dataTransfer.getData("text/plain");
          console.log("드롭된 이미지 타입:", imgType);
          console.log("드롭된 위치:", contentElement);

          // span 태그 추가
          this.addImageSpan(contentElement as HTMLElement, imgType, this.currentGraphData!);
        }
      });
    });
  }

  private startTouchDrag(x: number, y: number, imgType: string): void {
    this.isDragging = true;
    this.dragData = imgType;
    console.log("터치 드래그 시작:", imgType);

    // 잔상 요소 생성
    this.createGhostElement(x, y, imgType);
  }

  private handleTouchDrop(e: TouchEvent): void {
    // 터치 위치에서 요소 찾기 (더 정확한 방법)
    const touch = e.changedTouches[0];
    const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    const contentElement = elementAtPoint?.closest(".num-data-content");

    if (contentElement) {
      console.log("터치 드롭됨:", this.dragData);
      console.log("드롭된 위치:", contentElement);

      // span 태그 추가
      this.addImageSpan(contentElement as HTMLElement, this.dragData || "", this.currentGraphData!);
    }

    this.isDragging = false;
    this.dragData = null;

    // 잔상 요소 제거
    this.removeGhostElement();
  }

  private createGhostElement(x: number, y: number, imgType: string): void {
    const ghostElement = document.createElement("div");
    ghostElement.id = "drag-ghost";
    ghostElement.style.cssText = `
      position: fixed;
      width: 56px;
      height: 56px;
      background: url('./images/choice_${imgType}_0.png') no-repeat;
      background-size: 56px 56px;
      opacity: 0.7;
      pointer-events: none;
      z-index: 9999;
      left: ${x - 28}px;
      top: ${y - 28}px;
    `;
    document.body.appendChild(ghostElement);
  }

  private removeGhostElement(): void {
    const ghostElement = document.getElementById("drag-ghost");
    if (ghostElement) {
      document.body.removeChild(ghostElement);
    }
  }

  private updateGhostPosition(x: number, y: number): void {
    const ghostElement = document.getElementById("drag-ghost");
    if (ghostElement) {
      ghostElement.style.left = x - 28 + "px";
      ghostElement.style.top = y - 28 + "px";
    }
  }

  private addImageSpan(contentElement: HTMLElement, imgType: string, graphData: GraphData): void {
    // span 태그 생성
    const spanElement = document.createElement("span");
    spanElement.setAttribute("data-img", imgType);
    spanElement.setAttribute("data-num", `${graphData.pictureGraphData?.selectedImageIndex}`); // 임시로 0 설정
    spanElement.className = imgType; // big, medium, small 클래스 추가
    spanElement.classList.add("drag-img-item");

    // 클릭 이벤트 추가 (자기 자신 삭제)
    spanElement.addEventListener("click", () => {
      this.removeImageSpan(spanElement);
    });

    // contentElement에 span 추가
    contentElement.appendChild(spanElement);

    console.log(`${imgType} 이미지 span이 추가됨:`, spanElement);
  }

  private removeImageSpan(spanElement: HTMLElement): void {
    // span 요소 삭제
    spanElement.remove();
    console.log("이미지 span이 삭제됨:", spanElement);
  }

  /**
   * drag-img-box와 내부 drag-item(big, medium, small)을 동적으로 생성
   */
  public createDragImgBox(graphData: GraphData): HTMLElement {
    // 현재 graphData 저장
    this.currentGraphData = graphData;

    // drag-img-box 생성
    const dragImgBox = document.createElement("div");
    dragImgBox.className = "drag-img-box disabled";

    // big
    const dragImgBig = document.createElement("div");
    dragImgBig.className = "drag-img drag-img-big";
    const bigItem = document.createElement("div");
    // bigItem.className = "drag-item big-img-0";
    bigItem.className = `drag-item big-img-${graphData.pictureGraphData?.selectedImageIndex}`;
    bigItem.setAttribute("data-img-type", "big");
    const bigValueWrap = document.createElement("div");
    const bigValue = document.createElement("span");
    bigValue.className = "big-value";
    bigValue.textContent = graphData.pictureGraphData?.imageUnitValues[2]?.value || "100";
    const bigUnit = document.createElement("span");
    bigUnit.className = "unit-bottom big-unit";
    bigValueWrap.appendChild(bigValue);
    bigValueWrap.appendChild(bigUnit);
    dragImgBig.appendChild(bigItem);
    dragImgBig.appendChild(bigValueWrap);

    // big-value가 0인 경우 remove 클래스 추가
    if (graphData.pictureGraphData?.imageUnitValues[2]?.value === "0") {
      dragImgBig.classList.add("remove");
    }

    // medium
    const dragImgMedium = document.createElement("div");
    dragImgMedium.className = "drag-img drag-img-medium";
    const mediumItem = document.createElement("div");
    // mediumItem.className = "drag-item medium-img-0";
    mediumItem.className = `drag-item medium-img-${graphData.pictureGraphData?.selectedImageIndex}`;
    mediumItem.setAttribute("data-img-type", "medium");
    const mediumValueWrap = document.createElement("div");
    const mediumValue = document.createElement("span");
    mediumValue.className = "medium-value";
    mediumValue.textContent = graphData.pictureGraphData?.imageUnitValues[1]?.value || "50";
    const mediumUnit = document.createElement("span");
    mediumUnit.className = "unit-bottom medium-unit";
    mediumValueWrap.appendChild(mediumValue);
    mediumValueWrap.appendChild(mediumUnit);
    dragImgMedium.appendChild(mediumItem);
    dragImgMedium.appendChild(mediumValueWrap);

    // medium-value가 0인 경우 remove 클래스 추가
    if (graphData.pictureGraphData?.imageUnitValues[1]?.value === "0") {
      dragImgMedium.classList.add("remove");
    }

    // small
    const dragImgSmall = document.createElement("div");
    dragImgSmall.className = "drag-img drag-img-small";
    const smallItem = document.createElement("div");
    // smallItem.className = "drag-item small-img-0";
    smallItem.className = `drag-item small-img-${graphData.pictureGraphData?.selectedImageIndex}`;
    smallItem.setAttribute("data-img-type", "small");
    const smallValueWrap = document.createElement("div");
    const smallValue = document.createElement("span");
    smallValue.className = "small-value";
    smallValue.textContent = graphData.pictureGraphData?.imageUnitValues[0]?.value || "1";
    const smallUnit = document.createElement("span");
    smallUnit.className = "unit-bottom small-unit";
    smallValueWrap.appendChild(smallValue);
    smallValueWrap.appendChild(smallUnit);
    dragImgSmall.appendChild(smallItem);
    dragImgSmall.appendChild(smallValueWrap);

    // small-value가 0인 경우 remove 클래스 추가
    if (graphData.pictureGraphData?.imageUnitValues[0]?.value === "0") {
      dragImgSmall.classList.add("remove");
    }

    // drag-img-box에 big, medium, small 추가
    dragImgBox.appendChild(dragImgBig);
    dragImgBox.appendChild(dragImgMedium);
    dragImgBox.appendChild(dragImgSmall);

    // 드래그 이벤트 등록 (init 내부 로직 재사용)
    if (this.isMobile) {
      this.setupTouchEventsForBox(dragImgBox);
    } else {
      this.setupDragEventsForBox(dragImgBox);
    }

    return dragImgBox;
  }

  // drag-img-box 내부 요소에만 이벤트 등록하는 버전 (동적 생성용)
  private setupTouchEventsForBox(box: HTMLElement): void {
    const dragElements = box.querySelectorAll(".drag-img .drag-item");
    dragElements.forEach((element) => {
      element.addEventListener("touchstart", (e) => {
        try {
          e.preventDefault();
        } catch (error) {}
        const touchEvent = e as TouchEvent;
        const touch = touchEvent.touches[0];
        const imgType = element.getAttribute("data-img-type");
        this.startTouchDrag(touch.clientX, touch.clientY, imgType || "");
      });
    });
  }

  private setupDragEventsForBox(box: HTMLElement): void {
    const dragElements = box.querySelectorAll(".drag-img .drag-item");
    dragElements.forEach((element) => {
      element.setAttribute("draggable", "true");
      element.addEventListener("dragstart", (e) => {
        const dragEvent = e as DragEvent;
        const dragElement = e.target as HTMLElement;
        const imgType = dragElement.getAttribute("data-img-type");
        dragEvent.dataTransfer?.setData("text/plain", imgType || "");
        console.log("드래그 시작:", imgType);
      });
    });
  }

  /**
   * drop 영역(.num-data-area)에 대한 이벤트 등록 (동적 생성 후마다 호출)
   */
  public setupDropAreas(): void {
    this.dragArea = document.querySelectorAll(".column-right .num-data-area");
    if (this.isMobile) {
      this.dragArea.forEach((area) => {
        area.addEventListener("touchend", (e) => {
          if (this.isDragging) {
            this.handleTouchDrop(e);
          }
        });
        area.addEventListener("touchstart", (e) => {
          if (this.isDragging) {
            this.handleTouchDrop(e);
          }
        });
      });
    } else {
      this.dragArea.forEach((area) => {
        area.addEventListener("dragover", (e) => {
          e.preventDefault();
        });
        area.addEventListener("drop", (e) => {
          e.preventDefault();
          // .num-data-content 안에 드롭되었는지 확인
          const target = e.target as HTMLElement;
          const contentElement = target.closest(".num-data-content");
          if (contentElement && e.dataTransfer) {
            const imgType = e.dataTransfer.getData("text/plain");
            this.addImageSpan(contentElement as HTMLElement, imgType, this.currentGraphData!);
          }
        });
      });
    }
  }
}
