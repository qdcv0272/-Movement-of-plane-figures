import { PLACES, type Place } from "../logic/PlaceUtils";

type Side = "left" | "right";

export interface AutoCalculatorDeps {
  // Managers
  state: {
    isAnimating: boolean;
    isAutoCalculating: boolean;
    isCalculationComplete: boolean;
    currentStepIndex: number;
    startAutoCalc: () => void;
    finishCalc: () => void;
    resetCalcFlags: () => void;
  };
  uiManager: {
    setAutoCalcButtonState: (calculating: boolean) => void;
  };
  resultManager: {
    setResultBoxClickEnabled: (enabled: boolean) => void;
  };
  handGuide: {
    setAutoCalculating: (v: boolean) => void;
    stopAutoGuide: () => void;
  };
  userInputManager: {
    pause: () => void;
    disable: () => void;
  };

  // Orchestrator callbacks
  getMaxCalculationPlace: () => Place;
  resetResultScreenWithoutHandGuide: () => void | Promise<void>;
  handleResultBoxClickAsync: (box: Element, boxIdx: number, placeIdx: number) => Promise<void>;
  showCalculationResultPopup: () => void;
  getNextPlace: (place: Place) => Place | null;
  highlightCurrentNumBox: () => void;
  getBorrowToPlace: (from: Place) => Place | null;
  // Borrow helpers for subtraction auto-calc
  checkBorrowNeeded: (place: Place) => boolean;
  findNearestBorrowablePlace: (place: Place) => Place | null;
  autoPerformBorrow: (from: Place) => Promise<void>;

  // Ops for subtraction/addition flows used during animatePlaceValue
  placeNumModelInCalcContainer: (place: Place, side: Side) => void;
  placeNumModelInCalcContainerForSubtraction: (place: Place, side: Side) => void;
  applySubtractionVisualEffect: (place: Place, side: Side) => void;

  // Helpers
  addGlobalClickBlocker: (handler: (e: Event) => void) => void;
  isSubtractionOperator: () => boolean;
}

export default class AutoCalculator {
  private deps: AutoCalculatorDeps;

  constructor(deps: AutoCalculatorDeps) {
    this.deps = deps;
  }

  public async start(): Promise<void> {
    // 애니메이션 중이면 자동계산 시작하지 않음
    if (this.deps.state.isAnimating) return;

    // 계산이 완료된 상태에서 자동계산 버튼을 누르면 처음부터 다시 계산
    if (this.deps.state.isCalculationComplete) {
      await this.deps.resetResultScreenWithoutHandGuide();
      this.deps.state.isCalculationComplete = false;
      this.deps.state.currentStepIndex = 0;
      await new Promise((res) => setTimeout(res, 100));
    }

    // 이미 자동계산 중이면 중단
    if (this.deps.state.isAutoCalculating) return;

    // 상태가 이상한 경우 강제 초기화 (둘 다 true인 경우만)
    if (this.deps.state.isCalculationComplete && this.deps.state.isAutoCalculating) {
      this.deps.state.isCalculationComplete = false;
      this.deps.state.currentStepIndex = 0;
    }

    // 자동계산 시작 시 HandGuide 자동계산 상태 설정 및 입력 일시정지
    this.deps.handGuide.setAutoCalculating(true);
    this.deps.userInputManager.pause();

    const startIndex = Math.max(this.deps.state.currentStepIndex, 0);

    this.deps.state.startAutoCalc();
    this.deps.uiManager.setAutoCalcButtonState(true);

    // 계산이 필요한 최대 자리까지만 진행
    const maxPlace = this.deps.getMaxCalculationPlace();
    const maxIndex = PLACES.indexOf(maxPlace);

    for (let i = startIndex; i <= maxIndex; i++) {
      if (!this.deps.state.isAutoCalculating) return;
      await this.animatePlaceValue(i);
      // 리셋/중단이 루프 중에 발생했을 수 있으므로, 스텝 인덱스 갱신 전 재확인
      if (!this.deps.state.isAutoCalculating) return;
      this.deps.state.currentStepIndex = i + 1;
    }

    // 중간에 중단되었으면 여기서 종료
    if (!this.deps.state.isAutoCalculating) return;

    // 결과값 갱신 등 후처리(필요시)
    this.deps.state.resetCalcFlags();

    // 자동계산 완료 후 하이라이트 제거 및 HandGuide 정리
    this.deps.handGuide.setAutoCalculating(false);
    this.deps.userInputManager.disable();
    this.deps.state.finishCalc();

    // 계산 완료 후 digit-result-box 클릭 차단
    this.deps.resultManager.setResultBoxClickEnabled(false);

    // 잘못된 클릭 감지도 차단하기 위해 document 전체 클릭 이벤트 차단
    this.deps.addGlobalClickBlocker((e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest(".digit-result-box")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    });

    // HandGuide 타이머 완전 정지
    this.deps.handGuide.stopAutoGuide();

    // 자동계산 완료 후 버튼 이미지 원래대로 복원
    this.deps.uiManager.setAutoCalcButtonState(false);

    // 계산 완료 팝업 표시
    this.deps.showCalculationResultPopup();
  }

  private async animatePlaceValue(index: number) {
    if (!this.deps.state.isAutoCalculating) return;
    const place = PLACES[index];

    const maxPlace = this.deps.getMaxCalculationPlace();
    const maxIndex = PLACES.indexOf(maxPlace);
    if (index > maxIndex) return;

    if (index === 0) {
      if (!this.deps.state.isAutoCalculating) return;
      // ones 왼쪽
      const leftBox = document.querySelectorAll(".result-box")[0];
      const leftNodeList = leftBox.querySelectorAll(".digit-result-box");
      const leftDigitBox = leftNodeList[leftNodeList.length - 1];
      if (leftDigitBox) {
        await this.deps.handleResultBoxClickAsync(leftDigitBox, 0, 0);
        await new Promise((res) => setTimeout(res, 1700));
      }
      if (!this.deps.state.isAutoCalculating) return;

      // 뺄셈에서 빌림이 필요하면 자동으로 빌림 과정을 선행 수행
      if (this.deps.isSubtractionOperator && this.deps.isSubtractionOperator()) {
        // 빌림 UI 시각화를 잠시 보여주기 위해 약간의 딜레이를 포함
        await this.maybeAutoBorrowForPlace("ones");
        await new Promise((res) => setTimeout(res, 1000));
      }
      // ones 오른쪽
      const rightBox = document.querySelectorAll(".result-box")[1];
      const rightNodeList = rightBox.querySelectorAll(".digit-result-box");
      const rightDigitBox = rightNodeList[rightNodeList.length - 1];
      if (rightDigitBox) {
        await this.deps.handleResultBoxClickAsync(rightDigitBox, 1, 0);
        // 다음 자리 하이라이트로 전환된 후 지연을 줄이기 위해 최소 대기
        await new Promise((res) => setTimeout(res, 200));
      }
      return;
    }

    if (index === 1) {
      // 십의자리가 실제 활성화될 때까지 최대 800ms 폴링 대기 (조기 클릭 무시 방지)
      {
        const start = Date.now();
        while (Date.now() - start < 800) {
          const active = document.querySelector(".num-box.active");
          const isMatch = !!active && active.getAttribute("data-place") === `tens-result`;
          if (isMatch) break;
          await new Promise((res) => setTimeout(res, 30));
        }
      }
      // 덧셈의 경우, 십의자리 진입 템포를 조금 더 늦춰 자연스럽게 보이도록 대기 시간 확장
      if (!this.deps.isSubtractionOperator || !this.deps.isSubtractionOperator()) {
        await new Promise((res) => setTimeout(res, 1200));
      }
      if (!this.deps.state.isAutoCalculating) return;
      // tens 왼쪽
      const leftBox = document.querySelectorAll(".result-box")[0];
      const leftNodeList = leftBox.querySelectorAll(".digit-result-box");
      const leftDigitBox = leftNodeList[leftNodeList.length - 1 - 1];
      if (leftDigitBox) {
        await this.deps.handleResultBoxClickAsync(leftDigitBox, 0, 1);
        await new Promise((res) => setTimeout(res, 1200));
      }
      if (!this.deps.state.isAutoCalculating) return;

      if (this.deps.isSubtractionOperator && this.deps.isSubtractionOperator()) {
        await this.maybeAutoBorrowForPlace("tens");
        await new Promise((res) => setTimeout(res, 250));
      }
      // tens 오른쪽
      const rightBox = document.querySelectorAll(".result-box")[1];
      const rightNodeList = rightBox.querySelectorAll(".digit-result-box");
      const rightDigitBox = rightNodeList[rightNodeList.length - 1 - 1];
      if (rightDigitBox) {
        await this.deps.handleResultBoxClickAsync(rightDigitBox, 1, 1);
        await new Promise((res) => setTimeout(res, 1200));
      }
      return;
    }

    if (index === 2) {
      // 백의자리가 실제 활성화될 때까지 최대 800ms 폴링 대기
      {
        const start = Date.now();
        while (Date.now() - start < 800) {
          const active = document.querySelector(".num-box.active");
          const isMatch = !!active && active.getAttribute("data-place") === `hundreds-result`;
          if (isMatch) break;
          await new Promise((res) => setTimeout(res, 30));
        }
      }
      // 덧셈의 경우, 올림수가 백의자리로 막 올라온 뒤 템포 완화를 위해 짧은 정지
      if (!this.deps.isSubtractionOperator || !this.deps.isSubtractionOperator()) {
        await new Promise((res) => setTimeout(res, 500));
      }
      if (!this.deps.state.isAutoCalculating) return;
      // hundreds 왼쪽
      const leftBox = document.querySelectorAll(".result-box")[0];
      const leftNodeList = leftBox.querySelectorAll(".digit-result-box");
      const leftDigitBox = leftNodeList[leftNodeList.length - 1 - 2];
      if (leftDigitBox) {
        await this.deps.handleResultBoxClickAsync(leftDigitBox, 0, 2);
        await new Promise((res) => setTimeout(res, 1700));
      }
      if (!this.deps.state.isAutoCalculating) return;

      if (this.deps.isSubtractionOperator && this.deps.isSubtractionOperator()) {
        await this.maybeAutoBorrowForPlace("hundreds");
        await new Promise((res) => setTimeout(res, 600));
      }
      // hundreds 오른쪽
      const rightBox = document.querySelectorAll(".result-box")[1];
      const rightNodeList = rightBox.querySelectorAll(".digit-result-box");
      const rightDigitBox = rightNodeList[rightNodeList.length - 1 - 2];
      if (rightDigitBox) {
        await this.deps.handleResultBoxClickAsync(rightDigitBox, 1, 2);
        await new Promise((res) => setTimeout(res, 1700));
      }
      return;
    }

    // 기본: 왼쪽→오른쪽 순서로 클릭
    for (let boxIdx = 0; boxIdx < 2; boxIdx++) {
      if (!this.deps.state.isAutoCalculating) return;
      const side: Side = boxIdx === 0 ? "left" : "right";
      const progressState = (window as any).__numModelUIProgressState ?? null; // fallback 없으면 아래 로직이 처리
      // 아래는 기존 NumModel 로직과 동일하게 DOM 기반으로 계산
      const resultBox = document.querySelectorAll(".result-box")[boxIdx];
      const nodeList = resultBox.querySelectorAll(".digit-result-box");
      const box = nodeList[nodeList.length - 1 - index];
      if (box) {
        await this.deps.handleResultBoxClickAsync(box, boxIdx, index);
      }
    }
  }

  private async maybeAutoBorrowForPlace(place: Place): Promise<void> {
    // 현재 자리(place)에 대해 빌림이 필요하면 상위 자리에서 자동 빌림 수행
    // 연속 빌림(예: 200-199)도 while 루프로 처리
    try {
      // 연속 빌림 제어: 일의자리는 최대 2~3회(백→십, 십→일)까지, 그 외 자리는 1회만 수행
      const maxIter = place === "ones" ? 3 : 1;
      for (let iter = 0; iter < maxIter; iter++) {
        if (!this.deps.state.isAutoCalculating) return;
        const needs = this.deps.checkBorrowNeeded(place);
        if (!needs) return;
        const from = this.deps.findNearestBorrowablePlace(place);
        if (!from) return;
        await this.deps.autoPerformBorrow(from);
        // 빌림 후, 하위 자리 수치/이미지 반영 시간을 늘려 강조 (시각화 안정)
        await new Promise((res) => setTimeout(res, 800));
      }
    } catch {
      // 무시: 자동계산 연속 실행 안정성 우선
    }
  }
}

