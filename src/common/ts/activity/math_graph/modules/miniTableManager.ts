import type { GraphData } from "./types";

export class MiniTableManager {
  private miniTableBtn: HTMLButtonElement;
  private miniTableCloseBtn: HTMLButtonElement;
  private miniTableDataContainer: HTMLDivElement;

  constructor() {
    this.miniTableBtn = document.querySelector(".btn-mini-tableData") as HTMLButtonElement;
    this.miniTableCloseBtn = document.querySelector(".btn-mini-table-close") as HTMLButtonElement;
    this.miniTableDataContainer = document.querySelector(".mini-table-data-container") as HTMLDivElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 미니 테이블 버튼 클릭 이벤트
    this.miniTableBtn.addEventListener("click", () => {
      this.showMiniTable();
    });

    // 미니 테이블 닫기 버튼 클릭 이벤트
    this.miniTableCloseBtn.addEventListener("click", () => {
      this.hideMiniTable();
    });
  }

  public showMiniTable(): void {
    this.miniTableBtn.classList.add("remove");
    this.miniTableDataContainer.classList.remove("remove");
  }

  public hideMiniTable(): void {
    this.miniTableDataContainer.classList.add("remove");
    this.miniTableBtn.classList.remove("remove");
  }

  public updateMiniTableData(graphData: GraphData): void {
    const miniTableData = document.querySelector(".mini-table-data") as HTMLDivElement;

    if (!miniTableData) return;

    // 1. 서브 타이틀 업데이트
    const miniSubTitleTop = miniTableData.querySelector(".mini-sub-title-top span") as HTMLSpanElement;
    const miniSubTitleBottom = miniTableData.querySelector(".mini-sub-title-bottom span") as HTMLSpanElement;
    const unitTop = miniTableData.querySelector(".unit-top") as HTMLSpanElement;
    const unitBottom = miniTableData.querySelector(".unit-bottom") as HTMLSpanElement;

    if (miniSubTitleTop) miniSubTitleTop.textContent = graphData.subTitles.top || "";
    if (miniSubTitleBottom) miniSubTitleBottom.textContent = graphData.subTitles.bottom || "";

    // 단위 표시 처리
    if (unitTop) {
      if (graphData.unitValues.top && graphData.unitValues.top.trim() !== "") {
        unitTop.textContent = graphData.unitValues.top;
        unitTop.classList.remove("remove");
      } else {
        unitTop.classList.add("remove");
      }
    }

    if (unitBottom) {
      if (graphData.unitValues.bottom && graphData.unitValues.bottom.trim() !== "") {
        unitBottom.textContent = graphData.unitValues.bottom;
        unitBottom.classList.remove("remove");
      } else {
        unitBottom.classList.add("remove");
      }
    }

    // 2. 데이터 아이템 동적 생성
    const miniNumDataBox = miniTableData.querySelector(".mini-num-data-box") as HTMLDivElement;
    if (miniNumDataBox) {
      // 기존 아이템들 제거
      miniNumDataBox.innerHTML = "";

      // 새로운 아이템들 생성
      graphData.dataItems.forEach((item) => {
        const miniNumDataItem = document.createElement("div");
        miniNumDataItem.className = "mini-num-data-item";

        const titleDiv = document.createElement("div");
        titleDiv.className = "mini-num-data-item-title";
        titleDiv.textContent = item.label || "";

        const valueDiv = document.createElement("div");
        valueDiv.className = "mini-num-data-item-value";
        valueDiv.textContent = item.value.toString();

        miniNumDataItem.appendChild(titleDiv);
        miniNumDataItem.appendChild(valueDiv);
        miniNumDataBox.appendChild(miniNumDataItem);
      });
    }

    // 3. 총합 업데이트
    const miniTotalValue = miniTableData.querySelector(".mini-total-value") as HTMLDivElement;
    if (miniTotalValue) {
      miniTotalValue.textContent = graphData.totalValue.toString();
    }
  }
}
