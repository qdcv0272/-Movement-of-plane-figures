import Common from "@ts/common";
import Sample from "@ts/activity/sample_01/sample";
import { DropdownManager } from "./modules/dropdown";
import { ImageSelector } from "./modules/imageSelect";
import { GradationManager } from "./modules/gradation";
import { DragImg } from "./modules/dragImg";
import { PictureGraphRenderer } from "./modules/pictureGraphRenderer";
import { BarColGraphRenderer } from "./modules/barColGraphRenderer";
import { BarRowGraphRenderer } from "./modules/barRowGraphRenderer";
import { PolygonalLineGraphRenderer } from "./modules/polygonalLineGraph";
import { DataCollector } from "./modules/dataCollector";
import { MiniTableManager } from "./modules/miniTableManager";
import { GraphData } from "./modules/types";

export class MathGraph {
  private common: Common;
  private pages: Sample[];
  private selectGraphs: HTMLButtonElement[];
  private choiceGraph: HTMLDivElement;
  private settingGraph: HTMLDivElement;
  private PictureGraph: HTMLDivElement;
  private inputGraphData: HTMLDivElement;
  private showGraph: HTMLDivElement;
  private PageResetButton: HTMLButtonElement;
  private SettingGraphApplyButton: HTMLButtonElement;
  private SettingGraphResetButton: HTMLButtonElement;
  private GraphBackDraw: HTMLButtonElement;
  private GraphBackButton: HTMLButtonElement;
  private WaveButton: HTMLButtonElement;
  private WaveBg: HTMLDivElement;
  private numDataBox: HTMLDivElement;
  private dataControlAdd: HTMLButtonElement;
  private dataControlRemove: HTMLButtonElement;
  private selectImgGraphs: HTMLDivElement;
  private showSettingGradation: HTMLDivElement;
  private BarGraph: HTMLDivElement;

  // 모듈 인스턴스들
  private dropdownManager: DropdownManager;
  private imageSelector: ImageSelector;
  private gradationManager: GradationManager;
  private dragImg: DragImg;
  private pictureGraphRenderer: PictureGraphRenderer;
  private barColGraphRenderer: BarColGraphRenderer;
  private barRowGraphRenderer: BarRowGraphRenderer;
  private polygonalLineGraphRenderer: PolygonalLineGraphRenderer;
  private dataCollector: DataCollector;
  private miniTableManager: MiniTableManager;

  // 상태 변수들
  private pictureGraphChoice: boolean = false;
  private barColGraphChoice: boolean = false;
  private barRowGraphChoice: boolean = false;
  private polygonalLineGraphChoice: boolean = false;

  constructor() {
    this.common = new Common();
    this.initializeElements();
    this.initializeModules();
    this.setupEventListeners();
    // this.settingGraphTable();
  }

  private initializeElements(): void {
    this.selectGraphs = Array.from(document.querySelectorAll(".btn-graph"));
    this.choiceGraph = document.querySelector(".choice-graph") as HTMLDivElement;
    this.settingGraph = document.querySelector(".setting-graph") as HTMLDivElement;
    this.PictureGraph = document.querySelector(".show-img-graph") as HTMLDivElement;
    this.inputGraphData = document.querySelector(".input-graph-data") as HTMLDivElement;
    this.showGraph = document.querySelector(".show-graph") as HTMLDivElement;
    this.PageResetButton = document.querySelector(".btn-reset-page") as HTMLButtonElement;
    this.SettingGraphApplyButton = document.querySelector(".btn-setting-data") as HTMLButtonElement;
    this.SettingGraphResetButton = document.querySelector(".btn-reset-data") as HTMLButtonElement;
    this.GraphBackDraw = document.querySelector(".show-graph .btn-draw") as HTMLButtonElement;
    this.GraphBackButton = document.querySelector(".show-graph .btn-back") as HTMLButtonElement;
    this.WaveButton = document.querySelector(".show-graph .btn-wave") as HTMLButtonElement;
    this.WaveBg = document.querySelector(".show-graph .wave-bg") as HTMLDivElement;
    this.numDataBox = document.querySelector(".num-data-box") as HTMLDivElement;
    this.dataControlAdd = document.querySelector(".btn-add-data") as HTMLButtonElement;
    this.dataControlRemove = document.querySelector(".btn-remove-data") as HTMLButtonElement;
    this.selectImgGraphs = document.querySelector(".setting-img-data") as HTMLDivElement;
    this.showSettingGradation = document.querySelector(".setting-gradation") as HTMLDivElement;
    this.BarGraph = document.querySelector(".show-bar-graph") as HTMLDivElement;
  }

  private initializeModules(): void {
    this.dropdownManager = new DropdownManager();
    this.imageSelector = new ImageSelector();
    this.gradationManager = new GradationManager();
    this.dragImg = new DragImg();
    this.pictureGraphRenderer = new PictureGraphRenderer(this.dragImg);
    this.barColGraphRenderer = new BarColGraphRenderer();
    this.barRowGraphRenderer = new BarRowGraphRenderer();
    this.polygonalLineGraphRenderer = new PolygonalLineGraphRenderer();
    this.dataCollector = new DataCollector(this.imageSelector);
    this.miniTableManager = new MiniTableManager();
  }

  private setupEventListeners(): void {
    // 초기 페이지로 돌아가기
    this.PageResetButton.addEventListener("click", () => {
      this.resetData();
      this.dropdownManager.hideDropdowns();
      this.GraphBackDraw.classList.remove("on");
      this.WaveButton.classList.add("remove");
      this.WaveButton.classList.remove("on");
      this.WaveBg.classList.remove("on");

      // 버튼 disabled 상태 초기화
      this.GraphBackDraw.classList.remove("disabled");
      this.WaveButton.classList.remove("disabled", "disabledKeep");

      this.choiceGraph.classList.remove("remove");
      this.inputGraphData.classList.remove("line-graph");
      this.settingGraph.classList.add("remove");
      this.showGraph.classList.add("remove");
      this.pictureGraphChoice = false;
      this.barColGraphChoice = false;
      this.barRowGraphChoice = false;
      this.polygonalLineGraphChoice = false;

      // 미니 테이블 닫기
      this.miniTableManager.hideMiniTable();
    });

    // 그래프 선택
    this.selectGraphs.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.choiceGraph.classList.add("remove");
        this.settingGraph.classList.remove("remove");

        this.settingGraphTable();

        // 그림그래프 예외 처리
        if (btn.dataset.graphType === "picture") {
          this.selectImgGraphs.classList.remove("remove");
          this.showSettingGradation.classList.add("remove");
          this.pictureGraphChoice = true;
          this.barColGraphChoice = false;
          this.barRowGraphChoice = false;
        } else if (btn.dataset.graphType === "bar-col") {
          this.selectImgGraphs.classList.add("remove");
          this.showSettingGradation.classList.remove("remove");
          this.pictureGraphChoice = false;
          this.barColGraphChoice = true;
          this.barRowGraphChoice = false;
        } else if (btn.dataset.graphType === "bar-row") {
          this.selectImgGraphs.classList.add("remove");
          this.showSettingGradation.classList.remove("remove");
          this.pictureGraphChoice = false;
          this.barColGraphChoice = false;
          this.barRowGraphChoice = true;
          this.polygonalLineGraphChoice = false;
        } else if (btn.dataset.graphType === "line") {
          this.WaveButton.classList.remove("remove");
          this.dropdownManager.showDropdowns();
          this.inputGraphData.classList.add("line-graph");
          this.selectImgGraphs.classList.add("remove");
          this.showSettingGradation.classList.remove("remove");
          this.pictureGraphChoice = false;
          this.barColGraphChoice = false;
          this.barRowGraphChoice = false;
          this.polygonalLineGraphChoice = true;
        } else {
          this.WaveButton.classList.add("remove");
          this.dropdownManager.hideDropdowns();
          this.inputGraphData.classList.remove("line-graph");
          this.selectImgGraphs.classList.add("remove");
          this.showSettingGradation.classList.remove("remove");
          this.pictureGraphChoice = false;
          this.barColGraphChoice = true;
          this.barRowGraphChoice = false;
          this.polygonalLineGraphChoice = false;
        }

        // 꺾은선 그래프일때 단위 추가
        // if (btn.dataset.graphType === "line") {
        //   this.dropdownManager.showDropdowns();
        //   this.inputGraphData.classList.add("line-graph");
        // } else {
        //   this.dropdownManager.hideDropdowns();
        //   this.inputGraphData.classList.remove("line-graph");
        // }
      });
    });

    // 적용하기 버튼
    this.SettingGraphApplyButton.addEventListener("click", () => {
      this.handleApplyButtonClick();
    });

    // 다시하기 버튼
    this.SettingGraphResetButton.addEventListener("click", () => {
      this.resetData();
    });

    // 그려보기 버튼
    this.GraphBackDraw.addEventListener("click", () => {
      console.log("그려보기 버튼 클릭됨!");
      this.handleDrawButtonClick();
    });
    // 물결선 버튼
    this.WaveButton.addEventListener("click", () => {
      this.handleWaveButtonClick();
    });

    // 그래프 돌아가기 버튼
    this.GraphBackButton.addEventListener("click", () => {
      this.GraphBackDraw.classList.remove("on");
      this.WaveButton.classList.remove("on");
      this.WaveBg.classList.remove("on");

      // 버튼 disabled 상태 초기화
      this.GraphBackDraw.classList.remove("disabled");
      this.WaveButton.classList.remove("disabled", "disabledKeep");

      this.settingGraph.classList.remove("remove");
      this.showGraph.classList.add("remove");

      // 그래프 커스텀 요소 초기화
      if (this.barColGraphChoice) {
        this.barColGraphRenderer.reset();
      }
      if (this.barRowGraphChoice) {
        this.barRowGraphRenderer.reset();
      }
      if (this.polygonalLineGraphChoice) {
        this.polygonalLineGraphRenderer.reset();
        // 꺾은선 그래프 wave-mode class 제거
        const graphSvg = document.getElementById("graphSvg");
        if (graphSvg) {
          graphSvg.classList.remove("wave-mode");
        }
      }

      // 미니 테이블 닫기
      this.miniTableManager.hideMiniTable();
    });

    // 데이터 추가/제거 버튼
    this.dataControlAdd.addEventListener("click", () => {
      this.addDataBoxItem();
    });

    this.dataControlRemove.addEventListener("click", () => {
      this.removeDataBoxItem();
    });

    // 경고창 닫기 버튼 이벤트 리스너 추가
    const alertCloseBtn = document.querySelector(".btn-alert-close") as HTMLButtonElement;
    if (alertCloseBtn) {
      alertCloseBtn.addEventListener("click", () => {
        this.hideAlertMessage();
      });
    }
  }

  // 그래프 설정값 테이블 생성
  private settingGraphTable(): void {
    // 기존 내용을 비우고 새로 생성
    this.numDataBox.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const numDataBoxItem = document.createElement("div");
      const numDataBoxSpanItemTop = document.createElement("span");
      const numDataBoxSpanItembottom = document.createElement("span");
      const numDataBoxSpanItemTopInput = document.createElement("input");
      const numDataBoxSpanItemBottomInput = document.createElement("input");

      numDataBoxSpanItemTopInput.type = "text";
      numDataBoxSpanItemTopInput.classList.add("num-data-top");
      // numDataBoxSpanItemBottomInput.type = "number";
      numDataBoxSpanItemBottomInput.type = "text";
      numDataBoxSpanItemBottomInput.value = "0"; // 초기값 0으로 설정
      // numDataBoxSpanItemBottomInput.min = "0";
      numDataBoxSpanItemBottomInput.classList.add("num-data-bottom");

      numDataBoxSpanItemTop.appendChild(numDataBoxSpanItemTopInput);
      numDataBoxSpanItembottom.appendChild(numDataBoxSpanItemBottomInput);
      numDataBoxItem.appendChild(numDataBoxSpanItemTop);
      numDataBoxItem.appendChild(numDataBoxSpanItembottom);
      numDataBoxItem.classList.add("num-data-box-item", `num-box-item-${i}`);
      this.numDataBox.appendChild(numDataBoxItem);
    }

    // 이벤트 리스너 설정
    this.setupInputEventListeners();

    // 초기 버튼 상태 설정
    this.updateButtonStates();
  }

  // 입력 필드 이벤트 리스너 설정 함수
  private setupInputEventListeners(): void {
    const bottomInputs = this.numDataBox.querySelectorAll(".num-data-bottom");
    bottomInputs.forEach((input) => {
      input.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const currentValue = target.value;
        const previousValue = target.getAttribute("data-previous-value") || "0";

        // 빈 값이 되었을 때 (브라우저가 숫자가 아닌 값을 자동으로 제거한 경우)
        // if (currentValue === "" && previousValue !== "") {
        // this.showWarningMessage(`<span class="emp">숫자</span>만 입력 가능합니다.`);
        // target.value = previousValue;
        // 빈 값이 되었을 때 0으로 설정
        if (currentValue === "") {
          target.value = "0";
          target.setAttribute("data-previous-value", "0");
          this.updateTotalBoxValue();
          this.updateButtonStates();
          return;
        }

        // 숫자가 아닌 문자가 포함되어 있는지 체크 (붙여넣기 등으로 인한)
        if (currentValue !== "" && !/^\d+$/.test(currentValue)) {
          this.showWarningMessage(`<span class="emp">숫자</span>만 입력 가능합니다.`);
          target.value = previousValue;
          return;
        }

        // 0으로 시작하는 경우 0 제거 (단, 0만 있는 경우는 제외)
        if (currentValue.startsWith("0") && currentValue.length > 1 && currentValue !== "0") {
          target.value = currentValue.substring(1);
        }

        // 1000 초과 체크
        const numValue = parseInt(target.value) || 0;
        if (numValue > 1000) {
          this.showWarningMessage(`1 ~ 1000 사이의 <span class="emp">숫자</span>를 입력해 주세요.`);
          target.value = previousValue;
          return;
        }

        // 이전 값 업데이트
        target.setAttribute("data-previous-value", target.value);

        // 총합 업데이트
        this.updateTotalBoxValue();

        // 버튼 상태 업데이트
        this.updateButtonStates();
      });

      // 붙여넣기 이벤트 처리
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const clipboardData = (e as ClipboardEvent).clipboardData || (window as any).clipboardData;
        const pastedText = clipboardData.getData("text");

        // 숫자만 허용
        if (/^\d+$/.test(pastedText)) {
          const target = e.target as HTMLInputElement;
          const numValue = parseInt(pastedText) || 0;

          // 1000 초과 체크
          if (numValue > 1000) {
            this.showWarningMessage(`1 ~ 1000 사이의 <span class="emp">숫자</span>를 입력해 주세요.`);
            return;
          }

          target.value = pastedText;
          target.setAttribute("data-previous-value", pastedText);
          this.updateTotalBoxValue();
          this.updateButtonStates();
        } else {
          this.showWarningMessage(`<span class="emp">숫자</span>만 붙여넣기 가능합니다.`);
        }
      });
    });
  }

  // 데이터 박스 아이템 추가
  private addDataBoxItem(): void {
    const currentItems = this.numDataBox.querySelectorAll(".num-data-box-item");
    const newIndex = currentItems.length;

    const numDataBoxItem = document.createElement("div");
    const numDataBoxSpanItemTop = document.createElement("span");
    const numDataBoxSpanItembottom = document.createElement("span");
    const numDataBoxSpanItemTopInput = document.createElement("input");
    const numDataBoxSpanItemBottomInput = document.createElement("input");

    numDataBoxSpanItemTopInput.type = "text";
    numDataBoxSpanItemTopInput.classList.add("num-data-top");
    numDataBoxSpanItemBottomInput.type = "text";
    // numDataBoxSpanItemBottomInput.type = "number";
    numDataBoxSpanItemBottomInput.value = "0";
    // numDataBoxSpanItemBottomInput.min = "0";
    numDataBoxSpanItemBottomInput.classList.add("num-data-bottom");

    numDataBoxSpanItemTop.appendChild(numDataBoxSpanItemTopInput);
    numDataBoxSpanItembottom.appendChild(numDataBoxSpanItemBottomInput);
    numDataBoxItem.appendChild(numDataBoxSpanItemTop);
    numDataBoxItem.appendChild(numDataBoxSpanItembottom);
    numDataBoxItem.classList.add("num-data-box-item", `num-box-item-${newIndex}`);
    this.numDataBox.appendChild(numDataBoxItem);

    // 새로 추가된 입력 필드에 이벤트 리스너 설정
    const newBottomInput = numDataBoxItem.querySelector(".num-data-bottom") as HTMLInputElement;
    if (newBottomInput) {
      newBottomInput.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        const currentValue = target.value;
        const previousValue = target.getAttribute("data-previous-value") || "0";

        // if (currentValue === "" && previousValue !== "") {
        // this.showWarningMessage(`<span class="emp">숫자</span>만 입력 가능합니다.`);
        // target.value = previousValue;
        if (currentValue === "") {
          target.value = "0";
          target.setAttribute("data-previous-value", "0");
          this.updateTotalBoxValue();
          this.updateButtonStates();
          return;
        }

        if (currentValue !== "" && !/^\d+$/.test(currentValue)) {
          this.showWarningMessage(`<span class="emp">숫자</span>만 입력 가능합니다.`);
          target.value = previousValue;
          return;
        }

        if (currentValue.startsWith("0") && currentValue.length > 1 && currentValue !== "0") {
          target.value = currentValue.substring(1);
        }

        // 1000 초과 체크
        const numValue = parseInt(target.value) || 0;
        if (numValue > 1000) {
          this.showWarningMessage(`1 ~ 1000 사이의 <span class="emp">숫자</span>를 입력해 주세요.`);
          target.value = previousValue;
          return;
        }

        target.setAttribute("data-previous-value", target.value);
        this.updateTotalBoxValue();
        this.updateButtonStates();
      });

      newBottomInput.addEventListener("paste", (e) => {
        e.preventDefault();
        const clipboardData = (e as ClipboardEvent).clipboardData || (window as any).clipboardData;
        const pastedText = clipboardData.getData("text");

        // 숫자만 허용
        if (/^\d+$/.test(pastedText)) {
          const target = e.target as HTMLInputElement;
          const numValue = parseInt(pastedText) || 0;

          // 1000 초과 체크
          if (numValue > 1000) {
            this.showWarningMessage(`1 ~ 1000 사이의 <span class="emp">숫자</span>를 입력해 주세요.`);
            return;
          }

          target.value = pastedText;
          target.setAttribute("data-previous-value", pastedText);
          this.updateTotalBoxValue();
          this.updateButtonStates();
        } else {
          this.showWarningMessage(`<span class="emp">숫자</span>만 붙여넣기 가능합니다.`);
        }
      });
    }

    this.updateButtonStates();
  }

  // 데이터 박스 아이템 제거
  private removeDataBoxItem(): void {
    const currentItems = this.numDataBox.querySelectorAll(".num-data-box-item");
    if (currentItems.length > 1) {
      currentItems[currentItems.length - 1].remove();
      this.updateTotalBoxValue();
      this.updateButtonStates();
    }
  }

  // 버튼 상태 업데이트
  private updateButtonStates(): void {
    const currentItems = this.numDataBox.querySelectorAll(".num-data-box-item");
    const totalValue = this.calculateTotal();

    // 데이터가 1개만 있으면 제거 버튼 비활성화
    if (currentItems.length <= 1) {
      this.dataControlRemove.classList.add("disabled");
    } else {
      this.dataControlRemove.classList.remove("disabled");
    }

    // 데이터가 6개 이상이면 추가 버튼 비활성화
    if (currentItems.length >= 6) {
      this.dataControlAdd.classList.add("disabled");
    } else {
      this.dataControlAdd.classList.remove("disabled");
    }

    // 총합이 0이면 적용하기 버튼 비활성화
    if (totalValue === 0) {
      this.SettingGraphApplyButton.classList.add("disabled");
    } else {
      this.SettingGraphApplyButton.classList.remove("disabled");
    }
  }

  // 총합 계산
  private calculateTotal(): number {
    const bottomInputs = this.numDataBox.querySelectorAll(".num-data-bottom");
    let total = 0;

    bottomInputs.forEach((input) => {
      const value = parseInt((input as HTMLInputElement).value) || 0;
      total += value;
    });

    return total;
  }

  // 총합 박스 값 업데이트
  private updateTotalBoxValue(): void {
    const totalValue = this.calculateTotal();
    const totalBoxValue = document.querySelector(".total-box-value") as HTMLDivElement;
    if (totalBoxValue) {
      totalBoxValue.textContent = totalValue.toString();
    }
  }

  // 경고 메시지 표시
  private showWarningMessage(message: string): void {
    const alertContainer = document.querySelector(".alert-container") as HTMLDivElement;
    const alertMessage = alertContainer.querySelector(".alert-message") as HTMLDivElement;

    if (alertMessage) {
      alertMessage.innerHTML = message;
    }

    alertContainer.classList.remove("remove");
  }

  // 경고 메시지 숨기기
  private hideAlertMessage(): void {
    const alertContainer = document.querySelector(".alert-container") as HTMLDivElement;
    alertContainer.classList.add("remove");
  }

  // 적용하기 버튼 클릭 처리 함수
  private handleApplyButtonClick(): void {
    // 버튼에 on 클래스 토글
    this.SettingGraphApplyButton.classList.toggle("on");

    // 그래프 데이터 수집
    const collectedGraphData = this.dataCollector.collectGraphData(this.pictureGraphChoice, this.barColGraphChoice, this.barRowGraphChoice);
    console.log("수집된 그래프 데이터:", collectedGraphData);

    // 1. 그래프 제목 검증
    if (!collectedGraphData.title || collectedGraphData.title.trim() === "") {
      this.showWarningMessage(`<span class="emp">제목</span>을 입력해 주세요.`);
      return;
    }

    // 2. 데이터 아이템 검증
    const hasEmptyLabel = collectedGraphData.dataItems.some((item) => !item.label || item.label.trim() === "");
    if (hasEmptyLabel) {
      this.showWarningMessage(`<span class="emp">표</span>를 완성해 주세요.`);
      return;
    }

    const isEmptySubTitle =
      !collectedGraphData.subTitles.top ||
      collectedGraphData.subTitles.top.trim() === "" ||
      !collectedGraphData.subTitles.bottom ||
      collectedGraphData.subTitles.bottom.trim() === "";
    if (isEmptySubTitle) {
      this.showWarningMessage(`<span class="emp">표</span>를 완성해 주세요.`);
      return;
    }

    const hasEmptyValue = collectedGraphData.dataItems.some((item) => item.value === 0);
    const hasOverValue = collectedGraphData.dataItems.some((item) => item.value > 1000);

    if (hasEmptyValue || hasOverValue) {
      this.showWarningMessage(`1 ~ 1000 사이의 <span class="emp">숫자</span>를 입력해 주세요.`);
      return;
    }

    // 그림그래프 단위 선택 검증
    if (this.pictureGraphChoice && collectedGraphData.pictureGraphData) {
      const hasUnselectedUnit = collectedGraphData.pictureGraphData.imageUnitValues.some((unit) => unit.value === "");

      if (hasUnselectedUnit) {
        this.showWarningMessage(`<span class="emp">단위</span>를 지정해 주세요.`);
        return;
      }

      // 두 번째와 세 번째 단위가 모두 0인지 확인
      const secondUnit = collectedGraphData.pictureGraphData.imageUnitValues[1];
      const thirdUnit = collectedGraphData.pictureGraphData.imageUnitValues[2];

      if (secondUnit && thirdUnit && secondUnit.value === "0" && thirdUnit.value === "0") {
        this.showWarningMessage(`<span class="emp">단위</span>는 <span class="emp">2개 이상</span> 지정해 주세요.`);
        return;
      }
      // 그림그래프 생성
      this.pictureGraphRenderer.createPictureGraph(collectedGraphData);
      this.PictureGraph.classList.remove("remove");
      this.BarGraph.classList.add("remove");
    } else {
      const gradationDropdown = document.querySelector(".gradation-dropdown-btn") as HTMLElement;
      const gradationValue = gradationDropdown?.textContent?.trim() || "";

      if (gradationValue === "") {
        this.showWarningMessage(`<span class="emp">단위</span>를 지정해 주세요.`);
        return;
      }

      // 그래프 생성 (세로, 가로 막대그래프 또는 꺾은선 그래프)
      const svgContainer = document.querySelector(".svg-graph-container");
      if (svgContainer) {
        // 기존 모드 클래스 제거
        svgContainer.classList.remove("bar-col-mode", "bar-row-mode", "polygonal-mode");

        if (this.barColGraphChoice) {
          // 세로 막대그래프 생성
          svgContainer.classList.add("bar-col-mode");
          this.barColGraphRenderer.createBarColGraph(collectedGraphData);
        } else if (this.barRowGraphChoice) {
          // 가로 막대그래프 생성
          svgContainer.classList.add("bar-row-mode");
          this.barRowGraphRenderer.createBarRowGraph(collectedGraphData);
        } else if (this.polygonalLineGraphChoice) {
          // 꺾은선 그래프 생성
          svgContainer.classList.add("polygonal-mode");
          this.polygonalLineGraphRenderer.createPolygonalLineGraph(collectedGraphData);
        }
      }
      this.PictureGraph.classList.add("remove");
      this.BarGraph.classList.remove("remove");
    }

    // 미니 테이블 업데이트
    this.miniTableManager.updateMiniTableData(collectedGraphData);
  }

  // 그려보기 버튼 클릭 처리
  private handleDrawButtonClick(): void {
    // 그림그래프일때만 작동
    if (this.pictureGraphChoice) {
      const dataItems = document.querySelectorAll(".img-graph-container .num-data-content .value-img");
      const DragdataItems = document.querySelectorAll(".img-graph-container .drag-img-item");
      const dragImgBox = document.querySelector(".img-graph-container .drag-img-box");

      if (this.GraphBackDraw.classList.contains("on")) {
        this.GraphBackDraw.classList.remove("on");
        dragImgBox?.classList.add("disabled");
        dataItems.forEach((item) => {
          item.classList.remove("remove");
        });
        DragdataItems.forEach((item) => {
          item.classList.add("remove");
        });
      } else {
        this.GraphBackDraw.classList.add("on");
        dragImgBox?.classList.remove("disabled");
        dataItems.forEach((item) => {
          item.classList.add("remove");
        });
        DragdataItems.forEach((item) => {
          item.classList.remove("remove");
        });
      }
    } else if (this.barColGraphChoice) {
      // 세로 막대그래프 그려보기 버튼 로직
      if (this.GraphBackDraw.classList.contains("on")) {
        // 그려보기 모드 해제 - 막대 보이기
        this.GraphBackDraw.classList.remove("on");
        this.barColGraphRenderer.toggleGraphBars(); // 막대 보이기
        this.barColGraphRenderer.toggleDrawMode(); // 그려보기 모드 해제 (커스텀 막대 제거 포함)
      } else {
        // 그려보기 모드 활성화 - 막대 숨기기
        this.GraphBackDraw.classList.add("on");
        this.barColGraphRenderer.toggleGraphBars(); // 막대 숨기기
        this.barColGraphRenderer.toggleDrawMode(); // 그려보기 모드 활성화
      }
    } else if (this.barRowGraphChoice) {
      // 가로 막대그래프 그려보기 버튼 로직
      if (this.GraphBackDraw.classList.contains("on")) {
        // 그려보기 모드 해제 - 막대 보이기
        this.GraphBackDraw.classList.remove("on");
        this.barRowGraphRenderer.toggleGraphBars(); // 막대 보이기
        this.barRowGraphRenderer.toggleDrawMode(); // 그려보기 모드 해제 (커스텀 막대 제거 포함)
      } else {
        // 그려보기 모드 활성화 - 막대 숨기기
        this.GraphBackDraw.classList.add("on");
        this.barRowGraphRenderer.toggleGraphBars(); // 막대 숨기기
        this.barRowGraphRenderer.toggleDrawMode(); // 그려보기 모드 활성화
      }
    } else if (this.polygonalLineGraphChoice) {
      // 꺾은선 그래프 그려보기 버튼 로직
      if (this.GraphBackDraw.classList.contains("on")) {
        // 그려보기 모드 해제 - 선 보이기
        this.GraphBackDraw.classList.remove("on");
        this.polygonalLineGraphRenderer.toggleGraphLines(); // 선 보이기
        this.polygonalLineGraphRenderer.toggleDrawMode(); // 그려보기 모드 해제 (커스텀 점 제거 포함)

        // 물결선 버튼 활성화
        this.WaveButton.classList.remove("disabled");
      } else {
        // 그려보기 모드 활성화 - 선 숨기기
        this.GraphBackDraw.classList.add("on");
        this.polygonalLineGraphRenderer.toggleGraphLines(); // 선 숨기기
        this.polygonalLineGraphRenderer.toggleDrawMode(); // 그려보기 모드 활성화

        // 물결선 버튼 비활성화
        this.WaveButton.classList.add("disabled");
        // 물결선 모드가 활성화되어 있었다면 해제
        this.WaveButton.classList.remove("on");
        this.WaveBg.classList.remove("on");
      }
    }
  }

  // 물결선 버튼 클릭 처리
  private handleWaveButtonClick(): void {
    // 꺾은선 그래프일 때만 물결선 기능 활성화
    if (this.polygonalLineGraphChoice) {
      this.polygonalLineGraphRenderer.toggleWaveMode();
      this.WaveButton.classList.toggle("on");
      this.WaveBg.classList.toggle("on");

      // 물결선 버튼이 on일 때 그려보기 버튼 비활성화
      if (this.WaveButton.classList.contains("on")) {
        this.GraphBackDraw.classList.add("disabled");
        // 그려보기 버튼이 on 상태였다면 해제
        this.GraphBackDraw.classList.remove("on");
      } else {
        this.GraphBackDraw.classList.remove("disabled");
      }
    }
  }

  // 데이터 초기화 함수
  private resetData(): void {
    const graphTitle = document.querySelector(".input-graph-title") as HTMLInputElement;
    const inputGraphData = document.querySelector(".input-graph-data");

    if (inputGraphData) {
      graphTitle.value = "";

      // 모든 input 요소 선택
      const allInputs = inputGraphData.querySelectorAll("input");

      allInputs.forEach((input) => {
        const target = input as HTMLInputElement;

        // num-data-bottom 클래스인 경우 0으로 설정
        if (target.classList.contains("num-data-bottom")) {
          target.value = "0";
          target.setAttribute("data-previous-value", "0");
        } else {
          // 나머지 input은 빈 값으로 설정
          target.value = "";
        }
      });

      // 총합도 초기화
      this.updateTotalBoxValue();
    }

    // 드롭다운 초기화
    this.dropdownManager.resetDropdowns();

    // 이미지 선택 초기화
    this.imageSelector.reset();

    // 눈금 설정 초기화
    this.gradationManager.reset();

    // 막대그래프 커스텀 막대 초기화
    this.barColGraphRenderer.reset();
    this.barRowGraphRenderer.reset();

    // 꺾은선 그래프 wave-mode class 제거
    if (this.polygonalLineGraphChoice) {
      this.polygonalLineGraphRenderer.reset();
      const graphSvg = document.getElementById("graphSvg");
      if (graphSvg) {
        graphSvg.classList.remove("wave-mode");
      }
    }

    // 버튼 disabled 상태 초기화
    this.GraphBackDraw.classList.remove("disabled");
    this.WaveButton.classList.remove("disabled", "disabledKeep");

    // 미니 테이블 닫기
    this.miniTableManager.hideMiniTable();
  }
}
