import type { GraphData } from "./types";

export class BarColGraphRenderer {
  private isGraphHidden: boolean = false;
  private customBars: Array<{ x: number; y: number; width: number; height: number; value: number }> = [];
  private isDrawMode: boolean = false;
  private currentDataLength: number = 0;
  private currentBarWidth: number = 0;
  private currentBarSpacing: number = 0;
  private currentStartX: number = 0;

  constructor() {}

  public createBarColGraph(graphData: GraphData): void {
    // 데이터 준비
    const data = graphData.dataItems.map((item) => item.value);
    const labels = graphData.dataItems.map((item) => item.label);

    // SVG 요소 가져오기
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    // 기존 내용 제거
    svg.innerHTML = "";

    // SVG 하단 배경 추가 (SVG rect 요소 사용)
    const bottomBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bottomBg.setAttribute("x", "156"); // 150 + 6 = 156
    bottomBg.setAttribute("y", "470"); // 530 - 60 = 470 (bottom: 0)
    bottomBg.setAttribute("width", "950");
    bottomBg.setAttribute("height", "65");
    bottomBg.setAttribute("fill", "#fffbe2");
    bottomBg.setAttribute("class", "bottom-bg");
    svg.appendChild(bottomBg);

    // 그래프 제목 설정
    const graphTitle = document.querySelector(".show-bar-graph .bar-graph-title") as HTMLElement;
    if (graphTitle) {
      graphTitle.textContent = graphData.title;
    }
    // 그래프 단위
    const graphUnit = document.querySelector(".svg-graph-container .graph-unit-top") as HTMLElement;
    if (graphUnit) {
      graphUnit.textContent = `(${graphData.unitValues.bottom})`;
    }

    // 그래프 서브 탑
    const graphSubtop = document.querySelector(".svg-graph-container .graph-sub-title-top") as HTMLElement;
    if (graphSubtop) {
      graphSubtop.textContent = graphData.subTitles.top;
    }

    // 그래프 서브 바텀
    const graphsubBottom = document.querySelector(".svg-graph-container .graph-sub-title-bottom") as HTMLElement;
    if (graphsubBottom) {
      graphsubBottom.textContent = graphData.subTitles.bottom;
    }

    // 눈금 계산
    const gridInfo = this.calculateGridInfo(data);

    // SVG 그래프 생성
    this.createSVGGraph(data, labels, gridInfo);

    // 화면 전환
    const settingGraph = document.querySelector(".setting-graph") as HTMLDivElement;
    const showGraph = document.querySelector(".show-graph") as HTMLDivElement;

    if (settingGraph && showGraph) {
      settingGraph.classList.add("remove");
      showGraph.classList.remove("remove");
    }
  }

  private calculateGridInfo(data: number[]): { maxValue: number; gridLines: number; gridSize: number } {
    // 최대값 찾기
    const maxValue = Math.max(...data);

    // 최대값 올림 처리
    let roundedMax = this.roundUpToNearest(maxValue);

    // 구분선 개수와 눈금 크기 계산
    let gridLines: number;
    let gridSize: number;

    if (roundedMax <= 100) {
      gridLines = Math.ceil(roundedMax / 10);
      gridSize = 1;
    } else if (roundedMax <= 200) {
      gridLines = Math.ceil(roundedMax / 20);
      gridSize = 2;
    } else if (roundedMax <= 400) {
      gridLines = Math.ceil(roundedMax / 50);
      gridSize = 5;
    } else if (roundedMax <= 800) {
      gridLines = Math.ceil(roundedMax / 100);
      gridSize = 10;
    } else {
      gridLines = Math.ceil(roundedMax / 100);
      gridSize = 20;
    }

    return { maxValue: roundedMax, gridLines, gridSize };
  }

  private roundUpToNearest(value: number): number {
    // 주 단위 기준으로 올림
    if (value <= 100) {
      return Math.ceil(value / 10) * 10; // 10단위로 올림
    } else if (value <= 200) {
      return Math.ceil(value / 20) * 20; // 20단위로 올림
    } else if (value <= 400) {
      return Math.ceil(value / 50) * 50; // 50단위로 올림
    } else if (value <= 800) {
      return Math.ceil(value / 100) * 100; // 100단위로 올림
    } else {
      return Math.ceil(value / 100) * 100; // 100단위로 올림
    }
  }

  private createSVGGraph(data: number[], labels: string[], gridInfo: { maxValue: number; gridLines: number; gridSize: number }): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    const width = 1100;
    const height = 530;
    const margin = { top: 0, right: 0, bottom: 60, left: 150 };

    // 데이터 정규화 (눈금 기준으로)
    const normalizedData = data.map((value) => (value / gridInfo.maxValue) * (height - margin.top - margin.bottom));

    // 막대 생성
    const barWidth = (width - margin.left - margin.right) / data.length - 100;
    const barSpacing = 100;

    // 막대 정보 저장 (그려보기 모드에서 사용)
    this.currentDataLength = data.length;
    this.currentBarWidth = barWidth;
    this.currentBarSpacing = barSpacing;
    const totalBarWidth = data.length * barWidth + (data.length - 1) * barSpacing;
    this.currentStartX = margin.left + (width - margin.left - margin.right - totalBarWidth) / 2;

    // === 그래프 영역에 흰색 배경 추가 (가장 먼저) ===
    const graphBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    graphBackground.setAttribute("x", (margin.left + 6).toString());
    graphBackground.setAttribute("y", margin.top.toString());
    graphBackground.setAttribute("width", (width - margin.left - margin.right).toString());
    graphBackground.setAttribute("height", (height - margin.top - margin.bottom).toString());
    graphBackground.setAttribute("fill", "white");
    graphBackground.setAttribute("stroke", "none");
    svg.appendChild(graphBackground);

    // 눈금 생성 (흰색 배경 위에)
    this.createGrid(gridInfo);

    // 막대 생성 (나중에)
    // 전체 막대 영역 계산하여 중앙 배치
    const startX = this.currentStartX;

    data.forEach((value, index) => {
      const barHeight = normalizedData[index];
      const x = startX + index * (barWidth + barSpacing);
      const y = height - margin.bottom - barHeight;

      // 막대 생성
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", x.toString());
      bar.setAttribute("y", y.toString());
      bar.setAttribute("width", barWidth.toString());
      bar.setAttribute("height", barHeight.toString());
      bar.setAttribute("fill", "#FFBEE1");
      bar.setAttribute("class", `graph-bar-${data.length}`);
      bar.setAttribute("data-index", index.toString());
      bar.setAttribute("data-value", value.toString());
      bar.setAttribute("style", "z-index: 1;");

      svg.appendChild(bar);

      // 라벨 생성
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", (x + barWidth / 2).toString());
      label.setAttribute("y", (height - margin.bottom + 20).toString());
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("fill", "#333");
      label.setAttribute("font-size", "14");
      label.setAttribute("class", "graph-label");
      label.textContent = labels[index] || `항목${index + 1}`;

      svg.appendChild(label);

      // 막대 사이에 경계선 추가 (마지막 막대 제외)
      if (index < data.length - 1) {
        const borderLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        const borderX = x + barWidth + barSpacing / 2; // 막대 사이 중간 지점
        borderLine.setAttribute("x1", borderX.toString());
        borderLine.setAttribute("y1", margin.top.toString());
        borderLine.setAttribute("x2", borderX.toString());
        borderLine.setAttribute("y2", (height - margin.bottom + 65).toString()); // 아래로 65px 넘치게
        borderLine.setAttribute("stroke", "#F3DFB7");
        borderLine.setAttribute("stroke-width", "2");
        svg.appendChild(borderLine);
      }
    });
  }

  private createGrid(gridInfo: { maxValue: number; gridLines: number; gridSize: number }): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    const width = 1100;
    const height = 530;
    const margin = { top: 0, right: 0, bottom: 60, left: 150 };

    // 주 단위와 보조 단위 계산
    let mainUnit: number; // 주 단위 (구분선 간격)
    let subUnit: number; // 보조 단위 (눈금선 간격)

    // gradation-dropdown-btn에서 선택된 값 확인
    const gradationDropdown = document.querySelector(".gradation-dropdown-btn") as HTMLElement;
    const selectedValue = gradationDropdown?.textContent?.trim() || "";

    if (selectedValue === "자동 계산") {
      // 자동 계산 로직 (기존과 동일)
      if (gridInfo.maxValue <= 100) {
        mainUnit = 10;
        subUnit = 1;
      } else if (gridInfo.maxValue <= 200) {
        mainUnit = 20;
        subUnit = 2;
      } else if (gridInfo.maxValue <= 400) {
        mainUnit = 50;
        subUnit = 5;
      } else if (gridInfo.maxValue <= 800) {
        mainUnit = 100;
        subUnit = 10;
      } else {
        mainUnit = 100;
        subUnit = 20;
      }
    } else {
      // 선택된 값에 따라 subUnit 설정
      const selectedNumber = parseInt(selectedValue);
      if (!isNaN(selectedNumber)) {
        // mainUnit은 기존 로직 유지
        if (gridInfo.maxValue <= 100) {
          mainUnit = 10;
        } else if (gridInfo.maxValue <= 200) {
          mainUnit = 20;
        } else if (gridInfo.maxValue <= 400) {
          mainUnit = 50;
        } else if (gridInfo.maxValue <= 800) {
          mainUnit = 100;
        } else {
          mainUnit = 100;
        }
        // subUnit은 선택된 값으로 설정
        subUnit = selectedNumber;
      } else {
        // 기본값 (혹시 모를 경우)
        mainUnit = 100;
        subUnit = 20;
      }
    }

    // 구분선 생성 (주 단위, 굵은선)
    const mainUnitLabels: SVGTextElement[] = [];
    for (let i = 0; i <= gridInfo.maxValue; i += mainUnit) {
      const y = margin.top + ((gridInfo.maxValue - i) / gridInfo.maxValue) * (height - margin.top - margin.bottom);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (margin.left + 6).toString());
      line.setAttribute("y1", y.toString());
      line.setAttribute("x2", (width - margin.right + 6).toString());
      line.setAttribute("y2", y.toString());
      line.setAttribute("stroke", "#56D0FB");
      line.setAttribute("stroke-width", "2");

      svg.appendChild(line);

      // 구분선 라벨
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", margin.left.toString());
      label.setAttribute("y", y.toString());
      label.setAttribute("text-anchor", "end");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("fill", "#333");
      label.setAttribute("font-size", "16");
      label.setAttribute("class", "grid-label");
      label.textContent = i.toString();

      mainUnitLabels.push(label);
      svg.appendChild(label);
    }

    // 첫 번째와 마지막 라벨에 특별한 클래스 추가
    if (mainUnitLabels.length > 0) {
      mainUnitLabels[0].classList.add("grid-label-first");
      mainUnitLabels[mainUnitLabels.length - 1].classList.add("grid-label-last");
    }

    // 눈금선 생성 (보조 단위, 얇은선)
    for (let i = 0; i <= gridInfo.maxValue; i += subUnit) {
      // 구분선과 겹치지 않도록 건너뛰기
      if (i % mainUnit === 0) {
        continue;
      }

      const y = margin.top + ((gridInfo.maxValue - i) / gridInfo.maxValue) * (height - margin.top - margin.bottom);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (margin.left + 6).toString());
      line.setAttribute("y1", y.toString());
      line.setAttribute("x2", (width - margin.right + 6).toString());
      line.setAttribute("y2", y.toString());
      line.setAttribute("stroke", "#C2F4FF");
      line.setAttribute("stroke-width", "1");

      svg.appendChild(line);
    }

    // === 그래프 범위를 나타내는 "ㄴ" 모양 선 추가 ===
    // 왼쪽 세로선 (그래프 왼쪽 경계) - 65px 아래로 확장
    const leftBorder = document.createElementNS("http://www.w3.org/2000/svg", "line");
    leftBorder.setAttribute("x1", (margin.left + 6).toString());
    leftBorder.setAttribute("y1", margin.top.toString());
    leftBorder.setAttribute("x2", (margin.left + 6).toString());
    leftBorder.setAttribute("y2", (height - margin.bottom + 65).toString());
    leftBorder.setAttribute("stroke", "#F3DFB7");
    leftBorder.setAttribute("stroke-width", "2");
    svg.appendChild(leftBorder);

    // 아래쪽 가로선 (그래프 아래쪽 경계) - 100px 더 왼쪽으로 확장
    const bottomBorder = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bottomBorder.setAttribute("x1", (margin.left - 156).toString());
    bottomBorder.setAttribute("y1", (height - margin.bottom).toString());
    bottomBorder.setAttribute("x2", (width - margin.right + 6).toString());
    bottomBorder.setAttribute("y2", (height - margin.bottom).toString());
    bottomBorder.setAttribute("stroke", "#F3DFB7");
    bottomBorder.setAttribute("stroke-width", "2");
    svg.appendChild(bottomBorder);

    // 대각선 아래쪽 영역에만 색상 적용 (2,3,4번 점으로 이어진 삼각형)
    const lowerTriangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = `155,471 155,530 -1,530`;
    lowerTriangle.setAttribute("points", points);
    lowerTriangle.setAttribute("fill", "#fffbe2"); // 요청하신 색상
    svg.appendChild(lowerTriangle);

    // ㄴ 모양의 모서리 점에서 SVG 왼쪽 아래 모서리까지 대각선 추가
    const diagonalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    diagonalLine.setAttribute("x1", (margin.left + 6).toString()); // ㄴ 모양의 모서리 점 X (156)
    diagonalLine.setAttribute("y1", (height - margin.bottom).toString()); // ㄴ 모양의 모서리 점 Y (470)
    diagonalLine.setAttribute("x2", "0"); // SVG 왼쪽 아래 모서리 X (0)
    diagonalLine.setAttribute("y2", "530"); // SVG 왼쪽 아래 모서리 Y (530)
    diagonalLine.setAttribute("stroke", "#F3DFB7");
    diagonalLine.setAttribute("stroke-width", "2");
    svg.appendChild(diagonalLine);
  }

  public toggleGraphBars(): void {
    const bars = document.querySelectorAll(`.graph-bar-${this.currentDataLength}`);
    const customBars = document.querySelectorAll(".custom-graph-bar");

    if (this.isGraphHidden) {
      // 원본 막대바 보이기, 커스텀 막대바 숨기기
      bars.forEach((bar) => {
        bar.classList.remove("hidden");
      });
      customBars.forEach((bar) => {
        bar.classList.add("hidden");
      });
      this.isGraphHidden = false;
    } else {
      // 원본 막대바 숨기기, 커스텀 막대바 보이기
      bars.forEach((bar) => {
        bar.classList.add("hidden");
      });
      customBars.forEach((bar) => {
        bar.classList.remove("hidden");
      });
      this.isGraphHidden = true;
    }
  }

  // 커스텀 막대 숨기기
  public hideCustomBars(): void {
    const customBars = document.querySelectorAll(".custom-graph-bar");
    customBars.forEach((bar) => {
      bar.remove();
    });
  }

  public reset(): void {
    this.isGraphHidden = false;
    this.isDrawMode = false;
    this.hideCustomBars(); // 커스텀 막대 제거
    this.removeDrawMode(); // 그려보기 모드 제거
  }

  // 그려보기 모드 토글
  public toggleDrawMode(): void {
    this.isDrawMode = !this.isDrawMode;

    if (this.isDrawMode) {
      this.setupDrawMode();
    } else {
      this.removeDrawMode();
      // 커스텀 막대는 유지 (뒤로가기나 그래프 선택할 때만 초기화)
    }
  }

  // 그려보기 모드 설정
  private setupDrawMode(): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    svg.addEventListener("click", this.handleSvgClick.bind(this));
    svg.style.cursor = "pointer";
  }

  // 그려보기 모드 제거
  private removeDrawMode(): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    svg.removeEventListener("click", this.handleSvgClick.bind(this));
    svg.style.cursor = "default";
  }

  // SVG 클릭 이벤트 처리
  private handleSvgClick(event: MouseEvent): void {
    if (!this.isDrawMode) return;

    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // SVG의 실제 크기와 원본 크기 비율 계산
    const originalWidth = 1100;
    const originalHeight = 530;
    const scaleX = originalWidth / rect.width;
    const scaleY = originalHeight / rect.height;

    // 클릭 좌표를 원본 SVG 좌표계로 변환
    const scaledClickX = clickX * scaleX;
    const scaledClickY = clickY * scaleY;

    // 클릭한 Y 위치를 밸류값으로 사용 (0~1000 범위로 정규화)
    const height = 530;
    const margin = { top: 0, right: 0, bottom: 60, left: 150 };
    const graphHeight = height - margin.top - margin.bottom;

    // Y 위치를 밸류값으로 변환 (위쪽이 큰 값, 아래쪽이 작은 값)
    // 클릭한 Y가 그래프 영역 안에 있는지 확인
    if (scaledClickY < margin.top || scaledClickY > height - margin.bottom) {
      return;
    }

    // 그래프 영역 내에서의 상대적 위치 계산 (0~1)
    const relativeY = (scaledClickY - margin.top) / graphHeight;
    // 0~1을 1000~0으로 변환 (위쪽이 큰 값)
    const value = Math.round((1 - relativeY) * 1000);

    const finalValue = Math.max(0, Math.min(1000, value));

    // 실제 막대바 요소들을 확인하여 클릭한 X 위치에 해당하는 막대 인덱스 찾기
    const bars = document.querySelectorAll(`.graph-bar-${this.currentDataLength}`);

    let barIndex = -1;
    let barX = 0;
    let barWidth = 0;

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const barRect = bar.getBoundingClientRect();
      const barLeft = barRect.left - rect.left;
      const barRight = barRect.right - rect.left;
      const actualIndex = parseInt(bar.getAttribute("data-index") || "0");

      if (clickX >= barLeft && clickX <= barRight) {
        barIndex = actualIndex;
        barX = parseFloat(bar.getAttribute("x") || "0");
        barWidth = parseFloat(bar.getAttribute("width") || "0");
        break; // 정확한 막대를 찾으면 루프 종료
      }
    }

    if (barIndex !== -1) {
      this.createCustomBar(barIndex, finalValue, barX, barWidth);
    }
  }

  // 커스텀 막대 생성
  private createCustomBar(index: number, value: number, x: number, width: number): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    // 기존 커스텀 막대 제거 (같은 인덱스)
    const existingBar = svg.querySelector(`[data-custom-index="${index}"]`);
    if (existingBar) {
      existingBar.remove();
    }

    // 새로운 커스텀 막대 생성
    const height = 530;
    const margin = { top: 0, right: 0, bottom: 60, left: 150 };
    const graphHeight = height - margin.top - margin.bottom;
    const barHeight = (value / 1000) * graphHeight;
    const y = height - margin.bottom - barHeight;

    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.setAttribute("x", x.toString());
    bar.setAttribute("y", y.toString());
    bar.setAttribute("width", width.toString());
    bar.setAttribute("height", barHeight.toString());
    bar.setAttribute("fill", "#4A90E2");
    bar.setAttribute("class", `custom-graph-bar graph-bar-${this.currentDataLength}`);
    bar.setAttribute("data-custom-index", index.toString());
    bar.setAttribute("data-value", value.toString());
    bar.setAttribute("style", "z-index: 2;"); // 기존 막대보다 위에 그리기

    svg.appendChild(bar);
  }
}
