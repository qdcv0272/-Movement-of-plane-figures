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

export class PolygonsManager {
  private svg: SVGSVGElement | null;
  private drawnLines: DrawnLine[];
  private polygonColorMap: Map<string, string>;
  private currentColor: string;
  private svgManager: any; // SvgShapeBoardManager 인스턴스
  /** 수치 오차로 같은 점이 서로 다른 문자열 키로 분리되는 문제를 막기 위한 좌표 양자화 간격 */
  public static readonly COORD_EPS = 1e-3;

  // ===== 좌표 보조 유틸 =====
  /** * 좌표를 미리 정한 간격(COORD_EPS)으로 반올림하여, 미세한 부동소수점 차이를 정리 */
  private static roundCoord(n: number): number {
    const eps = PolygonsManager.COORD_EPS;
    return Math.round(n / eps) * eps;
  }

  /** * 숫자 좌표(x, y)를 문자열 키로 변환 */
  private static keyOf(x: number, y: number): string {
    const rx = PolygonsManager.roundCoord(x);
    const ry = PolygonsManager.roundCoord(y);
    return `${rx.toFixed(3)},${ry.toFixed(3)}`;
  }

  /** * 점 객체의 x, y를 모두 roundCoord 반환 */
  private static quantizePoint(p: { x: number; y: number }): { x: number; y: number } {
    return { x: PolygonsManager.roundCoord(p.x), y: PolygonsManager.roundCoord(p.y) };
  }

  /** * - 사용자가 그린 선으로 닫힌 도형을 찾아 SVG polygon을 생성/색칠 가능하게 관리 */
  constructor(svg: SVGSVGElement | null, drawnLines: DrawnLine[], polygonColorMap: Map<string, string>, currentColor: string, svgManager?: any) {
    this.svg = svg;
    this.drawnLines = drawnLines;
    this.polygonColorMap = polygonColorMap;
    this.currentColor = currentColor;
    this.svgManager = svgManager;
  }

  /** 현재 선택된 색상 변경 */
  public updateCurrentColor(color: string): void {
    this.currentColor = color;
  }

  public updateDrawnLines(drawnLines: DrawnLine[]): void {
    this.drawnLines = drawnLines;
  }

  public updatePolygonColorMap(polygonColorMap: Map<string, string>): void {
    this.polygonColorMap = polygonColorMap;
  }

  /**
   * 닫힌 도형 찾기 + SVG polygon 생성의 메인 흐름
   * 1) 색이 있는 사용자 선이 하나라도 있는지 확인(없으면 폴리곤 생성하지 않음)
   * 2) 모든 교차점을 찾아 선을 잘게 분할
   * 3) 정점별 이웃을 각도(시계방향) 기준으로 정렬
   * 4) 하프엣지 순회로 내부 면(폴리곤)들을 추출
   * 5) 바깥 껍질(가장 큰 면) 제거
   * 6) SVG polygon 요소로 렌더링, 클릭 시 색칠 가능
   */
  public findAndDrawPolygons(): void {
    if (!this.svg) return;

    const svg = document.querySelector("#svgCanvas") as HTMLElement;
    const circles = svg.querySelectorAll(".dots circle");
    circles.forEach((circle) => circle.classList.add("pe-none"));

    const hasUserColoredLine = this.drawnLines.some((l) => {
      const stroke = (l.element.getAttribute("stroke") || "").toLowerCase();
      const isColored = stroke && stroke !== "transparent" && stroke !== "none";
      const isBoundary = l.element.getAttribute("data-boundary") === "true";
      return isColored && !isBoundary;
    });
    if (!hasUserColoredLine) {
      this.svg.querySelectorAll("polygon").forEach((poly) => poly.remove());
      if (this.svgManager && typeof this.svgManager.checkBtnOkActive === "function") {
        this.svgManager.checkBtnOkActive();
      }
      // console.log("[PolygonsManager] 생성된 polygon 개수:", 0);
      return;
    }

    const { points, segments } = this.splitLinesAtIntersections();
    if (segments.length === 0) return;

    const coords = this.buildCoordinateMap(points);
    const { neighbors, directedEdges } = this.buildNeighborsAndEdges(segments, coords);
    this.sortNeighborsClockwise(neighbors);

    let polygons = this.traceFaces(neighbors, coords, directedEdges);
    polygons = polygons.filter((poly) => PolygonsManager.isSimpleNonDegeneratePolygon(poly));

    // 외곽 폴리곤 제거 (폴리곤이 2개 이상일 때)
    if (polygons.length > 1) {
      const originalCount = polygons.length;
      polygons = this.removeOuterHull(polygons);
      console.log(`[PolygonsManager] 외곽 폴리곤 제거: ${originalCount}개 → ${polygons.length}개`);

      // 만약 여전히 폴리곤이 많다면 추가로 가장 큰 폴리곤 제거
      if (polygons.length > 1) {
        const areas = polygons.map((poly) => PolygonsManager.getPolygonArea(poly));
        const maxArea = Math.max(...areas);
        const maxIdx = areas.indexOf(maxArea);

        // 가장 큰 폴리곤이 다른 폴리곤들보다 2배 이상 크면 제거
        const otherAreas = areas.filter((_, idx) => idx !== maxIdx);
        const avgOtherArea = otherAreas.length > 0 ? otherAreas.reduce((a, b) => a + b, 0) / otherAreas.length : 0;

        if (maxArea > avgOtherArea * 2) {
          polygons.splice(maxIdx, 1);
          // console.log(`[PolygonsManager] 추가 외곽 폴리곤 제거: 면적 ${maxArea.toFixed(2)} (평균 대비 ${(maxArea/avgOtherArea).toFixed(1)}배)`);
        }
      }
    }

    this.renderPolygons(polygons);

    // sortCircleElements 호출하여 dots를 맨 위로 이동
    if (this.svgManager && typeof this.svgManager.sortCircleElements === "function") {
      this.svgManager.sortCircleElements();
    }
  }
  // =========================== split ===========================
  private splitLinesAtIntersections(): { points: string[]; segments: { x1: number; y1: number; x2: number; y2: number }[] } {
    const segments = this.drawnLines.map((line) => ({
      x1: line.start.cx,
      y1: line.start.cy,
      x2: line.end.cx,
      y2: line.end.cy,
    }));

    const pointSet = new Set<string>();
    segments.forEach((seg) => {
      pointSet.add(PolygonsManager.keyOf(seg.x1, seg.y1));
      pointSet.add(PolygonsManager.keyOf(seg.x2, seg.y2));
    });

    const intersections: { x: number; y: number }[] = [];
    const seenIntersections = new Set<string>();
    // 모든 선분 쌍을 검사하여 교차점을 수집
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const inter = PolygonsManager.getLineIntersection(segments[i], segments[j]);
        if (inter) {
          const key = PolygonsManager.keyOf(inter.x, inter.y);
          // 교차점은 엔드포인트와 같더라도 항상 교차 목록에 포함시켜야 T-접합 분할이 가능
          if (!seenIntersections.has(key)) {
            seenIntersections.add(key);
            intersections.push(inter);
          }
          pointSet.add(key);
        }
      }
    }

    let newSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const seg of segments) {
      const pts = [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }, ...intersections.filter((p) => PolygonsManager.isPointOnSegment(p, seg))];

      // 같은 교차점을 수치 오차 범위에서 하나로 합치기
      const uniquePts: { x: number; y: number }[] = [];
      const seen = new Set<string>();
      for (const p of pts) {
        const k = PolygonsManager.keyOf(p.x, p.y);
        if (!seen.has(k)) {
          seen.add(k);
          uniquePts.push(p);
        }
      }

      // 선분의 실제 진행 방향을 기준으로 정렬(투영 파라미터 t)
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const lenSq = dx * dx + dy * dy || 1;
      const tOf = (p: { x: number; y: number }) => ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
      // 선을 따라 진행 순서(투영 파라미터 t)대로 정렬하여 인접 점끼리 자름
      uniquePts.sort((p1, p2) => tOf(p1) - tOf(p2));

      for (let i = 0; i < uniquePts.length - 1; i++) {
        const a = PolygonsManager.quantizePoint(uniquePts[i]);
        const b = PolygonsManager.quantizePoint(uniquePts[i + 1]);
        newSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }

    const points = Array.from(pointSet);
    return { points, segments: newSegments };
  }

  /**
   * 두 선분의 교차점을 계산
   * @param a 선분 A
   * @param b 선분 B
   * @returns 교차점 좌표 또는 null(평행/연장선 밖 교차)
   */
  private static getLineIntersection(
    a: { x1: number; y1: number; x2: number; y2: number },
    b: { x1: number; y1: number; x2: number; y2: number }
  ): { x: number; y: number } | null {
    const det = (a.x2 - a.x1) * (b.y2 - b.y1) - (a.y2 - a.y1) * (b.x2 - b.x1);
    if (det === 0) return null;

    const t = ((b.x1 - a.x1) * (b.y2 - b.y1) - (b.y1 - a.y1) * (b.x2 - b.x1)) / det;
    const u = ((b.x1 - a.x1) * (a.y2 - a.y1) - (b.y1 - a.y1) * (a.x2 - a.x1)) / det;

    // 경계 교차도 포함시키되, 아주 약간 벗어날 수 있는 부동소수 오차는 허용
    const EPS = 1e-9;
    if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;

    const clampedT = Math.max(0, Math.min(1, t));
    return {
      x: a.x1 + clampedT * (a.x2 - a.x1),
      y: a.y1 + clampedT * (a.y2 - a.y1),
    };
  }

  // 점이 선분 위에 있는지
  private static isPointOnSegment(p: { x: number; y: number }, seg: { x1: number; y1: number; x2: number; y2: number }, tol = 1e-6): boolean {
    const minX = Math.min(seg.x1, seg.x2) - tol;
    const maxX = Math.max(seg.x1, seg.x2) + tol;
    const minY = Math.min(seg.y1, seg.y2) - tol;
    const maxY = Math.max(seg.y1, seg.y2) + tol;

    const cross = (seg.x2 - seg.x1) * (p.y - seg.y1) - (seg.y2 - seg.y1) * (p.x - seg.x1);
    if (Math.abs(cross) > tol) return false;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
  }

  // =========================== split ===========================

  // =========================== map, edges, sort ===========================
  private buildCoordinateMap(points: string[]): Map<string, { x: number; y: number }> {
    const coords = new Map<string, { x: number; y: number }>();
    for (const p of points) {
      const [x, y] = (p as string).split(",").map(Number);
      coords.set(p as string, { x, y });
    }
    return coords;
  }

  // 이웃 맵과 방향 간선 집합 구성
  private buildNeighborsAndEdges(
    segments: { x1: number; y1: number; x2: number; y2: number }[],
    coords: Map<string, { x: number; y: number }>
  ): { neighbors: Map<string, { id: string; angle: number }[]>; directedEdges: { u: string; v: string }[] } {
    const neighbors = new Map<string, { id: string; angle: number }[]>();
    const addNeighbor = (a: string, b: string) => {
      if (!neighbors.has(a)) neighbors.set(a, []);
      const ca = coords.get(a)!;
      const cb = coords.get(b)!;
      const angle = Math.atan2(cb.y - ca.y, cb.x - ca.x);
      neighbors.get(a)!.push({ id: b, angle });
    };

    const directedEdges: { u: string; v: string }[] = [];
    for (const seg of segments) {
      const s = PolygonsManager.keyOf(seg.x1, seg.y1);
      const e = PolygonsManager.keyOf(seg.x2, seg.y2);
      if (!coords.has(s) || !coords.has(e)) continue;
      addNeighbor(s, e);
      addNeighbor(e, s);
      directedEdges.push({ u: s, v: e });
      directedEdges.push({ u: e, v: s });
    }

    return { neighbors, directedEdges };
  }

  private sortNeighborsClockwise(neighbors: Map<string, { id: string; angle: number }[]>): void {
    for (const [k, arr] of neighbors.entries()) {
      arr.sort((a, b) => a.angle - b.angle);
      neighbors.set(k, arr);
    }
  }
  // =========================== map, edges, sort ===========================

  // =========================== 추적 ===========================
  /**
   * 하프엣지 순회 알고리즘을 사용하여 교차하는 선분들로부터 폴리곤(면)들을 추적
   *
   * 알고리즘 원리:
   * 1. 각 교차점에서 이웃 정점들을 시계방향으로 정렬
   * 2. 방향성 간선(prev→curr)에서 우회전으로 다음 정점을 선택
   * 3. 시작점으로 돌아올 때까지 경로를 추적하여 폴리곤 완성
   * 4. 중복 폴리곤 제거 및 유효성 검사
   *
   * @param neighbors - 각 정점의 이웃 정점들과 각도 정보
   * @param coords - 각 정점의 좌표 정보
   * @param directedEdges - 방향성 간선들의 목록
   * @returns 추적된 폴리곤들의 정점 배열 목록
   */
  private traceFaces(
    neighbors: Map<string, { id: string; angle: number }[]>,
    coords: Map<string, { x: number; y: number }>,
    directedEdges: { u: string; v: string }[]
  ): string[][] {
    // 간선을 문자열 키로 변환하는 헬퍼 함수
    const edgeKey = (a: string, b: string) => `${a}->${b}`;

    // 이미 방문한 방향성 간선들을 추적 (중복 방지)
    const visitedDir = new Set<string>();

    // 정규화된 폴리곤들을 추적 (중복 폴리곤 방지)
    const seenNormalized = new Set<string>();

    // 최종 결과 폴리곤 목록
    const polygons: string[][] = [];

    /**
     * 현재 간선(prev→curr)에서 우회전으로 이어지는 다음 정점을 선택
     *
     * 선택 기준:
     * 1. prev에서 curr로의 방향을 기준선으로 설정
     * 2. curr의 이웃 정점들 중 기준선에서 우회전하는 각도가 가장 작은 정점 선택
     * 3. 이는 항상 폴리곤의 내부 면을 추적하게 함
     *
     * @param prev - 이전 정점 ID
     * @param curr - 현재 정점 ID
     * @returns 다음 정점 ID 또는 null (이웃이 없는 경우)
     */
    const pickRightTurnNext = (prev: string, curr: string): string | null => {
      const neigh = neighbors.get(curr);
      if (!neigh || neigh.length === 0) return null;

      // 현재 정점과 이전 정점의 좌표
      const c = coords.get(curr)!;
      const p = coords.get(prev)!;

      // prev→curr 방향을 기준선으로 설정 (라디안)
      const base = Math.atan2(p.y - c.y, p.x - c.x);

      // 이전 정점이 이웃 목록에서 몇 번째인지 찾기
      let idxPrev = -1;
      for (let i = 0; i < neigh.length; i++)
        if (neigh[i].id === prev) {
          idxPrev = i;
          break;
        }

      // 이전 정점을 찾지 못한 경우 (예외 상황)
      if (idxPrev === -1) {
        // 기준선에서 우회전하는 각도가 가장 작은 이웃 찾기
        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < neigh.length; i++) {
          const a = neigh[i].angle;
          // 각도 차이 계산 (우회전이 양수)
          const delta = (base - a + Math.PI * 3) % (Math.PI * 2);
          if (delta > 0 && delta < bestDelta) {
            bestDelta = delta;
            bestIdx = i;
          }
        }
        return bestIdx === -1 ? neigh[0].id : neigh[bestIdx].id;
      }

      // 이전 정점의 바로 왼쪽(우회전) 이웃 선택
      const nextIdx = (idxPrev - 1 + neigh.length) % neigh.length;
      return neigh[nextIdx].id;
    };

    // 모든 방향성 간선에 대해 폴리곤 추적 시도
    for (const { u, v } of directedEdges) {
      const k = edgeKey(u, v);

      // 이미 방문한 간선은 건너뛰기
      if (visitedDir.has(k)) continue;

      // 경로 추적 시작
      let prev = u;
      let curr = v;
      const path: string[] = [u, v]; // 경로 기록
      let safe = 0; // 무한 루프 방지 카운터
      const MAX_STEP = Math.max(60, directedEdges.length * 2); // 최대 반복 횟수

      // 경로 추적 루프
      while (safe++ < MAX_STEP) {
        // 우회전으로 다음 정점 선택
        const w = pickRightTurnNext(prev, curr);
        if (!w) break; // 다음 정점이 없으면 종료

        // 시작점으로 돌아왔는지 확인 (폴리곤 완성)
        if (w === path[0]) {
          const poly = path.slice(0);

          // 최소 3개 정점이 있어야 유효한 폴리곤
          if (poly.length >= 3) {
            // 폴리곤 정규화 (중복 제거용)
            const norm = PolygonsManager.normalizePolygon(poly);

            // 중복되지 않은 폴리곤만 추가
            if (!seenNormalized.has(norm)) {
              seenNormalized.add(norm);
              polygons.push(poly);

              // 이 폴리곤의 모든 간선을 방문 처리
              for (let i = 0; i < poly.length; i++) {
                const a = poly[i];
                const b = poly[(i + 1) % poly.length];
                visitedDir.add(edgeKey(a, b));
              }
            }
          }
          break; // 폴리곤 완성, 다음 간선으로
        }

        // 경로 계속 진행
        prev = curr;
        curr = w;
        path.push(curr);
      }
    }

    return polygons;
  }
  /**
   * 폴리곤 정점열의 표준화 문자열 생성(시작점/방향 차이를 제거)
   * - 동일 도형 중복 판단에 사용
   */
  private static normalizePolygon(poly: string[]): string {
    const minIdx = poly.reduce((minIdx, pt, i, arr) => (pt < arr[minIdx] ? i : minIdx), 0);
    const n = poly.length;

    const rot1 = Array.from({ length: n }, (_, i) => poly[(minIdx + i) % n]);
    const rot2 = Array.from({ length: n }, (_, i) => poly[(minIdx - i + n) % n]);

    return [rot1.join("|"), rot2.join("|")].sort()[0];
  }
  // =========================== 추적 ===========================

  // =========================== 검사 ===========================
  /**
   * 단순 폴리곤이면서 넓이가 0이 아닌지 검사
   * 1) 비연속 중복 정점 존재 여부
   * 2) 넓이(신발끈 공식)
   * 3) 변들끼리의 내부 교차 여부(인접/공유 정점은 예외)
   */
  private static isSimpleNonDegeneratePolygon(points: string[]): boolean {
    if (!points || points.length < 3) return false;

    // 1) 비연속 중복 정점 검사
    const seen = new Map<string, number>();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (seen.has(p)) {
        const prevIdx = seen.get(p)!;
        // 연속 중복이 아닌 경우(예: ...A, B, C, A...) → 비정상
        if (prevIdx !== i - 1) return false;
      } else {
        seen.set(p, i);
      }
    }

    // 2) 넓이 검사
    if (PolygonsManager.getPolygonArea(points) < 1e-6) return false;

    // 3) 자기 교차 검사 (인접/공유 정점 변은 제외)
    const n = points.length;
    const getPt = (s: string) => {
      const [x, y] = s.split(",").map(Number);
      return { x, y };
    };

    const segs = Array.from({ length: n }, (_, i) => {
      const a = getPt(points[i]);
      const b = getPt(points[(i + 1) % n]);
      return { a, b };
    });

    const sharesEndpoint = (i: number, j: number) => {
      if (i === j) return true;
      const nextI = (i + 1) % n;
      const nextJ = (j + 1) % n;
      return (
        i === nextJ ||
        j === nextI ||
        PolygonsManager.isSamePoint(points[i], points[j]) ||
        PolygonsManager.isSamePoint(points[i], points[nextJ]) ||
        PolygonsManager.isSamePoint(points[nextI], points[j]) ||
        PolygonsManager.isSamePoint(points[nextI], points[nextJ])
      );
    };

    /**
     * 세 점의 방향(orientation)을 계산
     *
     * - 0: 세 점이 한 직선 위에 있음 (collinear)
     * - 1: 시계방향 (clockwise)
     * - 2: 반시계방향 (counterclockwise)
     *
     * 계산 방법: 외적(cross product)을 이용한 부호 판정
     * (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
     *
     * @param p - 첫 번째 점
     * @param q - 두 번째 점
     * @param r - 세 번째 점
     * @returns 0(직선), 1(시계방향), 2(반시계방향)
     */
    const orient = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => {
      // 외적 계산 (부동소수점 오차 고려)
      const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
      if (Math.abs(val) < 1e-9) return 0; // 거의 0이면 직선
      return val > 0 ? 1 : 2; // 양수면 시계방향, 음수면 반시계방향
    };

    /**
     * 점 q가 선분 pr 위에 있는지 확인
     *
     * 조건:
     * 1. q가 p와 r 사이의 x좌표 범위에 있음
     * 2. q가 p와 r 사이의 y좌표 범위에 있음
     *
     * 부동소수점 오차를 고려하여 약간의 여유(1e-9)를 둠
     *
     * @param p - 선분의 시작점
     * @param q - 확인할 점
     * @param r - 선분의 끝점
     * @returns q가 선분 pr 위에 있으면 true
     */
    const onSegment = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) => {
      return Math.min(p.x, r.x) - 1e-9 <= q.x && q.x <= Math.max(p.x, r.x) + 1e-9 && Math.min(p.y, r.y) - 1e-9 <= q.y && q.y <= Math.max(p.y, r.y) + 1e-9;
    };

    /**
     * 두 선분이 교차하는지 확인
     *
     * 알고리즘: CCW(Counter-ClockWise) 테스트
     *
     * 두 선분 p1q1과 p2q2가 교차하는 조건:
     * 1. p1q1을 기준으로 p2와 q2가 서로 다른 방향에 있음 (o1 ≠ o2)
     * 2. p2q2를 기준으로 p1과 q1이 서로 다른 방향에 있음 (o3 ≠ o4)
     *
     * 특수한 경우 (한 점이 다른 선분 위에 있는 경우):
     * - 방향이 0이고 해당 점이 선분 위에 있으면 교차
     *
     * @param p1 - 첫 번째 선분의 시작점
     * @param q1 - 첫 번째 선분의 끝점
     * @param p2 - 두 번째 선분의 시작점
     * @param q2 - 두 번째 선분의 끝점
     * @returns 두 선분이 교차하면 true
     */
    const segIntersect = (p1: { x: number; y: number }, q1: { x: number; y: number }, p2: { x: number; y: number }, q2: { x: number; y: number }) => {
      // 각 선분을 기준으로 다른 선분의 두 점의 방향 계산
      const o1 = orient(p1, q1, p2); // p1q1 기준으로 p2의 방향
      const o2 = orient(p1, q1, q2); // p1q1 기준으로 q2의 방향
      const o3 = orient(p2, q2, p1); // p2q2 기준으로 p1의 방향
      const o4 = orient(p2, q2, q1); // p2q2 기준으로 q1의 방향

      // 일반적인 경우: 두 선분이 서로 다른 방향에 있으면 교차
      if (o1 !== o2 && o3 !== o4) return true;

      // 특수한 경우: 한 점이 다른 선분 위에 있는 경우
      if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p2가 p1q1 위에 있음
      if (o2 === 0 && onSegment(p1, q2, q1)) return true; // q2가 p1q1 위에 있음
      if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p1이 p2q2 위에 있음
      if (o4 === 0 && onSegment(p2, q1, q2)) return true; // q1이 p2q2 위에 있음

      return false; // 교차하지 않음
    };

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (sharesEndpoint(i, j)) continue;
        const s1 = segs[i];
        const s2 = segs[j];
        if (segIntersect(s1.a, s1.b, s2.a, s2.b)) return false;
      }
    }

    return true;
  }

  // 다각형 넓이를 구하는
  private static getPolygonArea(points: string[]): number {
    let area = 0;

    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i].split(",").map(Number);
      const [x2, y2] = points[(i + 1) % points.length].split(",").map(Number);
      area += x1 * y2 - x2 * y1;
    }

    return Math.abs(area / 2);
  }

  // 두 점 동일 여부(문자열 좌표 비교)
  private static isSamePoint(a: string, b: string): boolean {
    return a === b;
  }

  // =========================== 검사 ===========================

  // =========================== 제거 ===========================
  /**
   * 가장 바깥쪽 외곽 면(껍질)을 제거
   * - 각 폴리곤의 무게중심을 이용해 포함관계 판단(성공 시 그 면을 제거)
   * - 실패하면 면적이 가장 큰 면을 외곽으로 보고 제거
   * - 개선: 더 정확한 외곽 판단을 위한 다중 점 샘플링 및 경계 거리 계산
   */
  private removeOuterHull(polygons: string[][]): string[][] {
    if (polygons.length <= 1) return polygons;
    const n = polygons.length;

    // 0단계: 면적이 압도적으로 큰 폴리곤이 있으면 바로 제거 (가장 확실한 방법)
    const areas = polygons.map((poly) => PolygonsManager.getPolygonArea(poly));
    const maxArea = Math.max(...areas);
    const minArea = Math.min(...areas);

    // 가장 큰 면적이 다른 면적들보다 3배 이상 크면 외곽으로 판단
    if (maxArea > minArea * 3) {
      const maxIdx = areas.indexOf(maxArea);
      const result = polygons.slice();
      result.splice(maxIdx, 1);
      // console.log(`[PolygonsManager] 면적 기반으로 외곽 폴리곤 제거: 면적 ${maxArea.toFixed(2)}`);
      return result;
    }

    // 1단계: 포함관계 판단 - 더 엄격한 조건 적용
    const centroids = polygons.map((pts) => PolygonsManager.getPolygonCentroid(pts));
    const containsCount: number[] = Array(n).fill(0);
    const containedByCount: number[] = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const inside = PolygonsManager.isPointInPolygon(centroids[j], polygons[i]);
        if (inside) {
          containsCount[i] += 1;
          containedByCount[j] += 1;
        }
      }
    }

    // 외곽 폴리곤 찾기: 다른 모든 폴리곤을 포함하고, 다른 폴리곤에 포함되지 않는 것
    const hullIdx = containsCount.findIndex((cnt, i) => cnt === n - 1 && containedByCount[i] === 0);
    if (hullIdx !== -1) {
      const result = polygons.slice();
      result.splice(hullIdx, 1);
      // console.log(`[PolygonsManager] 무게중심 기반으로 외곽 폴리곤 제거: 인덱스 ${hullIdx}`);
      return result;
    }

    // 2단계: 개선된 외곽 판단 - 모든 정점을 포함하는 폴리곤 찾기
    const outerPolygonIdx = this.findOuterPolygonByVertexContainment(polygons);
    if (outerPolygonIdx !== -1) {
      const result = polygons.slice();
      result.splice(outerPolygonIdx, 1);
      // console.log(`[PolygonsManager] 정점 포함 기반으로 외곽 폴리곤 제거: 인덱스 ${outerPolygonIdx}`);
      return result;
    }

    // 3단계: 면적 기반 외곽 판단 (가장 큰 면적의 폴리곤 제거)
    let maxAreaIdx = -1;
    let maxAreaValue = -Infinity;
    for (let i = 0; i < n; i++) {
      const area = PolygonsManager.getPolygonArea(polygons[i]);
      if (area > maxAreaValue) {
        maxAreaValue = area;
        maxAreaIdx = i;
      }
    }
    if (maxAreaIdx !== -1) {
      const result = polygons.slice();
      result.splice(maxAreaIdx, 1);
      // console.log(`[PolygonsManager] 최종 면적 기반으로 외곽 폴리곤 제거: 인덱스 ${maxAreaIdx}, 면적 ${maxAreaValue.toFixed(2)}`);
      return result;
    }
    return polygons;
  }
  /**
   * 모든 다른 폴리곤의 정점을 포함하는 외곽 폴리곤을 찾는 메서드
   * - 각 폴리곤이 다른 모든 폴리곤의 정점을 포함하는지 확인
   * - 가장 많은 정점을 포함하는 폴리곤을 외곽으로 판단
   */
  private findOuterPolygonByVertexContainment(polygons: string[][]): number {
    const n = polygons.length;
    let maxContainedVertices = -1;
    let outerPolygonIdx = -1;

    for (let i = 0; i < n; i++) {
      const currentPolygon = polygons[i];
      let totalContainedVertices = 0;

      // 다른 모든 폴리곤의 정점이 현재 폴리곤에 포함되는지 확인
      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        const otherPolygon = polygons[j];
        for (const pointStr of otherPolygon) {
          const [x, y] = pointStr.split(",").map(Number);
          const inside = PolygonsManager.isPointInPolygon({ x, y }, currentPolygon);
          if (inside) {
            totalContainedVertices++;
          }
        }
      }

      // 가장 많은 정점을 포함하는 폴리곤을 외곽으로 판단
      if (totalContainedVertices > maxContainedVertices) {
        maxContainedVertices = totalContainedVertices;
        outerPolygonIdx = i;
      }
    }

    // 다른 폴리곤의 정점을 상당히 많이 포함하는 경우에만 외곽으로 판단
    const totalOtherVertices = polygons.reduce((sum, poly, idx) => {
      if (idx === outerPolygonIdx) return sum;
      return sum + poly.length;
    }, 0);

    // 다른 폴리곤의 정점 중 80% 이상을 포함하는 경우 외곽으로 판단
    const threshold = totalOtherVertices * 0.8;
    return maxContainedVertices >= threshold ? outerPolygonIdx : -1;
  }

  /**
   * 각 폴리곤의 외곽성을 계산하는 개선된 알고리즘
   * - 폴리곤의 모든 정점을 샘플링하여 다른 폴리곤과의 포함관계를 더 정확히 판단
   * - 경계 거리와 면적을 종합적으로 고려
   */
  private calculateOuterScores(polygons: string[][]): number[] {
    const n = polygons.length;
    const scores: number[] = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const polygon = polygons[i];
      let containedPoints = 0;
      let totalPoints = 0;

      // 각 폴리곤의 모든 정점을 샘플링
      for (let j = 0; j < n; j++) {
        if (i === j) continue;

        const otherPolygon = polygons[j];
        // 다른 폴리곤의 모든 정점을 현재 폴리곤과 비교
        for (const pointStr of otherPolygon) {
          const [x, y] = pointStr.split(",").map(Number);
          const inside = PolygonsManager.isPointInPolygon({ x, y }, polygon);
          if (inside) {
            containedPoints++;
          }
          totalPoints++;
        }
      }

      // 외곽 점수 계산: 포함된 점의 비율이 낮을수록 외곽일 가능성이 높음
      const containmentRatio = totalPoints > 0 ? containedPoints / totalPoints : 0;
      const area = PolygonsManager.getPolygonArea(polygon);

      // 외곽 점수 = (1 - 포함비율) * 면적 가중치
      // 면적이 클수록 외곽일 가능성이 높으므로 면적의 제곱근을 가중치로 사용
      scores[i] = (1 - containmentRatio) * Math.sqrt(area);
    }

    return scores;
  }

  // 다각형의 무게중심
  private static getPolygonCentroid(points: string[]): { x: number; y: number } {
    let signedArea = 0;
    let centroidX = 0;
    let centroidY = 0;

    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i].split(",").map(Number);
      const [x2, y2] = points[(i + 1) % points.length].split(",").map(Number);
      const a = x1 * y2 - x2 * y1;
      signedArea += a;
      centroidX += (x1 + x2) * a;
      centroidY += (y1 + y2) * a;
    }

    signedArea *= 0.5;
    if (Math.abs(signedArea) < 1e-9) {
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < points.length; i++) {
        const [x, y] = points[i].split(",").map(Number);
        sx += x;
        sy += y;
      }
      return { x: sx / points.length, y: sy / points.length };
    }

    centroidX /= 6 * signedArea;
    centroidY /= 6 * signedArea;
    return { x: centroidX, y: centroidY };
  }

  // 점이 다각형 내부에 있는지 확인 (레이캐스팅 알고리즘 - 광선을 쏴서 경계와 몇 번 만나는지 세기)
  private static isPointInPolygon(point: { x: number; y: number }, polygon: string[]): boolean {
    const x = point.x; // 점의 x 좌표
    const y = point.y; // 점의 y 좌표
    let inside = false; // 내부 여부 (처음엔 외부로 가정)

    // 다각형의 모든 변에 대해 광선과의 교차 여부 확인
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i].split(",").map(Number); // 현재 변의 끝점
      const [xj, yj] = polygon[j].split(",").map(Number); // 현재 변의 시작점

      // 점이 변 위에 있는지 먼저 확인
      if (this.isPointOnSegment({ x, y }, { x1: xi, y1: yi, x2: xj, y2: yj })) {
        return true; // 경계 위에 있으면 내부로 간주
      }

      // 수평 광선이 이 변과 교차하는지 확인
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
      if (intersect) inside = !inside; // 교차할 때마다 내부/외부 상태 뒤바뀜
    }

    return inside; // 홀수 번 교차하면 내부, 짝수 번이면 외부
  }
  // =========================== 제거 ===========================

  // =========================== 생성 ===========================
  /** SVG에 폴리곤 생성 및 이벤트 부착, 버튼 갱신까지 한번에 처리 */
  private renderPolygons(polygons: string[][]): void {
    if (!this.svg) return;

    if (polygons.length === 0) {
      this.svg.querySelectorAll("polygon").forEach((poly) => poly.remove());
      if (this.svgManager && typeof this.svgManager.checkBtnOkActive === "function") {
        this.svgManager.checkBtnOkActive();
      }
      console.log("[PolygonsManager] 생성된 polygon 개수:", 0);
      return;
    }

    // 기존 폴리곤의 색상과 영역 정보를 저장 (삭제 전에)
    const existingPolygonData: { points: string[]; fill: string }[] = [];
    this.svg.querySelectorAll("polygon").forEach((poly) => {
      const points = poly.getAttribute("points");
      const fill = poly.getAttribute("fill");
      if (points && fill && fill !== "transparent" && fill !== "none") {
        const pointsArray = points.trim().split(/\s+/);
        existingPolygonData.push({ points: pointsArray, fill });

        // polygonColorMap에도 저장 (정확한 매칭용)
        this.polygonColorMap.set(points, fill);
        const normalizedKey = PolygonsManager.normalizePolygon(pointsArray);
        this.polygonColorMap.set(normalizedKey, fill);
      }
    });

    this.svg.querySelectorAll("polygon").forEach((poly) => poly.remove());

    // 1) 기본 폴리곤 렌더링
    polygons.forEach((poly, index) => {
      const pointsStr = poly.join(" ");
      const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      polygon.setAttribute("points", pointsStr);

      // 먼저 정확한 매칭 시도
      const normalizedKey = PolygonsManager.normalizePolygon(poly);
      let prevColor = this.polygonColorMap.get(pointsStr) || this.polygonColorMap.get(normalizedKey);

      // 정확한 매칭이 없으면 영역 기반 색상 상속
      if (!prevColor || prevColor === "transparent") {
        const inheritedColor = this.findInheritedColor(poly, existingPolygonData);
        if (inheritedColor) {
          prevColor = inheritedColor;
        }
      }

      polygon.setAttribute("fill", prevColor || "transparent");
      polygon.setAttribute("stroke", "none");
      polygon.setAttribute("pointer-events", "visiblePainted");
      polygon.setAttribute("data-polygon-id", index.toString());

      const capture = this;
      polygon.addEventListener("click", function (e) {
        if (!capture.isPaintModeActive()) {
          e.stopPropagation();
          return;
        }

        const currentFill = this.getAttribute("fill") || "transparent";
        const strokeColor = capture.getCurrentStrokeColor();
        const normalizedPolyKey = PolygonsManager.normalizePolygon(poly);

        // 현재 색상과 같은 색이 클릭되면 투명으로 변경
        if (currentFill === strokeColor) {
          this.setAttribute("fill", "transparent");
          capture.polygonColorMap.set(pointsStr, "transparent");
          capture.polygonColorMap.set(normalizedPolyKey, "transparent");
        } else {
          this.setAttribute("fill", strokeColor);
          capture.polygonColorMap.set(pointsStr, strokeColor);
          capture.polygonColorMap.set(normalizedPolyKey, strokeColor);
        }

        if (capture.svgManager && typeof capture.svgManager.checkBtnOkActive === "function") {
          capture.svgManager.checkBtnOkActive();
        }
        e.stopPropagation();
      });
      this.svg!.appendChild(polygon);
    });

    // 2) 기본 폴리곤 기준으로 라인에 polygon-id 부여
    this.assignPolygonIdsToLines(polygons);

    // 3) 아직 polygon-id가 없는 컬러 라인만으로 닫힌 루프를 찾아 추가 폴리곤 생성
    const extraPolygons = this.findClosedPolygonsFromIdLessColoredLines(polygons);
    let filteredExtraPolygons: string[][] = [];

    if (extraPolygons.length > 0) {
      const baseCount = polygons.length;

      // 추가 폴리곤들도 외곽 폴리곤 제거 적용
      filteredExtraPolygons = extraPolygons;
      if (extraPolygons.length > 1) {
        const originalExtraCount = extraPolygons.length;
        filteredExtraPolygons = this.removeOuterHull(extraPolygons);
        console.log(`[PolygonsManager] 추가 폴리곤 외곽 제거: ${originalExtraCount}개 → ${filteredExtraPolygons.length}개`);
      }

      filteredExtraPolygons.forEach((poly, i) => {
        const pointsStr = poly.join(" ");
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", pointsStr);

        // 먼저 정확한 매칭 시도
        const normalizedKey = PolygonsManager.normalizePolygon(poly);
        let prevColor = this.polygonColorMap.get(pointsStr) || this.polygonColorMap.get(normalizedKey);

        // 정확한 매칭이 없으면 영역 기반 색상 상속
        if (!prevColor || prevColor === "transparent") {
          const inheritedColor = this.findInheritedColor(poly, existingPolygonData);
          if (inheritedColor) {
            prevColor = inheritedColor;
          }
        }

        polygon.setAttribute("fill", prevColor || "transparent");
        polygon.setAttribute("stroke", "none");
        polygon.setAttribute("pointer-events", "visiblePainted");
        polygon.setAttribute("data-polygon-id", (baseCount + i).toString());

        const capture = this; // this 가 안먹힘
        const normalizedPolyKey = PolygonsManager.normalizePolygon(poly);

        polygon.addEventListener("click", function (e) {
          if (!capture.isPaintModeActive()) {
            e.stopPropagation();
            return;
          }

          const currentFill = this.getAttribute("fill") || "transparent";
          const strokeColor = capture.getCurrentStrokeColor();

          // 현재 색상과 같은 색이 클릭되면 투명으로 변경
          if (currentFill === strokeColor) {
            this.setAttribute("fill", "transparent");
            capture.polygonColorMap.set(pointsStr, "transparent");
            capture.polygonColorMap.set(normalizedPolyKey, "transparent");
          } else {
            this.setAttribute("fill", strokeColor);
            capture.polygonColorMap.set(pointsStr, strokeColor);
            capture.polygonColorMap.set(normalizedPolyKey, strokeColor);
          }

          if (capture.svgManager && typeof capture.svgManager.checkBtnOkActive === "function") {
            capture.svgManager.checkBtnOkActive();
          }
          e.stopPropagation();
        });
        this.svg!.appendChild(polygon);
      });

      this.assignPolygonIdsToLines(polygons.concat(filteredExtraPolygons));
    }

    const total = polygons.length + filteredExtraPolygons.length;
    if (this.svgManager && typeof this.svgManager.checkBtnOkActive === "function") {
      this.svgManager.checkBtnOkActive();
    }
    console.log("[PolygonsManager] 생성된 polygon 개수:", total);
  }

  /**
   * 컬러 라인들로부터 닫힌 루프를 탐지해 폴리곤 목록을 반환
   * - 투명/none 선과 외곽선(data-boundary)은 제외
   * - 라인 태그 중복을 고려하여 처리
   * - 기존 폴리곤과의 중복을 방지
   */
  private findClosedPolygonsFromIdLessColoredLines(existingPolygons: string[][] = []): string[][] {
    if (!this.svg) return [];

    // 모든 컬러 라인을 수집 (data-polygon-id 여부와 관계없이)
    const allColoredLines = Array.from(this.svg.querySelectorAll("line")).filter((line) => {
      const stroke = (line.getAttribute("stroke") || "").toLowerCase();
      const isColored = stroke && stroke !== "transparent" && stroke !== "none";
      const isBoundary = line.getAttribute("data-boundary") === "true";
      return isColored && !isBoundary;
    });

    // 라인 태그 중복을 제거하고 고유한 라인만 선택
    const uniqueLines = new Map<string, SVGLineElement>();

    allColoredLines.forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") || "0");
      const y1 = parseFloat(line.getAttribute("y1") || "0");
      const x2 = parseFloat(line.getAttribute("x2") || "0");
      const y2 = parseFloat(line.getAttribute("y2") || "0");

      // 양자화된 좌표로 키 생성
      const a = PolygonsManager.quantizePoint({ x: x1, y: y1 });
      const b = PolygonsManager.quantizePoint({ x: x2, y: y2 });

      // 두 방향 모두 고려 (시작점과 끝점을 바꿔서도 같은 라인으로 간주)
      const key1 = `${a.x},${a.y}-${b.x},${b.y}`;
      const key2 = `${b.x},${b.y}-${a.x},${a.y}`;

      if (!uniqueLines.has(key1) && !uniqueLines.has(key2)) {
        uniqueLines.set(key1, line);
      }
    });

    const candidates = Array.from(uniqueLines.values());

    if (candidates.length < 3) return [];

    // 세그먼트 수집
    const baseSegments = candidates
      .map((l) => {
        const x1 = parseFloat(l.getAttribute("x1") || "0");
        const y1 = parseFloat(l.getAttribute("y1") || "0");
        const x2 = parseFloat(l.getAttribute("x2") || "0");
        const y2 = parseFloat(l.getAttribute("y2") || "0");
        // 동일한 양자화 규칙 적용
        const a = PolygonsManager.quantizePoint({ x: x1, y: y1 });
        const b = PolygonsManager.quantizePoint({ x: x2, y: y2 });
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      })
      // 길이 0 세그먼트 제거
      .filter((s) => !(s.x1 === s.x2 && s.y1 === s.y2));

    if (baseSegments.length < 3) return [];

    // 포인트 모으기
    const pointSet = new Set<string>();
    baseSegments.forEach((seg) => {
      pointSet.add(PolygonsManager.keyOf(seg.x1, seg.y1));
      pointSet.add(PolygonsManager.keyOf(seg.x2, seg.y2));
    });

    // 교차점 계산 및 분할 준비
    const intersections: { x: number; y: number }[] = [];
    const seenIntersections = new Set<string>();
    for (let i = 0; i < baseSegments.length; i++) {
      for (let j = i + 1; j < baseSegments.length; j++) {
        const inter = PolygonsManager.getLineIntersection(baseSegments[i], baseSegments[j]);
        if (inter) {
          const key = PolygonsManager.keyOf(inter.x, inter.y);
          if (!seenIntersections.has(key)) {
            seenIntersections.add(key);
            intersections.push(inter);
          }
          pointSet.add(key);
        }
      }
    }

    // 교차점으로 세그먼트 분할
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const seg of baseSegments) {
      const pts = [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }, ...intersections.filter((p) => PolygonsManager.isPointOnSegment(p, seg))];

      const unique: { x: number; y: number }[] = [];
      const seen = new Set<string>();
      for (const p of pts) {
        const k = PolygonsManager.keyOf(p.x, p.y);
        if (!seen.has(k)) {
          seen.add(k);
          unique.push(p);
        }
      }

      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const lenSq = dx * dx + dy * dy || 1;
      const tOf = (p: { x: number; y: number }) => ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / lenSq;
      unique.sort((a, b) => tOf(a) - tOf(b));

      for (let i = 0; i < unique.length - 1; i++) {
        const a = PolygonsManager.quantizePoint(unique[i]);
        const b = PolygonsManager.quantizePoint(unique[i + 1]);
        segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }

    if (segments.length < 3) return [];

    const points = Array.from(pointSet);
    const coords = this.buildCoordinateMap(points);
    const { neighbors, directedEdges } = this.buildNeighborsAndEdges(segments, coords);
    this.sortNeighborsClockwise(neighbors);

    let polys = this.traceFaces(neighbors, coords, directedEdges);
    polys = polys.filter((poly) => PolygonsManager.isSimpleNonDegeneratePolygon(poly));

    if (polys.length === 0) return [];

    // 이미 존재하는 polygon과 중복 제거 (더 엄격한 체크)
    const existingPoints = new Set(Array.from(this.svg.querySelectorAll("polygon")).map((p) => p.getAttribute("points") || ""));
    
    // 전달받은 기존 폴리곤들도 중복 체크에 포함
    existingPolygons.forEach(poly => {
      existingPoints.add(poly.join(" "));
    });
    
    const result = polys.filter((poly) => {
      const polyStr = poly.join(" ");
      const normalizedPoly = PolygonsManager.normalizePolygon(poly);
      
      // 정확한 매칭과 정규화된 매칭 모두 체크
      const hasExactMatch = existingPoints.has(polyStr);
      const hasNormalizedMatch = Array.from(existingPoints).some(existing => {
        const existingArray = existing.trim().split(/\s+/);
        const existingNormalized = PolygonsManager.normalizePolygon(existingArray);
        return existingNormalized === normalizedPoly;
      });
      
      return !hasExactMatch && !hasNormalizedMatch;
    });
    return result;
  }

  private assignPolygonIdsToLines(polygons: string[][]): void {
    if (!this.svg) return;

    // 모든 라인의 data-polygon-id 속성 초기화
    this.svg.querySelectorAll("line").forEach((line) => {
      line.removeAttribute("data-polygon-id");
    });

    // 모든 컬러 라인을 수집 (drawnLines와 SVG에 있는 모든 라인 포함)
    const allColoredLines = Array.from(this.svg.querySelectorAll("line")).filter((line) => {
      const stroke = (line.getAttribute("stroke") || "").toLowerCase();
      const isColored = stroke && stroke !== "transparent" && stroke !== "none";
      const isBoundary = line.getAttribute("data-boundary") === "true";
      return isColored && !isBoundary;
    });

    // drawnLines도 포함
    const drawnLineElements = this.drawnLines.map((line) => line.element);

    // 중복 제거하여 모든 고유한 라인 수집
    const allLines = new Map<string, SVGLineElement>();

    // SVG에서 직접 찾은 라인들
    allColoredLines.forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") || "0");
      const y1 = parseFloat(line.getAttribute("y1") || "0");
      const x2 = parseFloat(line.getAttribute("x2") || "0");
      const y2 = parseFloat(line.getAttribute("y2") || "0");

      const a = PolygonsManager.quantizePoint({ x: x1, y: y1 });
      const b = PolygonsManager.quantizePoint({ x: x2, y: y2 });

      const key1 = `${a.x},${a.y}-${b.x},${b.y}`;
      const key2 = `${b.x},${b.y}-${a.x},${a.y}`;

      if (!allLines.has(key1) && !allLines.has(key2)) {
        allLines.set(key1, line);
      }
    });

    // drawnLines에서 누락된 라인들 추가
    drawnLineElements.forEach((line) => {
      const x1 = parseFloat(line.getAttribute("x1") || "0");
      const y1 = parseFloat(line.getAttribute("y1") || "0");
      const x2 = parseFloat(line.getAttribute("x2") || "0");
      const y2 = parseFloat(line.getAttribute("y2") || "0");

      const a = PolygonsManager.quantizePoint({ x: x1, y: y1 });
      const b = PolygonsManager.quantizePoint({ x: x2, y: y2 });

      const key1 = `${a.x},${a.y}-${b.x},${b.y}`;
      const key2 = `${b.x},${b.y}-${a.x},${a.y}`;

      if (!allLines.has(key1) && !allLines.has(key2)) {
        allLines.set(key1, line);
      }
    });

    const originalLines = Array.from(allLines.values()).map((line) => ({
      start: { x: parseFloat(line.getAttribute("x1") || "0"), y: parseFloat(line.getAttribute("y1") || "0") },
      end: { x: parseFloat(line.getAttribute("x2") || "0"), y: parseFloat(line.getAttribute("y2") || "0") },
      element: line,
    }));

    polygons.forEach((polygon, polygonIndex) => {
      for (let i = 0; i < polygon.length; i++) {
        const currentPoint = polygon[i];
        const nextPoint = polygon[(i + 1) % polygon.length];

        const matchingOriginalLine = this.findOriginalLineForSegment(currentPoint, nextPoint, originalLines);
        if (matchingOriginalLine) {
          const existingIds = matchingOriginalLine.getAttribute("data-polygon-id");
          if (existingIds) {
            const ids = existingIds.split(",").map((id: string) => id.trim());
            if (!ids.includes(polygonIndex.toString())) {
              ids.push(polygonIndex.toString());
              matchingOriginalLine.setAttribute("data-polygon-id", ids.join(","));
            }
          } else {
            matchingOriginalLine.setAttribute("data-polygon-id", polygonIndex.toString());
          }
        }
      }
    });
  }

  // 분할된 짧은 선분이 어떤 원본 line에 속하는지 판정하여 해당 SVGLineElement를 반환
  private findOriginalLineForSegment(
    point1: string,
    point2: string,
    originalLines: { start: { x: number; y: number }; end: { x: number; y: number }; element: SVGLineElement }[]
  ): SVGLineElement | null {
    const [x1, y1] = point1.split(",").map(Number);
    const [x2, y2] = point2.split(",").map(Number);

    const tolerance = 2.0;

    for (const originalLine of originalLines) {
      const isOnOriginalLine = this.isSegmentOnLine({ x: x1, y: y1 }, { x: x2, y: y2 }, originalLine.start, originalLine.end, tolerance);

      if (isOnOriginalLine) {
        return originalLine.element;
      }
    }

    return null;
  }

  // 짧은 선분이 주어진 원본 선 위에 놓여 있는지(허용 오차 포함)
  private isSegmentOnLine(
    segmentStart: { x: number; y: number },
    segmentEnd: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number },
    tolerance: number
  ): boolean {
    const startOnLine = this.isPointOnLine(segmentStart, lineStart, lineEnd, tolerance);
    const endOnLine = this.isPointOnLine(segmentEnd, lineStart, lineEnd, tolerance);

    return startOnLine && endOnLine;
  }

  private isPointOnLine(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }, tolerance: number): boolean {
    const distance = PolygonsManager.getDistanceToLine(lineStart, lineEnd, point);
    return distance <= tolerance;
  }

  // 점에서 선(직선)까지의 최단 거리
  private static getDistanceToLine(lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }, point: { x: number; y: number }): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;
    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 새로운 폴리곤이 기존 폴리곤의 영역 내부에 있는지 확인하여 색상을 상속받는 메서드
   * 새 폴리곤의 모든 정점이 기존 폴리곤 내부에 있으면 색상을 상속
   */
  private findInheritedColor(newPoly: string[], existingPolygonData: { points: string[]; fill: string }[]): string | null {
    // 새 폴리곤의 중심점 계산
    const newCentroid = PolygonsManager.getPolygonCentroid(newPoly);

    // 새 폴리곤의 모든 정점
    const newPoints = newPoly.map((pointStr) => {
      const [x, y] = pointStr.split(",").map(Number);
      return { x, y };
    });

    // 기존 폴리곤들 중에서 새 폴리곤을 포함하는 것 찾기
    for (const existing of existingPolygonData) {
      // 새 폴리곤의 중심점이 기존 폴리곤 내부에 있는지 확인
      const centroidInside = PolygonsManager.isPointInPolygon(newCentroid, existing.points);

      if (centroidInside) {
        // 추가로 새 폴리곤의 모든 정점이 기존 폴리곤 내부에 있는지 확인
        const allPointsInside = newPoints.every((point) => PolygonsManager.isPointInPolygon(point, existing.points));

        if (allPointsInside) {
          return existing.fill;
        }
      }
    }

    // 완전히 포함되지 않는 경우, 중심점만 확인하여 부분적으로 겹치는 경우도 처리
    for (const existing of existingPolygonData) {
      if (PolygonsManager.isPointInPolygon(newCentroid, existing.points)) {
        return existing.fill;
      }
    }

    return null;
  }

  // 현재 색칠 모드 버튼 확인
  private isPaintModeActive(): boolean {
    const paintBtn = document.querySelector(".paint-mode") as HTMLElement;
    return paintBtn && paintBtn.classList.contains("active");
  }

  // 현재 선택된 색상의 반환
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

    return colorMap[colorName] || "#000";
  }
}

