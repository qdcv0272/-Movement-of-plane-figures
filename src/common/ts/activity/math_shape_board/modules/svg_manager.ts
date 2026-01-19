import gsap from "gsap";
import SoundManager from "@ts/module/audio/sound_manager";
import { PolygonsManager } from "./polygons_manager";

interface Dot {
  cx: number;
  cy: number;
  element: SVGCircleElement;
}

interface DrawnLine {
  element: SVGLineElement;
  start: Dot;
  end: Dot;
}

export class SvgShapeBoardManager {
  // 기본 설정값들
  private svg: SVGSVGElement | null;
  private dotRadius = 8;
  private spacing = 74.5;
  private leftOffset = 14.7;
  private topOffset = 12.7;

  // 점과 선 관리
  private dots: Dot[] = [];
  private selectedDots: Dot[] = [];
  private drawnLines: DrawnLine[] = [];
  private dotsGroup: SVGGElement | null = null; // dots를 감싸는 g 태그

  // 그리기 상태 관리
  private isDrawing: boolean = false;
  private startDot: Dot | null = null;
  private previewLine: SVGLineElement | null = null;
  private previewCircle: SVGCircleElement | null = null;
  private currentColor: string = "black";

  // 도형 색상
  private polygonColorMap: Map<string, string> = new Map();

  // 다각형 관리자
  private polygonsManager: PolygonsManager;

  // 정사각형 모드용
  private squareRects: SVGRectElement[] = [];
  private squareLines: SVGLineElement[] = [];

  private bindClick: EventListener;

  // 모드 버튼들 (선, 색칠, 정사각형)
  private modeList: any[];

  // 실제 모드 버튼 요소들
  private line: any;
  private paint: any;
  private square: any;

  // 색상 버튼들
  private colors: any[];

  constructor(svgId: string = "svgCanvas") {
    this.svg = document.getElementById(svgId) as SVGSVGElement | null;
    this.initDots();

    // 다각형 관리자 초기화
    this.polygonsManager = new PolygonsManager(this.svg, this.drawnLines, this.polygonColorMap, this.currentColor);

    this.bindClick = this.hnClick.bind(this);

    this.setPaintbucket();
    this.setMakeMode();

    // 페이지 로드 후 초기 설정
    setTimeout(() => {
      const activeModeBtn = this.modeList
        .map((mode) => document.querySelector(`.${mode}-mode`) as HTMLElement)
        .find((el) => el && el.classList.contains("active"));
      if (activeModeBtn) {
        const color = this.getCurrentStrokeColor();
        activeModeBtn.style.background = color; // 활성 버튼에 색상 적용
        activeModeBtn.style.color = "#fff";
      }
      this.checkBtnOkActive();
    }, 0);

    // 전체 초기화 버튼 설정
    const resetBtn = document.querySelector(".reset-all");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        SoundManager.play("button");
        this.clearAllLines();
      });
    }
  }

  /**
   * 모든 버튼 클릭을 처리하는 메인 핸들러
   * - 색상 버튼 클릭: 현재 색상 변경 및 활성 모드 버튼 스타일 반영
   * - 모드 버튼 클릭: 선/색칠/정사각형 모드 전환 및 각 모드별 초기화/렌더링 로직 수행
   */
  private hnClick(event: Event): void {
    const e = event as PointerEvent;
    const btn = e.target as IButton;
    const btnType = btn.btnType;

    SoundManager.play("button");

    // 색상 버튼이 클릭된 경우
    if (this.colors.includes(btnType)) {
      // 모든 색상 버튼의 active 상태 제거
      this.colors.forEach((color) => {
        const el = document.querySelector(`.color-${color}`) as HTMLElement;
        if (el) {
          el.classList.remove("active");
        }
      });
      btn.classList.add("active");
      this.currentColor = btnType;

      this.polygonsManager.updateCurrentColor(this.currentColor);

      const activeModeBtn = this.modeList
        .map((mode) => document.querySelector(`.${mode}-mode`) as HTMLElement)
        .find((el) => el && el.classList.contains("active"));
      if (activeModeBtn) {
        const color = this.getCurrentStrokeColor();
        activeModeBtn.style.background = color;
        activeModeBtn.style.color = "#fff";
      }
      return;
    }

    // 모드 버튼이 클릭된 경우 (선, 색칠, 정사각형)
    if (this.modeList.includes(btnType)) {
      this.modeList.forEach((mode) => {
        const el = document.querySelector(`.${mode}-mode`) as HTMLElement;
        if (el) {
          el.classList.remove("active");
          el.style.background = "";
          el.style.color = "";
        }
      });
      btn.classList.add("active"); // 클릭된 모드 버튼만 활성화

      const color = this.getCurrentStrokeColor();
      (btn as HTMLElement).style.background = color;
      (btn as HTMLElement).style.color = "#fff";

      if (btnType === "paint") {
        this.clearSquareMode();
        this.polygonsManager.updateDrawnLines(this.drawnLines);
        this.polygonsManager.findAndDrawPolygons();
        this.sortSvgElements();
        // this.rectNone();
      } else if (btnType === "line") {
        this.clearSquareMode();
        this.rectNone();
      } else if (btnType === "square") {
        this.drawAllSquares();
        this.rectAuto();
      }
      return;
    }
  }

  // 완료 버튼 활성화 여부 체크(그림이 있으면 활성화)
  public checkBtnOkActive() {
    const btnOk = document.querySelector(".btn-ok");
    const svg = this.svg;
    if (!btnOk || !svg) return;

    // 색이 있는 다각형이 있는지 체크
    const polygons = Array.from(svg.querySelectorAll("polygon"));
    const hasColoredPolygon = polygons.some((polygon) => {
      const fill = polygon.getAttribute("fill");
      return fill && fill !== "transparent" && fill !== "none";
    });

    // 색칠된 사각형이 있는지 체크
    const rects = Array.from(svg.querySelectorAll("rect"));
    const hasColoredRect = rects.some((rect) => {
      const fill = rect.getAttribute("fill");
      return fill && fill !== "transparent" && fill !== "none";
    });

    // 색이 있는 선이 있는지 체크
    const lines = Array.from(svg.querySelectorAll("line"));
    const hasColoredLine = lines.some((line) => {
      const stroke = line.getAttribute("stroke");
      return stroke && stroke !== "transparent" && stroke !== "none";
    });

    hasColoredPolygon || hasColoredRect || hasColoredLine ? btnOk.classList.remove("dim") : btnOk.classList.add("dim");
  }

  // ============================== dot 관련 ==============================

  /**
   * 격자 점들을 생성하고 드로잉에 필요한 포인터 이벤트를 바인딩
   * - 6x6 점 생성, pointerdown 시 드로잉 시작 및 미리보기 선/원 생성
   * - SVG에 pointerup/move/leave 핸들러 등록
   */
  private initDots(): void {
    if (!this.svg) return;
    const N = 6;

    // dots를 감싸는 g 태그 생성
    this.dotsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.dotsGroup.setAttribute("class", "dots");

    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const cx = this.leftOffset + col * this.spacing;
        const cy = this.topOffset + row * this.spacing;

        const circle = this.createSvgCircle(cx, cy, this.dotRadius);
        circle.dataset.index = this.dots.length.toString();
        this.dotsGroup.appendChild(circle); // svg 대신 dotsGroup에 추가
        this.dots.push({ cx, cy, element: circle });
      }
    }

    // g 태그를 svg에 추가
    this.svg.appendChild(this.dotsGroup);

    this.dots.forEach((dot) => {
      // 모바일/태블릿 호환성을 위해 pointerdown 사용
      dot.element.addEventListener("pointerdown", (e: PointerEvent) => {
        e.preventDefault();
        if (!this.isLineModeActive) return;
        if (this.isDrawing) return;
        this.isDrawing = true;
        this.startDot = dot;
        this.selectedDots.push(dot);

        const dotItem = dot.element;
        // 현재 선택된 색상 코드를 가져오기 (active 상태에 적용)
        const strokeColor = this.getCurrentStrokeColor();
        dotItem.style.fill = strokeColor;
        dotItem.classList.add("active");

        this.animateDot(dotItem, this.dotRadius * 1.5);

        // 미리보기 선 생성
        this.previewLine = this.createSvgLine(dot.cx, dot.cy, dot.cx, dot.cy);
        this.svg!.appendChild(this.previewLine);

        // 미리보기 원 생성 (현재 선택된 색상으로 표시)
        this.previewCircle = this.createSvgCircle(dot.cx, dot.cy, this.dotRadius * 1.5, {
          opacity: "0.7",
          className: "active",
        });

        this.previewCircle.style.fill = strokeColor;
        this.svg!.appendChild(this.previewCircle);
      });
    });

    this.svg.addEventListener("pointerup", (e: PointerEvent) => this.onPointerUp(e));
    this.svg.addEventListener("pointermove", (e: PointerEvent) => this.onPointerMove(e));
    // SVG 영역 바깥으로 포인터가 나가면 드래그 종료
    this.svg.addEventListener("pointerleave", () => this.endDrag());
  }

  private createSvgCircle(
    cx: number,
    cy: number,
    radius: number,
    options?: {
      fill?: string;
      opacity?: string;
      className?: string;
    }
  ): SVGCircleElement {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    // 기본 속성 설정
    circle.setAttribute("cx", cx.toString());
    circle.setAttribute("cy", cy.toString());
    circle.setAttribute("r", radius.toString());

    // 옵션 속성 적용
    if (options) {
      if (options.fill) circle.setAttribute("fill", options.fill);
      if (options.opacity) circle.setAttribute("opacity", options.opacity);
      if (options.className) circle.classList.add(options.className);
    }

    return circle;
  }

  private animateDot(dot: SVGCircleElement, targetRadius: number, duration: number = 0.3): void {
    const tl = gsap.timeline();
    gsap.killTweensOf(tl);

    const currentRadius = parseFloat(dot.getAttribute("r") || "0");
    const isExpanding = targetRadius > currentRadius;

    if (isExpanding) {
      // dotsGroup의 맨 마지막 위치로 이동 (맨 위에 보이도록)
      if (this.dotsGroup && dot.parentNode === this.dotsGroup) {
        this.dotsGroup.appendChild(dot);
      }
    } else {
      // data-index 순서에 맞는 원래 위치로 복원
      this.restoreDotToOriginalPosition(dot);
    }

    tl.to(dot, {
      duration: duration,
      attr: { r: targetRadius },
      ease: "power2.out",
    });
  }

  private restoreDotToOriginalPosition(dot: SVGCircleElement): void {
    if (!this.dotsGroup) return;

    const dotIndex = parseInt(dot.dataset.index || "0");
    const allCircles = Array.from(this.dotsGroup.querySelectorAll("circle"));

    // data-index를 기준으로 정렬
    const sortedCircles = allCircles
      .filter((circle) => circle.dataset.index !== undefined)
      .sort((a, b) => {
        const indexA = parseInt(a.dataset.index || "0");
        const indexB = parseInt(b.dataset.index || "0");
        return indexA - indexB;
      });

    // 현재 dot의 올바른 위치 찾기
    const targetIndex = sortedCircles.findIndex((circle) => parseInt(circle.dataset.index || "0") === dotIndex);

    if (targetIndex === -1) return;

    // 올바른 위치에 삽입
    if (targetIndex === 0) {
      // 첫 번째 위치
      const firstElement = this.dotsGroup.firstChild;
      if (firstElement && firstElement !== dot) {
        this.dotsGroup.insertBefore(dot, firstElement);
      }
    } else {
      // 이전 점 다음 위치에 삽입
      const prevDot = sortedCircles[targetIndex - 1];
      if (prevDot && prevDot.nextSibling !== dot) {
        this.dotsGroup.insertBefore(dot, prevDot.nextSibling);
      }
    }
  }
  // ============================== dot 관련 ==============================

  // ============================== drag 관련 ==============================
  /**
   * 포인터를 떼었을 때의 처리
   * - 근처 점 찾기 → 새 선 추가 또는 기존 선 색 변경 → 드래그 종료
   */
  private onPointerUp(e: PointerEvent): void {
    if (!this.svg) return;

    if (!this.isLineModeActive) {
      this.endDrag();
      return;
    }
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());

    const threshold = 10;
    const endDot = this.dots.find((dot) => {
      const dx = dot.cx - svgP.x;
      const dy = dot.cy - svgP.y;
      return Math.sqrt(dx * dx + dy * dy) <= threshold;
    });

    if (!endDot || !this.isDrawing || !this.startDot) {
      this.endDrag();
      return;
    }

    if (endDot) {
      if (this.selectedDots.length === 0 || this.selectedDots[this.selectedDots.length - 1] !== endDot) {
        const currentStartDot = this.selectedDots.length > 0 ? this.selectedDots[this.selectedDots.length - 1] : this.startDot;
        if (!currentStartDot) {
          this.endDrag();
          return;
        }
        const isDuplicate = this.drawnLines.some((line) => {
          return (line.start === currentStartDot && line.end === endDot) || (line.start === endDot && line.end === currentStartDot);
        });
        if (!isDuplicate) {
          this.drawLine(currentStartDot, endDot);
          this.selectedDots.push(endDot);
        } else {
          this.changeLineColor(currentStartDot, endDot);
        }
      }
    }
    this.endDrag();
  }

  /**
   * 포인터 이동 중 처리
   * - 미리보기 선/원 좌표 업데이트
   * - 점에 근접 시 자동 연결, 아니면 선 위 가까운 점을 찾아 자동 연결
   */
  private onPointerMove(e: PointerEvent): void {
    if (!this.svg) return;

    if (!this.isLineModeActive) return;

    // 그리기 중이고 미리보기 선이 있을 때만 처리
    if (this.isDrawing && this.previewLine) {
      // SVG 뷰포트(rect) 밖으로 벗어나면 드래그 종료
      const rect = this.svg.getBoundingClientRect();
      const isOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      if (isOutside) {
        this.endDrag();
        return;
      }

      // 1) 마우스/터치 좌표를 SVG 좌표로 변환
      const pt = this.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = this.svg.getScreenCTM();
      if (!ctm) return;
      const svgP = pt.matrixTransform(ctm.inverse());

      // 2) 미리보기 선의 끝점을 마우스 위치로 업데이트
      this.previewLine.setAttribute("x2", svgP.x.toString());
      this.previewLine.setAttribute("y2", svgP.y.toString());

      // 3) 미리보기 circle 위치 업데이트 (마우스 커서 따라다니는 circle)
      if (this.previewCircle) {
        this.previewCircle.setAttribute("cx", svgP.x.toString());
        this.previewCircle.setAttribute("cy", svgP.y.toString());
      }

      //   **************************** 점근처 가면 자동연결 피드백에서 뺌 ****************************

      // // 4): 마우스가 점 근처에 있는지 확인 (자동 연결용)
      // const threshold = 10; // 점과의 거리 임계값 (픽셀)
      // const endDot = this.dots.find((dot) => {
      //   const dx = dot.cx - svgP.x;
      //   const dy = dot.cy - svgP.y;
      //   return Math.sqrt(dx * dx + dy * dy) <= threshold;
      // });

      // // 5) 마우스가 점 근처에 없는 경우 (선 위의 다른 점 찾기)
      // if (!endDot) {
      //   const currentStartDot = this.selectedDots.length > 0 ? this.selectedDots[this.selectedDots.length - 1] : this.startDot;
      //   if (!currentStartDot) return;

      //   // 현재 미리보기 선의 시작점 좌표
      //   const lineStartX = parseFloat(this.previewLine.getAttribute("x1")!);
      //   const lineStartY = parseFloat(this.previewLine.getAttribute("y1")!);

      //   // 모든 점들을 확인해서 선 위에 있는 점 찾기
      //   for (const dot of this.dots) {
      //     if (this.selectedDots.includes(dot)) continue; // 이미 선택된 점은 건너뛰기

      //     // 점에서 선까지의 최단 거리 계산
      //     const distance = SvgShapeBoardManager.getDistanceToLine(
      //       { x: lineStartX, y: lineStartY }, // 선 시작점
      //       { x: svgP.x, y: svgP.y }, // 선 끝점 (마우스 위치)
      //       { x: dot.cx, y: dot.cy } // 확인할 점
      //     );

      //     // 점이 선 근처에 있으면 자동 연결
      //     if (distance <= threshold) {
      //       // 이미 그려진 선인지 확인 (중복 방지)
      //       const isDuplicate = this.drawnLines.some((line) => {
      //         return (line.start === currentStartDot && line.end === dot) || (line.start === dot && line.end === currentStartDot);
      //       });

      //       if (!isDuplicate) {
      //         // 새로운 선 그리기
      //         this.drawLine(currentStartDot, dot);
      //         this.selectedDots.push(dot);
      //         // 미리보기 선을 새로 연결된 점으로 이동
      //         this.previewLine.setAttribute("x1", dot.cx.toString());
      //         this.previewLine.setAttribute("y1", dot.cy.toString());
      //         this.previewLine.setAttribute("x2", dot.cx.toString());
      //         this.previewLine.setAttribute("y2", dot.cy.toString());
      //       } else {
      //         // 이미 있는 선의 색상 변경
      //         this.changeLineColor(currentStartDot, dot);
      //         this.selectedDots.push(dot);
      //         // 미리보기 선을 새로 연결된 점으로 이동
      //         this.previewLine.setAttribute("x1", dot.cx.toString());
      //         this.previewLine.setAttribute("y1", dot.cy.toString());
      //         this.previewLine.setAttribute("x2", dot.cx.toString());
      //         this.previewLine.setAttribute("y2", dot.cy.toString());
      //       }
      //       break; // 첫 번째로 찾은 점만 처리
      //     }
      //   }
      // }
      // // 6): 마우스가 점 근처에 있는 경우 (직접 점에 연결)
      // else if (endDot && (!this.selectedDots.length || this.selectedDots[this.selectedDots.length - 1] !== endDot)) {
      //   const currentStartDot = this.selectedDots.length > 0 ? this.selectedDots[this.selectedDots.length - 1] : this.startDot;
      //   if (!currentStartDot) return;

      //   // 이미 그려진 선인지 확인 (중복 방지)
      //   const isDuplicate = this.drawnLines.some((line) => {
      //     return (line.start === currentStartDot && line.end === endDot) || (line.start === endDot && line.end === currentStartDot);
      //   });

      //   if (!isDuplicate) {
      //     // 새로운 선 그리기
      //     this.drawLine(currentStartDot, endDot);
      //     this.selectedDots.push(endDot);
      //     // 미리보기 선을 새로 연결된 점으로 이동
      //     this.previewLine.setAttribute("x1", endDot.cx.toString());
      //     this.previewLine.setAttribute("y1", endDot.cy.toString());
      //     this.previewLine.setAttribute("x2", endDot.cx.toString());
      //     this.previewLine.setAttribute("y2", endDot.cy.toString());
      //   } else {
      //     // 이미 있는 선의 색상 변경
      //     this.changeLineColor(currentStartDot, endDot);
      //     this.selectedDots.push(endDot);
      //     // 미리보기 선을 새로 연결된 점으로 이동
      //     this.previewLine.setAttribute("x1", endDot.cx.toString());
      //     this.previewLine.setAttribute("y1", endDot.cy.toString());
      //     this.previewLine.setAttribute("x2", endDot.cx.toString());
      //     this.previewLine.setAttribute("y2", endDot.cy.toString());
      //   }
      // }

      //  /**
      //  * 점에서 선(직선)까지의 최단 거리 계산
      //  * - 선 그리기 중 자동 연결 판정에 사용
      //  */
      // private static getDistanceToLine(lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }, point: { x: number; y: number }): number {
      //   const A = point.x - lineStart.x;
      //   const B = point.y - lineStart.y;
      //   const C = lineEnd.x - lineStart.x;
      //   const D = lineEnd.y - lineStart.y;

      //   const dot = A * C + B * D; // 내적 계산
      //   const lenSq = C * C + D * D; // 선 길이의 제곱

      //   // 특별한 경우: 선의 길이가 0 (점과 점이 같은 경우)
      //   if (lenSq === 0) {
      //     return Math.sqrt(A * A + B * B); // 점과 점 사이의 거리
      //   }

      //   // 선 위에서 점과 가장 가까운 지점 찾기
      //   const param = dot / lenSq;
      //   let xx: number, yy: number;

      //   if (param < 0) {
      //     // 시작점이 가장 가까운 경우
      //     xx = lineStart.x;
      //     yy = lineStart.y;
      //   } else if (param > 1) {
      //     // 끝점이 가장 가까운 경우
      //     xx = lineEnd.x;
      //     yy = lineEnd.y;
      //   } else {
      //     // 선 위의 어떤 점이 가장 가까운 경우
      //     xx = lineStart.x + param * C;
      //     yy = lineStart.y + param * D;
      //   }

      //   // 점과 가장 가까운 지점 사이의 거리 계산
      //   const dx = point.x - xx;
      //   const dy = point.y - yy;
      //   return Math.sqrt(dx * dx + dy * dy); // 최종 거리
      // }

      //    **************************** 점근처 가면 자동연결 피드백에서 뺌 ****************************
    }
  }

  /**
   * 드래그 종료 공통 처리
   * - 미리보기 선/원 제거, 점 상태 복원, 요소 순서 정리 및 완료 버튼 갱신
   */
  private endDrag(): void {
    this.isDrawing = false;
    this.startDot = null;
    if (this.previewLine && this.svg) {
      this.svg.removeChild(this.previewLine);
      this.previewLine = null;
    }

    if (this.previewCircle && this.svg) {
      this.svg.removeChild(this.previewCircle);
      this.previewCircle = null;
    }
    this.selectedDots = [];
    this.dots.forEach((dot) => {
      const dotItem = dot.element;
      // active 상태에서 적용했던 inline fill 해제
      dotItem.style.removeProperty("fill");
      dotItem.setAttribute("fill", "#000000");
      dotItem.classList.remove("active");

      this.animateDot(dotItem, this.dotRadius);
    });

    this.checkBtnOkActive();
    this.sortSvgElements();
    this.sortCircleElements();
  }

  // ============================== drag 관련 ==============================

  // ============================== line 관련 ==============================
  /**
   * SVG 선 요소를 생성
   * @param x1 시작점 x 좌표
   * @param y1 시작점 y 좌표
   * @param x2 끝점 x 좌표
   * @param y2 끝점 y 좌표
   * @param options 선택적 스타일 옵션
   * @param options.stroke 선 색상 (기본값: 현재 선택된 색상)
   * @param options.strokeWidth 선 두께 (기본값: "3.5")
   * @param options.strokeLinecap 선 끝 모양 (기본값: "round")
   * @returns 생성된 SVG 선 요소
   * @private 선 그리기가 필요한 모든 곳에서 사용
   */
  private createSvgLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: {
      stroke?: string;
      strokeWidth?: string;
      strokeLinecap?: string;
    }
  ): SVGLineElement {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    // 좌표 설정
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());

    // 스타일 옵션 적용 (기본값 포함)
    const defaultOptions = {
      stroke: this.getCurrentStrokeColor(),
      strokeWidth: "3.5",
      strokeLinecap: "round",
    };

    const finalOptions = { ...defaultOptions, ...options };

    line.setAttribute("stroke", finalOptions.stroke);
    line.setAttribute("stroke-width", finalOptions.strokeWidth);
    line.setAttribute("stroke-linecap", finalOptions.strokeLinecap);

    return line;
  }

  private drawLine(startDot: Dot, endDot: Dot): void {
    if (!this.svg) return;

    // SVG 선 요소 생성
    const line = this.createSvgLine(startDot.cx, startDot.cy, endDot.cx, endDot.cy);
    this.svg.appendChild(line);

    // 그려진 선 목록에 추가
    this.drawnLines.push({ element: line, start: startDot, end: endDot });

    this.polygonsManager.updateDrawnLines(this.drawnLines);
  }

  // SVG 요소들의 순서를 정리
  public sortSvgElements(): void {
    if (!this.svg) return;

    // 색상이 있는 선들만 찾기 (투명한 선은 제외)
    const lines = Array.from(this.svg.querySelectorAll("line")).filter((line) => {
      const stroke = line.getAttribute("stroke");
      return stroke && stroke !== "transparent";
    });

    // 모든 선들을 맨 위로 이동 (가장 마지막에 그려지도록)
    lines.forEach((line) => {
      this.svg!.appendChild(line);
    });
  }

  /**
   * g 태그(dots)를 SVG 요소의 맨 마지막으로 이동
   * - endDrag 시 호출되어 dots가 다른 요소들 위에 표시되도록 함
   */
  public sortCircleElements(): void {
    if (!this.svg || !this.dotsGroup) return;

    // dotsGroup을 SVG의 맨 마지막 자식으로 이동
    // 이렇게 하면 dots가 다른 모든 요소들(선, 다각형 등) 위에 표시됨
    this.svg.appendChild(this.dotsGroup);
  }
  // ============================== line 관련 ==============================

  // ============================== color 관련 ==============================
  // 이미 그려진 선의 색상을 현재 선택된 색상으로 변경하는 함수
  private changeLineColor(startDot: Dot, endDot: Dot): void {
    // 주어진 두 점을 연결하는 선 찾기 (양방향 모두 확인)
    const existingLine = this.drawnLines.find((line) => {
      return (line.start === startDot && line.end === endDot) || (line.start === endDot && line.end === startDot);
    });

    if (existingLine) {
      const newColor = this.getCurrentStrokeColor(); // 현재 선택된 색상 가져오기
      existingLine.element.setAttribute("stroke", newColor); // 선 색상 변경
      // 선 색상 변경 후 해당 선을 맨 위로 이동
      if (this.svg && existingLine.element.parentNode === this.svg) {
        this.svg.appendChild(existingLine.element);
      }
    }
  }

  private getCurrentStrokeColor(): string {
    return this.getColorCode(this.currentColor);
  }

  private getColorCode(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      black: "#000",
      red: "#f53a3a",
      orange: "#ff760b",
      yellow: "#ffc400",
      lgreen: "#bcd011",
      green: "#27aa2b",
      sky: "#41a5ff",
      blue: "#3568f3",
      lpurple: "#9664e0",
      purple: "#624093",
      lbrown: "#b8793d",
      brown: "#9f3e00",
    };

    return colorMap[colorName] || "#000"; // 없는 색상이면 기본값
  }

  // ============================== color 관련 ==============================

  // ============================== 색 채우기, 모드 버튼 ==============================

  private setPaintbucket() {
    // 사용 가능한 모든 색상 목록
    this.colors = ["black", "red", "orange", "yellow", "lgreen", "green", "sky", "blue", "lpurple", "purple", "lbrown", "brown"];

    // 각 색상 버튼
    this.colors.forEach((color) => {
      const el = document.querySelector(`.color-${color}`) as IButton;
      if (el) {
        el.btnType = color; // 버튼 타입 설정
        el.addEventListener("click", this.bindClick);
        (this as any)[color] = el;
      }
    });
  }

  private setMakeMode() {
    this.modeList = ["line", "paint", "square"]; // 모드 목록

    // 각 모드 버튼에
    this.modeList.forEach((mode) => {
      const el = document.querySelector(`.${mode}-mode`) as IButton;
      if (el) {
        el.btnType = mode; // 버튼 타입 설정
        el.addEventListener("click", this.bindClick);
        (this as any)[mode] = el;
      }
    });
  }
  // ============================== 색 채우기, 모드 버튼 ==============================

  // ============================== 정사각형 모드 ==============================
  /**
   * 정사각형 격자를 그리고 클릭으로 색칠할 수 있는 rect를 생성(정사각형 모드)
   * - 보조 경계선은 투명한 line으로 추가하여 폴리곤 탐색에 영향을 주지 않음
   */
  private drawAllSquares() {
    if (!this.svg) return;
    this.clearSquareMode(); // 기존 정사각형들 정리
    const N = 6;
    const size = 1;

    for (let row = 0; row < N - size; row++) {
      for (let col = 0; col < N - size; col++) {
        const idx = (r: number, c: number) => r * N + c;

        const tl = this.dots[idx(row, col)];
        const tr = this.dots[idx(row, col + size)];
        const bl = this.dots[idx(row + size, col)];
        const br = this.dots[idx(row + size, col + size)];

        const addLine = (x1: number, y1: number, x2: number, y2: number) => {
          const line = this.createSvgLine(x1, y1, x2, y2, {
            stroke: "transparent", // 투명한 선
            strokeWidth: "4",
          });
          this.svg!.appendChild(line);
          this.squareLines.push(line);
        };

        // 네 변 그리기
        addLine(tl.cx, tl.cy, tr.cx, tr.cy);
        addLine(tr.cx, tr.cy, br.cx, br.cy);
        addLine(br.cx, br.cy, bl.cx, bl.cy);
        addLine(bl.cx, bl.cy, tl.cx, tl.cy);

        // 클릭 가능한 사각형 영역 생성
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", tl.cx.toString());
        rect.setAttribute("y", tl.cy.toString());
        rect.setAttribute("width", (tr.cx - tl.cx).toString());
        rect.setAttribute("height", (bl.cy - tl.cy).toString());
        const rectKey = `${tl.cx},${tl.cy}|${tr.cx},${tr.cy}|${br.cx},${br.cy}|${bl.cx},${bl.cy}`;
        rect.setAttribute("fill", "transparent"); // 처음에는 투명
        rect.setAttribute("stroke", "none");
        rect.setAttribute("pointer-events", "visiblePainted");

        // 사각형 클릭
        rect.addEventListener("click", (e) => {
          if (!this.isSquareModeActive) return; // 정사각형 모드가 아니면 무시

          const currentFill = rect.getAttribute("fill") || "transparent";
          const color = this.getCurrentStrokeColor(); // 현재 색상 가져오기

          // 현재 색상과 같은 색이 클릭되면 투명으로 변경
          if (currentFill === color) {
            rect.setAttribute("fill", "transparent");
            this.polygonColorMap.set(rectKey, "transparent");
          } else {
            rect.setAttribute("fill", color); // 색상 적용
            this.polygonColorMap.set(rectKey, color); // 색상 정보 저장
          }

          // 사각형을 다각형 뒤에 위치시키기
          this.svg!.removeChild(rect);
          this.appendRectAfterPolygons(rect);
          this.checkBtnOkActive(); // 완료 버튼 상태 체크
          this.sortSvgElements(); // 요소 순서 정리
          e.stopPropagation();
        });
        this.appendRectAfterPolygons(rect);
        this.squareRects.push(rect);
      }
    }
  }

  // 정사각형 모드에서 생성된 요소 정리(투명 rect 제거, 채워진 rect는 유지)
  private clearSquareMode() {
    if (!this.svg) return;

    this.squareLines.forEach((line) => line.remove());

    this.squareRects.forEach((rect) => {
      if (rect.getAttribute("fill") === "transparent" || !rect.getAttribute("fill")) {
        rect.remove();
      }
    });
    this.squareLines = [];

    this.squareRects = this.squareRects.filter((rect) => rect.getAttribute("fill") !== "transparent" && rect.getAttribute("fill"));
  }

  // 사각형을 다각형들 뒤에 삽입하여 레이어 순서를 유지
  private appendRectAfterPolygons(rect: SVGRectElement) {
    if (!this.svg) return;
    const polygons = Array.from(this.svg.querySelectorAll("polygon"));
    if (polygons.length > 0) {
      const lastPolygon = polygons[polygons.length - 1];
      this.svg.insertBefore(rect, lastPolygon.nextSibling);
    } else {
      this.svg.appendChild(rect);
    }
  }

  public rectNone() {
    const svg = document.querySelector("#svgCanvas") as HTMLElement;
    const rects = svg.querySelectorAll("rect");
    const circles = svg.querySelectorAll("circle");

    rects.forEach((rect) => rect.classList.add("pe-none"));
    circles.forEach((circle) => circle.classList.remove("pe-none"));
  }

  public rectAuto() {
    const svg = document.querySelector("#svgCanvas") as HTMLElement;
    const rects = svg.querySelectorAll("rect");
    const circles = svg.querySelectorAll("circle");

    rects.forEach((rect) => rect.classList.remove("pe-none"));
    circles.forEach((circle) => circle.classList.add("pe-none"));
  }
  // ============================== 정사각형 모드 ==============================

  public async exportImageAndSize(): Promise<{ success: boolean } | null> {
    if (!this.svg) return null;

    // shape-box 안의 새로운 SVG 찾기
    const shapeBox = document.querySelector(".shape-box") as HTMLElement;
    const targetSvg = shapeBox?.querySelector("svg") as SVGSVGElement;

    if (!targetSvg) return null;

    // 기존 복사된 요소들 제거 (circle 제외)
    targetSvg.querySelectorAll("line, rect, polygon").forEach((el) => el.remove());

    // #svgCanvas에서 유효한 요소들 수집
    const elements: SVGElement[] = [];

    this.svg.querySelectorAll("line, rect, polygon").forEach((el) => {
      const tag = el.tagName;
      let isValid = false;

      if (tag === "rect" || tag === "polygon") {
        const fill = el.getAttribute("fill");
        if (fill && fill !== "transparent" && fill !== "none") {
          isValid = true;
        }
      } else if (tag === "line") {
        const stroke = el.getAttribute("stroke");
        if (stroke && stroke !== "transparent" && stroke !== "none") {
          isValid = true;
        }
      }

      if (isValid) {
        elements.push(el as SVGElement);
      }
    });

    // #svgCanvas와 새로운 SVG의 좌표계 정보
    const canvasConfig = {
      dotRadius: 8,
      spacing: 74.5,
      leftOffset: 14.7,
      topOffset: 12.7,
    };

    const targetConfig = {
      dotRadius: 4,
      spacing: 30,
      leftOffset: 0,
      topOffset: 0,
    };

    // 좌표 변환 함수: #svgCanvas 좌표 -> 새로운 SVG 좌표
    const transformCoordinate = (x: number, y: number) => {
      // #svgCanvas 좌표를 격자 기준 좌표로 변환
      const gridX = (x - canvasConfig.leftOffset) / canvasConfig.spacing;
      const gridY = (y - canvasConfig.topOffset) / canvasConfig.spacing;

      // 격자 기준 좌표를 새로운 SVG 좌표로 변환
      const newX = gridX * targetConfig.spacing + targetConfig.leftOffset;
      const newY = gridY * targetConfig.spacing + targetConfig.topOffset;

      return { x: newX, y: newY };
    };

    // g 태그로 모든 요소들을 묶기
    const groupElement = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // 요소들을 새로운 SVG에 복사하고 좌표 변환
    elements.forEach((el) => {
      const clonedEl = el.cloneNode(true) as SVGElement;
      const tag = clonedEl.tagName;

      if (tag === "line") {
        // line 요소 좌표 변환
        const x1 = parseFloat(clonedEl.getAttribute("x1") || "0");
        const y1 = parseFloat(clonedEl.getAttribute("y1") || "0");
        const x2 = parseFloat(clonedEl.getAttribute("x2") || "0");
        const y2 = parseFloat(clonedEl.getAttribute("y2") || "0");

        const start = transformCoordinate(x1, y1);
        const end = transformCoordinate(x2, y2);

        clonedEl.setAttribute("x1", start.x.toString());
        clonedEl.setAttribute("y1", start.y.toString());
        clonedEl.setAttribute("x2", end.x.toString());
        clonedEl.setAttribute("y2", end.y.toString());

        // 선 두께 조정 (비율에 맞게)
        const strokeWidth = parseFloat(clonedEl.getAttribute("stroke-width") || "3");
        const newStrokeWidth = strokeWidth * (targetConfig.spacing / canvasConfig.spacing);
        clonedEl.setAttribute("stroke-width", newStrokeWidth.toString());
      } else if (tag === "rect") {
        // rect 요소 좌표 변환
        const x = parseFloat(clonedEl.getAttribute("x") || "0");
        const y = parseFloat(clonedEl.getAttribute("y") || "0");
        const width = parseFloat(clonedEl.getAttribute("width") || "0");
        const height = parseFloat(clonedEl.getAttribute("height") || "0");

        const topLeft = transformCoordinate(x, y);
        const bottomRight = transformCoordinate(x + width, y + height);

        clonedEl.setAttribute("x", topLeft.x.toString());
        clonedEl.setAttribute("y", topLeft.y.toString());
        clonedEl.setAttribute("width", (bottomRight.x - topLeft.x).toString());
        clonedEl.setAttribute("height", (bottomRight.y - topLeft.y).toString());
      } else if (tag === "polygon") {
        // polygon 요소 좌표 변환
        const points = clonedEl.getAttribute("points") || "";
        const transformedPoints = points
          .split(" ")
          .map((point) => {
            const [x, y] = point.split(",").map(Number);
            const transformed = transformCoordinate(x, y);
            return `${transformed.x},${transformed.y}`;
          })
          .join(" ");

        clonedEl.setAttribute("points", transformedPoints);
      }

      // 각 요소를 g 태그에 추가
      groupElement.appendChild(clonedEl);
    });

    // g 태그를 targetSvg에 추가
    if (elements.length > 0) {
      targetSvg.appendChild(groupElement);
      targetSvg.querySelectorAll("circle").forEach((circle) => circle.remove());
    }

    return { success: true };
  }

  private get isLineModeActive(): boolean {
    return this["line"] && this["line"].classList.contains("active");
  }

  private get isPaintModeActive(): boolean {
    return this["paint"] && this["paint"].classList.contains("active");
  }

  private get isSquareModeActive(): boolean {
    return this["square"] && this["square"].classList.contains("active");
  }

  // ============================== 초기화 ==============================

  public clearAllLines(): void {
    if (!this.svg) return;
    this.drawnLines.forEach((line) => {
      if (line.element.parentNode) line.element.parentNode.removeChild(line.element);
    });
    this.drawnLines = [];

    this.polygonsManager.updateDrawnLines(this.drawnLines);

    this.svg.querySelectorAll("polygon").forEach((poly) => poly.remove());

    this.dots.forEach((dot) => {
      dot.element.setAttribute("fill", "#666");
      dot.element.classList.remove("active");
    });

    this.svg.querySelectorAll("rect").forEach((rect) => rect.remove());
    this.svg.querySelectorAll("line").forEach((line) => line.remove());
    this.clearSquareMode();

    this.polygonColorMap.clear();

    this.polygonsManager.updatePolygonColorMap(this.polygonColorMap);

    this.checkBtnOkActive();

    if (document.querySelector(".custom-play")?.classList.contains("d-none")) {
    } else {
      if (this.isSquareModeActive) this.drawAllSquares();
    }
  }
}

