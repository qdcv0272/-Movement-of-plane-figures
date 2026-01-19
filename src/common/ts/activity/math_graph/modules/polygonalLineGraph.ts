import type { GraphData } from "./types";

export class PolygonalLineGraphRenderer {
  private isGraphHidden: boolean = false;
  private customPoints: Array<{ x: number; y: number; value: number }> = [];
  private isDrawMode: boolean = false;
  private currentDataLength: number = 0;
  private currentPointSpacing: number = 0;
  private currentStartX: number = 0;

  // 물결선 모드 관련 변수들
  private originalData: number[] = [];
  private originalLabels: string[] = [];
  private originalGridInfo: { maxValue: number; gridLines: number; gridSize: number } | null = null;
  private isWaveMode: boolean = false;

  constructor() {}

  public createPolygonalLineGraph(graphData: GraphData): void {
    // 데이터 준비
    const data = graphData.dataItems.map((item) => item.value);
    const labels = graphData.dataItems.map((item) => item.label);

    // 원본 데이터 저장 (처음 생성 시에만)
    if (this.originalData.length === 0) {
      this.originalData = [...data];
      this.originalLabels = [...labels];
    }

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
    const graphUnitTop = document.querySelector(".svg-graph-container .graph-unit-top") as HTMLElement;
    if (graphUnitTop) {
      graphUnitTop.textContent = `(${graphData.unitValues.bottom})`;
    }
    const graphUnitBottom = document.querySelector(".svg-graph-container .graph-unit-bottom") as HTMLElement;
    if (graphUnitBottom) {
      graphUnitBottom.textContent = `(${graphData.unitValues.top})`;
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

    // 원본 그리드 정보 저장 (처음 생성 시에만)
    if (!this.originalGridInfo) {
      this.originalGridInfo = { ...gridInfo };
    }

    // SVG 그래프 생성
    this.createSVGGraph(data, labels, gridInfo);

    // 화면 전환
    const settingGraph = document.querySelector(".setting-graph") as HTMLDivElement;
    const showGraph = document.querySelector(".show-graph") as HTMLDivElement;

    if (settingGraph && showGraph) {
      settingGraph.classList.add("remove");
      showGraph.classList.remove("remove");
    }

    this.checkWaveModeCondition();
  }

  private calculateGridInfo(data: number[]): { maxValue: number; gridLines: number; gridSize: number } {
    // 최대값 찾기
    const maxValue = Math.max(...data);

    // 최대값 올림 처리
    let roundedMax = this.roundUpToNearest(maxValue);

    // gradation-dropdown-btn에서 선택된 값 확인
    const gradationDropdown = document.querySelector(".gradation-dropdown-btn") as HTMLElement;
    const selectedValue = gradationDropdown?.textContent?.trim() || "";

    // 구분선 개수와 눈금 크기 계산
    let gridLines: number;
    let gridSize: number;

    if (selectedValue === "자동 계산") {
      // 자동 계산 로직 (기존과 동일)
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
    } else {
      // 선택된 값에 따라 gridSize 설정
      const selectedNumber = parseInt(selectedValue);
      if (!isNaN(selectedNumber)) {
        // gridSize는 선택된 값으로 설정
        gridSize = selectedNumber;
        // gridLines는 선택된 gridSize로 계산
        gridLines = Math.ceil(roundedMax / gridSize);
      } else {
        // 기본값 (혹시 모를 경우)
        gridSize = 20;
        gridLines = Math.ceil(roundedMax / gridSize);
      }
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

    const gridLabels = document.querySelectorAll(".grid-label");
    // 기존 그래프 요소들 제거 (눈금선, 연결선, 점, 라벨 등)
    const existingElements = svg.querySelectorAll(".grid-label, .graph-line, .graph-point, .border-line, .grid-line");
    existingElements.forEach((element) => element.remove());

    const width = 1100;
    const height = 530;
    const margin = { top: 10, right: 0, bottom: 60, left: 150 };

    // 데이터 정규화 (눈금 기준으로) - 물결선 모드에 따라 다른 그리드 정보 사용
    let normalizedData: number[];
    let pointSpacing: number;
    let currentStartX: number;

    if (this.isWaveMode) {
      let gridSize = gridInfo.gridSize;
      // 주 단위
      const mainUnit = gridInfo.maxValue <= 100 ? 10 : gridInfo.maxValue <= 200 ? 20 : gridInfo.maxValue <= 400 ? 50 : 100;
      if (mainUnit < gridInfo.gridSize) {
        gridSize = mainUnit;
      } else {
        gridSize = gridInfo.gridSize;
      }
      // 구분선 개수 = 최대값 / 눈금 크기 + 1
      const mainGridLines = gridLabels.length - 1;
      // console.log("구분선 라벨 개수:", gridLabels.length);
      // 눈금선 총 개수 계산
      const totalSubUnits = Math.floor(gridInfo.maxValue / gridSize); // 총 눈금선 개수
      const waveSubUnits = (totalSubUnits / mainGridLines) * (mainGridLines - 1); // 줄어든 눈금선 개수
      // console.log("눈금선 총 개수:", totalSubUnits);
      // console.log("웨이브 총 개수:", waveSubUnits);
      // console.log(mainUnit, subUnit);

      // Y축 간격 계산
      const graphHeight = height - margin.top - margin.bottom; // 그래프 높이
      // const yInterval1 = graphHeight / totalSubUnits;
      const yInterval2 = graphHeight / waveSubUnits;

      // 물결선 모드일 때는 새로운 그리드 정보를 사용하여 점 위치 조정
      const waveGridInfo = this.createWaveGridInfo(gridInfo);

      // normalizedData = data.map((value) => (value / waveGridInfo.maxValue) * (height - margin.top - margin.bottom));

      normalizedData = data.map((value) => {
        // 위에서부터 몇 번째 칸인지 계산
        const gridPosition = (waveGridInfo.maxValue - value) / gridSize;

        // 변경된 눈금 한 칸의 크기 (yInterval2)를 곱해서 픽셀 값으로 변환
        const pixelAdjustment = gridPosition * yInterval2;

        // 그래프 높이에서 빼기
        const adjustedHeight = graphHeight - pixelAdjustment;
        // console.log(`값 ${value}: ${gridPosition.toFixed(2)}번째 칸, 조정 후 높이 ${adjustedHeight.toFixed(2)}px`);

        return adjustedHeight;
      });

      // console.log("구분선 개수:", totalSubUnits);
    } else {
      // 일반 모드일 때는 원본 그리드 정보 사용
      normalizedData = data.map((value) => (value / gridInfo.maxValue) * (height - margin.top - margin.bottom));
      // console.log("일반 모드 - 원본 그리드 정보 사용, gridInfo:", gridInfo);
    }

    // 꺾은선 그래프: items 3개 → 공간 4개 (5개 구간)
    pointSpacing = (width - margin.left - margin.right) / (data.length + 1);
    currentStartX = margin.left + pointSpacing;

    // 점 정보 저장 (그려보기 모드에서 사용)
    this.currentDataLength = data.length;
    this.currentPointSpacing = pointSpacing;
    this.currentStartX = currentStartX;

    // === 그래프 영역에 흰색 배경 추가 (가장 먼저) ===
    const graphBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    graphBackground.setAttribute("x", (margin.left + 6).toString());
    graphBackground.setAttribute("y", margin.top.toString());
    graphBackground.setAttribute("width", (width - margin.left - margin.right).toString());
    graphBackground.setAttribute("height", (height - margin.top - margin.bottom).toString());
    graphBackground.setAttribute("fill", "white");
    graphBackground.setAttribute("stroke", "none");
    svg.appendChild(graphBackground);

    // 눈금 생성 (점 생성 이후에 - 점이 제일 위에 보이도록)
    this.createGrid(gridInfo);

    // 꺾은선과 점 생성
    const points: Array<{ x: number; y: number }> = [];

    // 점들의 위치 계산 (1번째 구간부터 시작)
    for (let i = 0; i < data.length; i++) {
      const x = currentStartX + i * pointSpacing;
      const y = height - margin.bottom - normalizedData[i];
      points.push({ x, y });
    }

    // 선 생성 (점들을 연결)
    if (this.isWaveMode) {
      // 물결선 모드일 때 연결선 생성 (wave-line class)
      for (let i = 0; i < points.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", points[i].x.toString());
        line.setAttribute("y1", points[i].y.toString());
        line.setAttribute("x2", points[i + 1].x.toString());
        line.setAttribute("y2", points[i + 1].y.toString());
        line.setAttribute("stroke", "#FFC0E3");
        line.setAttribute("stroke-width", "5");
        line.setAttribute("class", `graph-line-${data.length} wave-line`);
        line.setAttribute("data-index", i.toString());
        svg.appendChild(line);
      }
    } else {
      // 일반 모드일 때 연결선 생성 (og-line class)
      for (let i = 0; i < points.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", points[i].x.toString());
        line.setAttribute("y1", points[i].y.toString());
        line.setAttribute("x2", points[i + 1].x.toString());
        line.setAttribute("y2", points[i + 1].y.toString());
        line.setAttribute("stroke", "#FFC0E3");
        line.setAttribute("stroke-width", "5");
        line.setAttribute("class", `graph-line-${data.length} og-line`);
        line.setAttribute("data-index", i.toString());
        svg.appendChild(line);
      }
    }

    // 구분선 추가 (점 위치에)
    points.forEach((point, index) => {
      const borderLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      borderLine.setAttribute("x1", point.x.toString());
      borderLine.setAttribute("y1", margin.top.toString());
      borderLine.setAttribute("x2", point.x.toString());
      borderLine.setAttribute("y2", (height - margin.bottom).toString());
      borderLine.setAttribute("x2", point.x.toString());
      borderLine.setAttribute("y2", (height - margin.bottom).toString());
      borderLine.setAttribute("stroke", "#F3DFB7");
      borderLine.setAttribute("stroke-width", "2");
      borderLine.setAttribute("class", "border-line");
      borderLine.setAttribute("data-border-index", index.toString());
      borderLine.setAttribute("data-border-x", point.x.toString());
      svg.appendChild(borderLine);
    });
    // 점 생성 (제일 마지막에 그리기 - 모든 요소 위에)
    if (this.isWaveMode) {
      // 물결선 모드일 때 점과 라벨 생성 (wave-dot class)
      points.forEach((point, index) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x.toString());
        circle.setAttribute("cy", point.y.toString());
        circle.setAttribute("r", "4"); // 8px 지름 = 4px 반지름
        circle.setAttribute("fill", "#000000");
        circle.setAttribute("class", `graph-point-${data.length} wave-dot`);
        circle.setAttribute("data-index", index.toString());
        circle.setAttribute("data-value", data[index].toString());
        svg.appendChild(circle);

        // 라벨 생성
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", point.x.toString());
        label.setAttribute("y", (height - margin.bottom + 20).toString());
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", "#333");
        label.setAttribute("font-size", "14");
        label.setAttribute("class", "graph-label");
        label.textContent = labels[index] || `항목${index + 1}`;
        svg.appendChild(label);
      });
    } else {
      // 일반 모드일 때 점과 라벨 생성 (og-dot class)
      points.forEach((point, index) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x.toString());
        circle.setAttribute("cy", point.y.toString());
        circle.setAttribute("r", "4"); // 8px 지름 = 4px 반지름
        circle.setAttribute("fill", "#000000");
        circle.setAttribute("class", `graph-point-${data.length} og-dot`);
        circle.setAttribute("data-index", index.toString());
        circle.setAttribute("data-value", data[index].toString());
        svg.appendChild(circle);

        // 라벨 생성
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", point.x.toString());
        label.setAttribute("y", (height - margin.bottom + 20).toString());
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", "#333");
        label.setAttribute("font-size", "14");
        label.setAttribute("class", "graph-label");
        label.textContent = labels[index] || `항목${index + 1}`;
        svg.appendChild(label);
      });
    }
  }

  private createGrid(gridInfo: { maxValue: number; gridLines: number; gridSize: number }): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    const width = 1100;
    const height = 530;
    const margin = { top: 10, right: 0, bottom: 60, left: 150 };

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

    // 물결선 모드일 때 균등하게 재배치된 구분선 생성
    if (this.isWaveMode) {
      // 남은 구분선들 계산 (삭제할 구분선 제외)
      const remainingGridLines: number[] = [];
      for (let i = 0; i <= gridInfo.maxValue; i += mainUnit) {
        if (i !== mainUnit) {
          remainingGridLines.push(i);
        }
      }
      remainingGridLines.sort((a, b) => a - b);

      // 균등하게 재배치된 구분선 생성
      for (let i = 0; i < remainingGridLines.length; i++) {
        const value = remainingGridLines[i];
        // 균등한 간격으로 위치 계산
        const normalizedPosition = i / (remainingGridLines.length - 1);
        const y = margin.top + (1 - normalizedPosition) * (height - margin.top - margin.bottom);

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
        label.textContent = value.toString();

        mainUnitLabels.push(label);
        svg.appendChild(label);
      }
    } else {
      // 일반 모드일 때 기존 로직
      for (let i = 0; i <= gridInfo.maxValue; i += mainUnit) {
        // 위치 계산 - 모든 요소를 새로운 그리드 정보 기준으로 통일
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
    }

    // 첫 번째와 마지막 라벨에 특별한 클래스 추가
    if (mainUnitLabels.length > 0) {
      mainUnitLabels[0].classList.add("grid-label-first");
      mainUnitLabels[mainUnitLabels.length - 1].classList.add("grid-label-last");
    }

    // 눈금선 생성 (보조 단위, 얇은선)
    if (this.isWaveMode) {
      // 물결선 모드일 때 남은 눈금선들을 균등하게 배치
      const remainingSubUnits: number[] = [];

      // index 1 구분선 값 찾기
      const gridLines: number[] = [];
      for (let i = 0; i <= gridInfo.maxValue; i += mainUnit) {
        gridLines.push(i);
      }
      const index1GridLine = gridLines[1]; // index 1 구분선 값

      // 남은 눈금선들 수집 (index 1 구분선 아래 제외)
      for (let i = 0; i <= gridInfo.maxValue; i += subUnit) {
        if (i % mainUnit !== 0 && !(i < index1GridLine)) {
          remainingSubUnits.push(i);
        }
      }

      // 남은 눈금선들을 균등하게 배치 (구분선 개수에 맞게 동적 조정)
      const remainingGridLines: number[] = [];
      for (let i = 0; i <= gridInfo.maxValue; i += mainUnit) {
        if (i !== index1GridLine) {
          remainingGridLines.push(i);
        }
      }
      remainingGridLines.sort((a, b) => b - a); // 내림차순 정렬

      // 구분선 개수에 맞게 동적 조정
      const segmentCount = remainingGridLines.length - 1;
      const totalSpaces = remainingSubUnits.length + segmentCount; // 총 공간 개수

      // 디버깅용 로그
      // console.log("물결선 모드 눈금선:", remainingSubUnits);
      // console.log("눈금선 개수:", remainingSubUnits.length);
      // console.log("그래프 높이:", height - margin.top - margin.bottom);
      // console.log("눈금선 간격:", (height - margin.top - margin.bottom) / remainingSubUnits.length);
      // console.log("@@@@@@@:", remainingSubUnits.length);

      // 각 구간당 눈금선 개수
      const subUnitsPerSegment = remainingSubUnits.length / segmentCount;

      // 중간 구분선 개수
      const middleGridLinesCount = remainingGridLines.length - 2;
      // console.log("@@@@@@@:", subUnitsPerSegment + middleGridLinesCount);
      let currentIndex = 0;
      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        // 구간의 눈금선들 배치
        // for (let i = 0; i < subUnitsPerSegment; i++) {
        for (let i = 0; i < remainingSubUnits.length; i++) {
          // const position = (currentIndex + 1) / (remainingSubUnits.length + 1);
          // const y = margin.top + position * (height - margin.top - margin.bottom);
          const position = (currentIndex + 1) / (remainingGridLines[1] / subUnit);
          const y = Math.max(margin.top, Math.min(height - margin.bottom, margin.top + position * (height - margin.top - margin.bottom)));

          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", (margin.left + 6).toString());
          line.setAttribute("y1", y.toString());
          line.setAttribute("x2", (width - margin.right + 6).toString());
          line.setAttribute("y2", y.toString());
          line.setAttribute("stroke", "#C2F4FF");
          line.setAttribute("stroke-width", "1");

          svg.appendChild(line);
          currentIndex++;
        }
      }
    } else {
      // 일반 모드일 때 기존 로직
      for (let i = 0; i <= gridInfo.maxValue; i += subUnit) {
        // 구분선과 겹치지 않도록 건너뛰기
        if (i % mainUnit === 0) {
          continue;
        }

        // 위치 계산 - 모든 요소를 새로운 그리드 정보 기준으로 통일
        const y = margin.top + ((gridInfo.maxValue - i) / gridInfo.maxValue) * (height - margin.top - margin.bottom);

        const normalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        normalLine.setAttribute("x1", (margin.left + 6).toString());
        normalLine.setAttribute("y1", y.toString());
        normalLine.setAttribute("x2", (width - margin.right + 6).toString());
        normalLine.setAttribute("y2", y.toString());
        normalLine.setAttribute("stroke", "#C2F4FF");
        normalLine.setAttribute("stroke-width", "1");

        svg.appendChild(normalLine);
      }
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

  public toggleGraphLines(): void {
    const lines = document.querySelectorAll(`.graph-line-${this.currentDataLength}`);
    const points = document.querySelectorAll(`.graph-point-${this.currentDataLength}`);
    const customLines = document.querySelectorAll(".custom-graph-line");
    const customPoints = document.querySelectorAll(".custom-graph-point");

    if (this.isGraphHidden) {
      // 원본 선과 점 보이기, 커스텀 선과 점 숨기기
      lines.forEach((line) => {
        line.classList.remove("hidden");
      });
      points.forEach((point) => {
        point.classList.remove("hidden");
      });
      customLines.forEach((line) => {
        line.classList.add("hidden");
      });
      customPoints.forEach((point) => {
        point.classList.add("hidden");
      });
      this.isGraphHidden = false;
    } else {
      // 원본 선과 점 숨기기, 커스텀 선과 점 보이기
      lines.forEach((line) => {
        line.classList.add("hidden");
      });
      points.forEach((point) => {
        point.classList.add("hidden");
      });
      customLines.forEach((line) => {
        line.classList.remove("hidden");
      });
      customPoints.forEach((point) => {
        point.classList.remove("hidden");
      });
      this.isGraphHidden = true;
    }
  }

  // 커스텀 점과 선 숨기기
  public hideCustomPoints(): void {
    const customLines = document.querySelectorAll(".custom-graph-line");
    const customPoints = document.querySelectorAll(".custom-graph-point");
    customLines.forEach((line) => {
      line.remove();
    });
    customPoints.forEach((point) => {
      point.remove();
    });
  }

  public reset(): void {
    this.isGraphHidden = false;
    this.isDrawMode = false;
    this.hideCustomPoints(); // 커스텀 점과 선 제거
    this.removeDrawMode(); // 그려보기 모드 제거

    // 물결선 모드 관련 데이터 초기화
    this.originalData = [];
    this.originalLabels = [];
    this.originalGridInfo = null;
    this.isWaveMode = false;
  }

  // 그려보기 모드 토글
  public toggleDrawMode(): void {
    this.isDrawMode = !this.isDrawMode;

    if (this.isDrawMode) {
      this.setupDrawMode();
    } else {
      this.removeDrawMode();
      // 커스텀 점과 선은 유지 (뒤로가기나 그래프 선택할 때만 초기화)
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

    // SVG 좌표 변환을 위한 설정 (반응형 대응)
    const svgElement = svg as unknown as SVGSVGElement;
    const rect = svgElement.getBoundingClientRect();

    // 클릭 위치를 SVG 내부 좌표로 변환
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // SVG의 viewBox와 실제 크기 비율 계산
    const viewBox = svgElement.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    // 실제 SVG 좌표로 변환
    const scaledClickX = clickX * scaleX;
    const scaledClickY = clickY * scaleY;

    // 클릭한 Y 위치를 밸류값으로 사용 (0~1000 범위로 정규화)
    const height = 530;
    const margin = { top: 10, right: 0, bottom: 60, left: 150 };
    const graphHeight = height - margin.top - margin.bottom;

    // 흰색 배경 영역과 정확히 일치하는 클릭 감지 영역 설정
    const graphStartX = margin.left + 6; // 흰색 배경 시작 X
    const graphEndX = 1100 - margin.right + 6; // 흰색 배경 끝 X
    const graphStartY = margin.top; // 흰색 배경 시작 Y
    const graphEndY = height - margin.bottom; // 흰색 배경 끝 Y

    // 클릭한 위치가 흰색 배경 영역 안에 있는지 확인
    if (scaledClickX < graphStartX || scaledClickX > graphEndX || scaledClickY < graphStartY || scaledClickY > graphEndY) {
      return;
    }

    // 그래프 영역 내에서의 상대적 위치 계산 (0~1)
    const relativeY = (scaledClickY - margin.top) / graphHeight;
    // 0~1을 1000~0으로 변환 (위쪽이 큰 값)
    const value = Math.round((1 - relativeY) * 1000);

    const finalValue = Math.max(0, Math.min(1000, value));

    // 경계선을 확인하여 클릭한 X 위치에 해당하는 경계선 인덱스 찾기
    const borderLines = document.querySelectorAll(".border-line");

    let borderIndex = -1;
    let targetBorderX = 0;

    for (let i = 0; i < borderLines.length; i++) {
      const borderLine = borderLines[i];
      const borderX = parseFloat(borderLine.getAttribute("data-border-x") || "0");
      const actualIndex = parseInt(borderLine.getAttribute("data-border-index") || "0");

      // 클릭 감지 영역: 경계선 기준 좌우 ±35px
      const clickArea = 35;
      if (Math.abs(scaledClickX - borderX) <= clickArea) {
        borderIndex = actualIndex;
        targetBorderX = borderX;
        break;
      }
    }

    if (borderIndex !== -1) {
      this.createCustomPoint(borderIndex, finalValue, targetBorderX, scaledClickY);
    }
  }

  // 커스텀 선 업데이트
  private updateCustomLines(): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    // 기존 커스텀 선들 제거
    const existingLines = svg.querySelectorAll(".custom-graph-line");
    existingLines.forEach((line) => {
      line.remove();
    });

    // 기존 커스텀 점들의 정보를 저장
    const customPoints = svg.querySelectorAll(".custom-graph-point");
    const pointsInfo: Array<{ x: number; y: number; index: number; value: number }> = [];

    customPoints.forEach((point) => {
      const x = parseFloat(point.getAttribute("cx") || "0");
      const y = parseFloat(point.getAttribute("cy") || "0");
      const index = parseInt(point.getAttribute("data-custom-border-index") || "0");
      const value = parseInt(point.getAttribute("data-value") || "0");
      pointsInfo.push({ x, y, index, value });
    });

    // 기존 커스텀 점들 모두 제거
    customPoints.forEach((point) => {
      point.remove();
    });

    // 점들을 x 좌표로 정렬
    pointsInfo.sort((a, b) => a.x - b.x);

    // 선 생성 (점들을 연결)
    for (let i = 0; i < pointsInfo.length - 1; i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", pointsInfo[i].x.toString());
      line.setAttribute("y1", pointsInfo[i].y.toString());
      line.setAttribute("x2", pointsInfo[i + 1].x.toString());
      line.setAttribute("y2", pointsInfo[i + 1].y.toString());
      line.setAttribute("stroke", "#4A90E2");
      line.setAttribute("stroke-width", "5");
      line.setAttribute("class", "custom-graph-line");
      svg.appendChild(line);
    }

    // 선 생성 후 점들을 다시 생성 (점이 선 위에 그려짐)
    pointsInfo.forEach((pointInfo) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pointInfo.x.toString());
      circle.setAttribute("cy", pointInfo.y.toString());
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", "#000000");
      circle.setAttribute("class", "custom-graph-point");
      circle.setAttribute("data-custom-border-index", pointInfo.index.toString());
      circle.setAttribute("data-value", pointInfo.value.toString());
      svg.appendChild(circle);
    });
  }

  // 커스텀 점 생성
  private createCustomPoint(index: number, value: number, x: number, y: number): void {
    const svg = document.getElementById("graphSvg");
    if (!svg) return;

    // 기존 커스텀 점과 선 제거 (같은 경계선 인덱스)
    const existingPoint = svg.querySelector(`[data-custom-border-index="${index}"]`);
    if (existingPoint) {
      existingPoint.remove();
    }

    // 새로운 커스텀 점 생성
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x.toString());
    circle.setAttribute("cy", y.toString());
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "#000000");
    circle.setAttribute("class", "custom-graph-point");
    circle.setAttribute("data-custom-border-index", index.toString());
    circle.setAttribute("data-value", value.toString());

    svg.appendChild(circle);

    // 연결된 선들도 업데이트
    this.updateCustomLines();
  }

  // 물결선 모드 토글
  public toggleWaveMode(): void {
    console.log("물결선 버튼 클릭됨!");

    // 물결선 모드일 때는 기존 구분선 개수(4개)를 기준으로 조건 확인
    // 일반 모드일 때는 현재 구분선 개수로 조건 확인
    let shouldCheckCondition = false;

    if (this.isWaveMode) {
      // 물결선 모드일 때: 원본 데이터로 조건 재확인
      shouldCheckCondition = true;
    } else {
      // 일반 모드일 때: 현재 구분선 개수로 조건 확인
      const gridLabels = document.querySelectorAll(".grid-label");
      shouldCheckCondition = gridLabels.length >= 4;
    }

    if (shouldCheckCondition) {
      // 구분선 라벨들의 값들을 가져와서 waveData로 사용
      let gridLabelValues: number[] = [];

      if (this.isWaveMode) {
        // 물결선 모드일 때: 원본 그리드 정보로 계산
        if (this.originalGridInfo) {
          const mainUnit =
            this.originalGridInfo.maxValue <= 100 ? 10 : this.originalGridInfo.maxValue <= 200 ? 20 : this.originalGridInfo.maxValue <= 400 ? 50 : 100;

          for (let i = 0; i <= this.originalGridInfo.maxValue; i += mainUnit) {
            gridLabelValues.push(i);
          }
        }
      } else {
        // 일반 모드일 때: 현재 DOM에서 구분선 값 가져오기
        const gridLabels = document.querySelectorAll(".grid-label");
        gridLabels.forEach((label: Element) => {
          const value = parseInt(label.textContent || "0");
          gridLabelValues.push(value);
        });
      }

      // items 밸류값 중 제일 낮은 값 찾기
      const minValue = Math.min(...this.originalData);
      // console.log("items 최소값:", minValue);

      // index 2 값과 최소값 비교
      if (gridLabelValues[2] <= minValue) {
        // 조건이 만족되면 물결선 모드 토글
        this.isWaveMode = !this.isWaveMode;

        if (this.isWaveMode) {
          this.renderWaveGraph();
        } else {
          this.renderOriginalGraph();
        }
      } else {
        this.isWaveMode = false;
        this.renderOriginalGraph();
      }
    } else {
      this.isWaveMode = false;
      this.renderOriginalGraph();
    }
  }

  // 물결선 그래프 렌더링
  private renderWaveGraph(): void {
    // console.log("물결선 그래프 렌더링");
    if (!this.originalGridInfo) return;

    // SVG에 wave-mode class 추가
    const graphSvg = document.getElementById("graphSvg");
    if (graphSvg) {
      graphSvg.classList.add("wave-mode");
    }

    // 기존 그래프 요소들은 그대로 두고, 물결선 모드로 전환
    // createSVGGraph를 다시 호출하면 this.isWaveMode 상태에 따라 물결선 모드로 렌더링됨
    this.createSVGGraph(this.originalData, this.originalLabels, this.originalGridInfo);
  }

  // 원본 그래프 렌더링
  private renderOriginalGraph(): void {
    // console.log("원본 그래프 렌더링");
    if (!this.originalGridInfo) return;

    // SVG에서 wave-mode class 제거
    const graphSvg = document.getElementById("graphSvg");
    if (graphSvg) {
      graphSvg.classList.remove("wave-mode");
    }

    // 기존 그래프 요소들은 그대로 두고, 원본 모드로 전환
    // createSVGGraph를 다시 호출하면 this.isWaveMode 상태에 따라 원본 모드로 렌더링됨
    this.createSVGGraph(this.originalData, this.originalLabels, this.originalGridInfo);
  }

  // 꺾은선 그래프 진입 시 물결선 모드 조건 확인 (실제 모드 변경 없이 조건만 확인)
  private checkWaveModeCondition(): void {
    console.log("=== 꺾은선 그래프 진입 시 물결선 모드 조건 확인 ===");

    // 구분선 개수 확인
    const gridLabels = document.querySelectorAll(".grid-label");
    const shouldCheckCondition = gridLabels.length >= 4;

    if (shouldCheckCondition) {
      // 구분선 라벨들의 값들을 가져오기
      let gridLabelValues: number[] = [];

      // 일반 모드일 때: 현재 DOM에서 구분선 값 가져오기
      gridLabels.forEach((label: Element) => {
        const value = parseInt(label.textContent || "0");
        gridLabelValues.push(value);
      });

      // items 밸류값 중 제일 낮은 값 찾기
      const minValue = Math.min(...this.originalData);
      // index 2 값과 최소값 비교
      const conditionResult = gridLabelValues[2] <= minValue;

      if (conditionResult) {
        console.log("✅ 물결선 모드 조건이 만족됩니다.");
        // 조건이 만족되면 disabled 클래스 제거
        const waveButton = document.querySelector(".btn-wave") as HTMLElement;
        if (waveButton) {
          waveButton.classList.remove("disabled");
        }
      } else {
        console.log("❌ 물결선 모드 조건이 만족되지 않습니다.");
        // 조건이 만족되지 않으면 disabled 클래스 추가
        const waveButton = document.querySelector(".btn-wave") as HTMLElement;
        if (waveButton) {
          waveButton.classList.add("disabledKeep");
        }
      }
    } else {
      console.log("❌ 구분선이 4개 미만이어서 물결선 모드 조건을 확인할 수 없습니다.");
    }
  }

  // 물결선 모드용 그리드 정보 생성
  private createWaveGridInfo(originalGridInfo: { maxValue: number; gridLines: number; gridSize: number }): {
    maxValue: number;
    gridLines: number;
    gridSize: number;
  } {
    // mainUnit 계산
    let mainUnit: number;
    if (originalGridInfo.maxValue <= 100) {
      mainUnit = 10;
    } else if (originalGridInfo.maxValue <= 200) {
      mainUnit = 20;
    } else if (originalGridInfo.maxValue <= 400) {
      mainUnit = 50;
    } else if (originalGridInfo.maxValue <= 800) {
      mainUnit = 100;
    } else {
      mainUnit = 100;
    }

    // 남은 구분선들 계산 (삭제할 구분선 제외)
    const remainingGridLines: number[] = [];

    for (let i = 0; i <= originalGridInfo.maxValue; i += mainUnit) {
      if (i !== mainUnit) {
        // 10 구분선 제외
        remainingGridLines.push(i);
      }
    }
    remainingGridLines.sort((a, b) => a - b); // 오름차순 정렬

    // 새로운 그리드 정보 생성 - 물결선 모드에서는 maxValue는 유지
    // 10 구분선만 제거하고, 점 위치 계산은 원본 maxValue 사용
    const newMaxValue = originalGridInfo.maxValue; // 점 위치 계산용으로는 원본 maxValue 유지
    const newGridLines = remainingGridLines.length;

    // 균등한 간격으로 재배치하기 위한 새로운 그리드 크기 계산
    // 전체 구분선 개수에서 균등하게 나누기
    const newGridSize = newMaxValue / (newGridLines - 1);

    return {
      maxValue: newMaxValue,
      gridLines: newGridLines,
      gridSize: newGridSize,
    };
  }
}

