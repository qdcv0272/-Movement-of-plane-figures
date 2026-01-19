import type { GraphData } from "./types";
import { DragImg } from "./dragImg";

export class PictureGraphRenderer {
  private dragImg: DragImg;

  constructor(dragImg: DragImg) {
    this.dragImg = dragImg;
  }

  public createPictureGraph(graphData: GraphData): void {
    const showGraph = document.querySelector(".show-graph") as HTMLDivElement;
    const imgGraphData = showGraph.querySelector(".img-graph-data") as HTMLDivElement;
    const settingGraph = document.querySelector(".setting-graph") as HTMLDivElement;

    // 기존 내용 제거
    imgGraphData.innerHTML = "";

    // 새로운 구조로 컨테이너 생성
    const container = document.createElement("div");
    container.className = "img-graph-container";

    // 첫 번째 열 생성 (상단 제목 + 항목들)
    const firstColumn = document.createElement("div");
    firstColumn.className = "img-graph-column";
    firstColumn.className = "column-left";

    // 상단 제목 추가
    const subTitleTop = document.createElement("div");
    subTitleTop.className = "sub-title-top";
    subTitleTop.textContent = graphData.subTitles.top || "상단 제목";
    firstColumn.appendChild(subTitleTop);

    // 항목들 추가
    for (let i = 0; i < graphData.dataItems.length; i++) {
      const titleElement = document.createElement("div");
      titleElement.className = "num-data-item-title";

      const label = graphData.dataItems[i]?.label || `항목${i + 1}`;

      // 16글자 초과 시 16글자로 자르기
      if (label.length > 16) {
        titleElement.textContent = label.substring(0, 16);
      } else {
        // 8글자 초과 시 줄바꿈 처리
        if (label.length > 8) {
          const firstLine = label.substring(0, 8);
          const secondLine = label.substring(8);
          titleElement.innerHTML = `${firstLine}<br>${secondLine}`;
        } else {
          titleElement.textContent = label;
        }
      }

      firstColumn.appendChild(titleElement);
    }

    // 두 번째 열 생성 (하단 제목 + 값들)
    const secondColumn = document.createElement("div");
    secondColumn.className = "img-graph-column";
    secondColumn.className = "column-right";

    // 하단 제목 추가
    const subTitleBottom = document.createElement("div");
    subTitleBottom.className = "sub-title-bottom";
    subTitleBottom.textContent = graphData.subTitles.bottom || "하단 제목";
    secondColumn.appendChild(subTitleBottom);

    // 값들 추가
    for (let i = 0; i < graphData.dataItems.length; i++) {
      const areaElement = document.createElement("div");
      areaElement.className = "num-data-area";

      const contentElement = document.createElement("div");
      contentElement.className = "num-data-content";

      // dataItems의 value를 imageUnitValues로 나누어서 span 태그 생성
      if (graphData.pictureGraphData?.imageUnitValues) {
        const { imageUnitValues } = graphData.pictureGraphData;
        const currentValue = graphData.dataItems[i]?.value || 0;
        let remainValue = currentValue;

        // 단위 값들을 숫자로 변환하고 유효한 값만 필터링
        const validUnits = imageUnitValues
          .map((unit, index) => ({
            value: Number(unit.value) || 0,
            originalIndex: index, // 원래 인덱스 보존
            className: index === 0 ? "small" : index === 1 ? "medium" : "big",
          }))
          .filter((unit) => unit.value > 0)
          .sort((a, b) => b.value - a.value); // 큰 값부터 정렬

        // 가장 큰 단위부터 차례대로 처리
        for (const unit of validUnits) {
          const count = Math.floor(remainValue / unit.value);
          remainValue -= count * unit.value;

          for (let j = 0; j < count; j++) {
            const span = document.createElement("span");
            span.className = `value-img value-img-${unit.className}-${graphData.pictureGraphData?.selectedImageIndex}`;
            contentElement.appendChild(span);
          }
        }
      }

      areaElement.appendChild(contentElement);
      secondColumn.appendChild(areaElement);
    }

    // 컨테이너에 열들 추가
    container.appendChild(firstColumn);
    container.appendChild(secondColumn);

    // img-graph-data에 컨테이너 추가
    imgGraphData.appendChild(container);

    // ===== drag-img-box 동적 생성 =====
    // 기존 drag-img-box가 있으면 제거
    const prevDragImgBox = container.querySelector(".drag-img-box");
    if (prevDragImgBox) prevDragImgBox.remove();

    // dragImg.ts의 메서드로 생성 및 이벤트 등록
    const dragImgBox = this.dragImg.createDragImgBox(graphData);
    container.appendChild(dragImgBox);
    // drop 영역 이벤트 등록
    this.dragImg.setupDropAreas();

    // === 여기에서 dragImg를 다시 초기화 ===
    // 그래프 제목 설정
    const graphTitle = document.querySelector(".img-graph-title") as HTMLElement;
    if (graphTitle) {
      graphTitle.textContent = graphData.title;
    }

    // unit-bottom 설정 (subTitles.bottom 값 사용)
    const unitBottoms = document.querySelectorAll(".unit-bottom") as NodeListOf<HTMLElement>;
    unitBottoms.forEach((unitBottom) => {
      unitBottom.textContent = graphData.unitValues.bottom || "";
    });

    // 드롭다운 값들과 단위 설정
    this.setupGraphValues(graphData);

    // 화면 전환
    settingGraph.classList.add("remove");
    showGraph.classList.remove("remove");
  }

  private setupGraphValues(graphData: GraphData): void {
    // 그림그래프 데이터가 있는 경우에만 처리
    if (graphData.pictureGraphData) {
      const { imageUnitValues } = graphData.pictureGraphData;

      // big-value, medium-value, small-value 설정
      const bigValue = document.querySelector(".big-value") as HTMLElement;
      const mediumValue = document.querySelector(".medium-value") as HTMLElement;
      const smallValue = document.querySelector(".small-value") as HTMLElement;

      if (smallValue && imageUnitValues[0]) {
        smallValue.textContent = imageUnitValues[0].value;
      }
      if (mediumValue && imageUnitValues[1]) {
        mediumValue.textContent = imageUnitValues[1].value;
      }
      if (bigValue && imageUnitValues[2]) {
        bigValue.textContent = imageUnitValues[2].value;
      }
    }
  }
}
