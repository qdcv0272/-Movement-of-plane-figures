import { type Place, shouldHideZeroForPlace as shouldHideZeroForPlaceUtil } from "../logic/PlaceUtils";
import { adjustLeftDigitForLowerBorrow } from "../logic/BorrowLogic";
import { hideZeroIfLeading } from "../logic/SubtractionEffects";

export interface SubtractionDeps {
  inputManager: {
    getNumberFromDisplays: (side: "left" | "right") => number;
  };
  calculationManager: {
    splitNumberByPlaces: (n: number) => { hundreds: number; tens: number; ones: number };
  };
  renderer: {
    placeLeftGroupForSubtraction: (numBox: Element, place: Place, value: number) => void;
    updateSubtractionCount: (numBox: Element, place: Place, remainingCount: number, shouldHideZero: (p: Place) => boolean) => void;
    prepareMergedFromVisible: (numBox: Element) => HTMLElement;
    appendMerged: (numBox: Element, place: Place, count: number) => void;
  };
  effects: {
    runSubtractionHighlightAndFade: (numBox: Element, place: Place, rightNumber: number, isAutoCalculating: boolean) => Promise<void>;
  };
  logic: {
    computeSubtractionDigitForPlace: (
      leftNumber: number,
      rightNumber: number,
      place: Place,
      borrowed: Record<Place, number>,
      borrowedPlaces: Set<Place>
    ) => number;
  };
  state: {
    isAutoCalculating: boolean;
    isCalculationComplete: boolean;
  };
  borrowedPlaces: Set<Place>;
  buildBorrowedCounts: () => Record<Place, number>;
}

export default class SubtractionFlow {
  private deps: SubtractionDeps;

  constructor(deps: SubtractionDeps) {
    this.deps = deps;
  }

  placeLeftGroup(place: Place): void {
    const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
    if (!numBox) return;
    const leftNumber = this.deps.inputManager.getNumberFromDisplays("left");
    const leftPlaces = this.deps.calculationManager.splitNumberByPlaces(leftNumber);
    // 하위 자리에서 빌림이 발생했으면 현재 자리의 왼쪽 값은 1 감소하여 보여줘야 함
    let baseValue = place === "ones" ? leftPlaces.ones : place === "tens" ? leftPlaces.tens : place === "hundreds" ? leftPlaces.hundreds : 0;
    if (place !== "ones") {
      baseValue = adjustLeftDigitForLowerBorrow(
        place,
        { ones: leftPlaces.ones, tens: leftPlaces.tens, hundreds: leftPlaces.hundreds },
        this.deps.borrowedPlaces
      );
    }
    this.deps.renderer.placeLeftGroupForSubtraction(numBox, place, baseValue);
    // 클릭 직후에는 0도 보여줘야 하므로 숨김 없이 표시
    this.deps.renderer.updateSubtractionCount(numBox, place, baseValue, () => false);
  }

  async applyVisual(place: Place): Promise<void> {
    const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
    if (!numBox) return;
    const rightNumber = this.getDigit(this.deps.inputManager.getNumberFromDisplays("right"), place);
    await this.deps.effects.runSubtractionHighlightAndFade(numBox, place, rightNumber, this.deps.state.isAutoCalculating);
    // 오른쪽 클릭 순간에는 카운트를 즉시 변경하지 않음(플리커 방지)
    return;
  }

  mergeGroups(place: Place, onComplete?: () => void): void {
    const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
    if (numBox) {
      // 기존 좌/우 그룹 제거(중복 노출 방지)
      numBox.querySelectorAll(".num-model-group.group-left, .num-model-group.group-right").forEach((g) => g.remove());
      (numBox as HTMLElement).classList.remove("has-both-groups");
      (numBox as HTMLElement).classList.add("merged-only");

      // 보이는 이미지를 그대로 쓸 수도 있지만, 결과 보존을 위해 최종 개수로 새로 구성한다
      const leftNumber = this.deps.inputManager.getNumberFromDisplays("left");
      const rightNumber = this.deps.inputManager.getNumberFromDisplays("right");
      const borrowed = this.deps.buildBorrowedCounts();
      const calculationResult = this.deps.logic.computeSubtractionDigitForPlace(leftNumber, rightNumber, place, borrowed, this.deps.borrowedPlaces);
      // 최종 결과 수만큼 이미지 보장
      this.deps.renderer.appendMerged(numBox, place, calculationResult);
      // 병합 직후에는 0도 임시로 보이도록 하고, 최종 단계에서만 숨김
      this.deps.renderer.updateSubtractionCount(numBox, place, calculationResult, () => false);

      // 중앙 정렬은 CSS로 처리 (JS 개입 제거)

      // 상위 자리의 선행 0은 최종 완료에서 숨김 처리하므로 여기서는 건드리지 않음
    }
    if (onComplete) onComplete();
  }

  updateAllPlaces(): void {
    const leftNumber = this.deps.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.deps.inputManager.getNumberFromDisplays("right");
    const result = leftNumber - rightNumber;
    const maxPlace = this.getMaxCalculationPlace();
    const places: Place[] = ["ones", "tens", "hundreds"];
    const maxIndex = places.indexOf(maxPlace);
    for (let i = 0; i <= maxIndex; i++) {
      const place = places[i];
      const resultDigit = this.getDigit(result, place);
      const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
      if (numBox) {
        this.updateCount(numBox, place, resultDigit);
        // 선행 0 숨김 처리(완료 타이밍용 보강)
        hideZeroIfLeading(numBox, place, result);
      }
    }
  }

  isCalculationComplete(): boolean {
    if (this.deps.state.isCalculationComplete) return true;
    // 빌림 관련 상태가 전부 해제되어야 함 (간단화: 호출부의 검증과 병행)
    return false;
  }

  // Helpers
  private updateCount(numBox: Element, place: Place, remainingCount: number): void {
    const leftNumber = this.deps.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.deps.inputManager.getNumberFromDisplays("right");
    const result = leftNumber - rightNumber;
    const shouldHideZero = (p: Place) => shouldHideZeroForPlaceUtil(result, p);
    this.deps.renderer.updateSubtractionCount(numBox, place, remainingCount, shouldHideZero);
  }

  private getDigit(n: number, place: Place): number {
    if (place === "ones") return n % 10;
    if (place === "tens") return Math.floor((n % 100) / 10);
    if (place === "hundreds") return Math.floor((n % 1000) / 100);
    return 0;
  }

  private getMaxCalculationPlace(): Place {
    // 간단화: hundreds까지만 고려 (기존 호출부와 동일)
    return "hundreds";
  }
}
