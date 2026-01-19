import type { Place } from "./PlaceUtils";

export interface BorrowStateSnapshot {
  isWaitingForBorrow: boolean;
  borrowFromPlace: Place | null;
  borrowedPlaces: Set<Place>;
  borrowCounts: Map<Place, number>;
  currentBorrowTarget: Place | null;
  isInBorrowProcess: boolean;
}

export default class StateManager {
  // 계산/애니메이션 상태
  private _isAnimating = false;
  private _isAutoCalculating = false;
  private _isCalculationComplete = false;
  private _currentStepIndex = 0;

  // 빌림 관련 상태
  private _isWaitingForBorrow = false;
  private _borrowFromPlace: Place | null = null;
  private _borrowedPlaces: Set<Place> = new Set();
  private _borrowCounts: Map<Place, number> = new Map();
  private _currentBorrowTarget: Place | null = null;
  private _isInBorrowProcess = false;

  // 계산 플래그 일괄 초기화
  resetCalcFlags() {
    this._isAutoCalculating = false;
    this._isAnimating = false;
    this._isCalculationComplete = false;
  }

  get isAnimating() {
    return this._isAnimating;
  }
  set isAnimating(v: boolean) {
    this._isAnimating = v;
  }

  get isAutoCalculating() {
    return this._isAutoCalculating;
  }
  set isAutoCalculating(v: boolean) {
    this._isAutoCalculating = v;
  }

  get isCalculationComplete() {
    return this._isCalculationComplete;
  }
  set isCalculationComplete(v: boolean) {
    this._isCalculationComplete = v;
  }

  get currentStepIndex() {
    return this._currentStepIndex;
  }
  set currentStepIndex(v: number) {
    this._currentStepIndex = v;
  }

  get isWaitingForBorrow() {
    return this._isWaitingForBorrow;
  }
  set isWaitingForBorrow(v: boolean) {
    this._isWaitingForBorrow = v;
  }

  get borrowFromPlace() {
    return this._borrowFromPlace;
  }
  set borrowFromPlace(v: Place | null) {
    this._borrowFromPlace = v;
  }

  get borrowedPlaces() {
    return this._borrowedPlaces;
  }

  get borrowCounts() {
    return this._borrowCounts;
  }

  get currentBorrowTarget() {
    return this._currentBorrowTarget;
  }
  set currentBorrowTarget(v: Place | null) {
    this._currentBorrowTarget = v;
  }

  get isInBorrowProcess() {
    return this._isInBorrowProcess;
  }
  set isInBorrowProcess(v: boolean) {
    this._isInBorrowProcess = v;
  }

  // Convenience state transitions
  startAutoCalc() {
    this._isAutoCalculating = true;
    this._isAnimating = false;
    this._isCalculationComplete = false;
  }
  finishCalc() {
    this._isAutoCalculating = false;
    this._isAnimating = false;
    this._isCalculationComplete = true;
  }
  startAnimating() {
    this._isAnimating = true;
  }
  stopAnimating() {
    this._isAnimating = false;
  }
  startBorrowProcess(from: Place) {
    this._isInBorrowProcess = true;
    this._isWaitingForBorrow = true;
    this._borrowFromPlace = from;
  }
  endBorrowProcess() {
    this._isInBorrowProcess = false;
    this._isWaitingForBorrow = false;
    this._borrowFromPlace = null;
  }

  resetBorrowState() {
    this._isWaitingForBorrow = false;
    this._borrowFromPlace = null;
    this._borrowedPlaces.clear();
    this._borrowCounts.clear();
    this._currentBorrowTarget = null;
    this._isInBorrowProcess = false;
  }

  getBorrowedCountsRecord(): Record<Place, number> {
    return {
      ones: this._borrowCounts.get("ones") || 0,
      tens: this._borrowCounts.get("tens") || 0,
      hundreds: this._borrowCounts.get("hundreds") || 0,
      thousands: this._borrowCounts.get("thousands") || 0,
    } as Record<Place, number>;
  }

  setBorrowedCountsFromRecord(updated: Record<Place, number>) {
    (Object.keys(updated) as Place[]).forEach((place) => {
      const value = updated[place] ?? 0;
      this._borrowCounts.set(place, value);
    });
  }

  snapshotBorrowState(): BorrowStateSnapshot {
    return {
      isWaitingForBorrow: this._isWaitingForBorrow,
      borrowFromPlace: this._borrowFromPlace,
      borrowedPlaces: new Set(this._borrowedPlaces),
      borrowCounts: new Map(this._borrowCounts),
      currentBorrowTarget: this._currentBorrowTarget,
      isInBorrowProcess: this._isInBorrowProcess,
    };
  }
}
