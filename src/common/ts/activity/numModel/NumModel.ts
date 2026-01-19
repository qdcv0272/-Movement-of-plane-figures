import Page from "@ts/page";
import { fixRatio, sendMessage } from "@module/utilities/util";
import { getDigitAtPlace as getDigitAtPlaceUtil, shouldHideZeroForPlace as shouldHideZeroForPlaceUtil, PLACES, Place } from "./logic/PlaceUtils";
import {
  needsBorrow as needsBorrowLogic,
  getBorrowToPlace as getBorrowToPlaceLogic,
  getActualAvailableCount as getActualAvailableCountLogic,
  findBorrowablePlace as findBorrowablePlaceLogic,
  findNearestBorrowablePlace as findNearestBorrowablePlaceLogic,
  hasRemainingCalculation as hasRemainingCalculationLogic,
  applyBorrow as applyBorrowLogic,
  computeSubtractionDigitForPlace as computeSubtractionDigitForPlaceLogic,
} from "./logic/BorrowLogic";
import HandGuide from "./HandGuide";
import StateManager from "./logic/StateManager";
import NumModelRenderer from "./logic/NumModelRenderer";
import { changeToRedImage, changeToOriginalImage, runSubtractionHighlightAndFade } from "./logic/SubtractionEffects";
import PopupManager from "./logic/PopupManager";
import UserInputManager from "./UserInputManager";
import BorrowUIManager from "./logic/BorrowUIManager";
import InputManager from "./modules/InputManager";
import CalculationManager from "./modules/CalculationManager";
import AnimationManager from "./modules/AnimationManager";
import UIManager from "./modules/UIManager";
import ResultManager from "./modules/ResultManager";
import AutoCalculator from "./modules/AutoCalculator";
import SubtractionFlow from "./modules/SubtractionFlow";
import BorrowController from "./modules/BorrowController";

// 덧셈 뺄셈 기능 완료

// 자리 및 방향 타입 정의
type Side = "left" | "right";

// 연산자 타입 정의
type Operator = "+" | "-";

// 빼기 관련 타입 정의

// HandGuide 설정
const HANDGUIDE_CONFIG = {
  // 애니메이션 시간 설정 (ms)
  initialShowDuration: 1000, // 초기 가이드 표시 시간 (1초)
  clickAnimationDelay: 400, // 클릭 애니메이션 시작 전 대기 시간 (0.4초)
  clickHoldDuration: 500, // 클릭 상태 유지 시간 (0.5초)
  clickReleaseDelay: 500, // 클릭 해제 후 대기 시간 (0.5초)
  betweenClicksDelay: 300, // 클릭 사이 대기 시간 (0.3초)

  // 자동 가이드 설정
  autoGuideDelay: 5000, // 자동 가이드 주기 (5초)
  wrongClickThreshold: 2, // 잘못된 클릭 2회 시 가이드 표시
} as const;

interface ProgressState {
  currentPlace: Place;
  clicked: {
    ones: { left: boolean; right: boolean };
    tens: { left: boolean; right: boolean };
    hundreds: { left: boolean; right: boolean };
    thousands: { left: boolean; right: boolean };
  };
}

export default class NumModel extends Page {
  // progressState는 UIManager에서 관리
  private tensCarryCount: number = 0; // 십의자리 자리올림 개수
  private hundredsCarryCount: number = 0; // 백의자리 자리올림 개수
  private state: StateManager = new StateManager();
  private renderer: NumModelRenderer = new NumModelRenderer();
  private popupManager: PopupManager = new PopupManager();
  private borrowUI: BorrowUIManager = new BorrowUIManager({
    onBorrowImageClick: (borrowFromPlace, clickedImage) => this.handleBorrowClick(borrowFromPlace, clickedImage),
  });
  private get isAnimating() {
    return this.state.isAnimating;
  }
  private set isAnimating(v: boolean) {
    this.state.isAnimating = v;
  }
  // 클래스 멤버에 상태 변수 추가
  private get currentStepIndex(): number {
    return this.state.currentStepIndex;
  }
  private set currentStepIndex(v: number) {
    this.state.currentStepIndex = v;
  }
  private get isAutoCalculating() {
    return this.state.isAutoCalculating;
  }
  private set isAutoCalculating(v: boolean) {
    this.state.isAutoCalculating = v;
  }
  // 클래스 멤버에 추가
  private animationTimeouts: (number | ReturnType<typeof setTimeout>)[] = [];
  private get isCalculationComplete() {
    return this.state.isCalculationComplete;
  }
  private set isCalculationComplete(v: boolean) {
    this.state.isCalculationComplete = v;
  }
  private preventClickHandler: ((e: Event) => void) | null = null; // 클릭 차단 핸들러
  private get isWaitingForBorrow() {
    return this.state.isWaitingForBorrow;
  }
  private set isWaitingForBorrow(v: boolean) {
    this.state.isWaitingForBorrow = v;
  }
  private get borrowFromPlace() {
    return this.state.borrowFromPlace;
  }
  private set borrowFromPlace(v: Place | null) {
    this.state.borrowFromPlace = v;
  }
  private get borrowedPlaces() {
    return this.state.borrowedPlaces;
  }
  private get borrowCounts() {
    return this.state.borrowCounts;
  }
  private get currentBorrowTarget() {
    return this.state.currentBorrowTarget;
  }
  private set currentBorrowTarget(v: Place | null) {
    this.state.currentBorrowTarget = v;
  }
  private get isInBorrowProcess() {
    return this.state.isInBorrowProcess;
  }
  private set isInBorrowProcess(v: boolean) {
    this.state.isInBorrowProcess = v;
  }

  // 빌림 카운트 맵을 레코드로 생성하는 헬퍼
  private buildBorrowedCounts(): Record<Place, number> {
    return this.state.getBorrowedCountsRecord();
  }

  // 빌림 카운트를 Record에서 내부 Map으로 동기화
  private syncBorrowCountsFromRecord(updated: Record<Place, number>): void {
    this.state.setBorrowedCountsFromRecord(updated);
  }

  // 자리별 결과용 num-box 반환
  private numBoxFor(place: Place): HTMLElement | null {
    return this.renderer.numBoxFor(place);
  }

  // 지정한 쪽의 그룹이 없으면 생성 후 반환
  private ensureGroup(numBox: HTMLElement, side: Side, place: Place): HTMLElement {
    return this.renderer.ensureGroup(numBox, side, place);
  }

  // 그룹에 이미지 추가
  private appendImagesToGroup(group: HTMLElement, imageName: string, count: number, startIndex: number, altLabel: string): void {
    this.renderer.appendImagesToGroup(group, imageName, count, startIndex, altLabel);
  }

  // 10개 초과 시 좌/우 그룹으로 분리하고 기존 이미지는 복제하여 배치, 새로 추가되는 이미지는 오른쪽에 배치
  private splitGroupsAndDistribute(
    numBox: HTMLElement,
    existingImages: NodeListOf<Element>,
    place: Place,
    imageName: string,
    startIndex: number,
    newCount: number,
    altLabel: string
  ): void {
    this.renderer.splitGroupsAndDistribute(numBox, existingImages, place, imageName, startIndex, newCount, altLabel);
  }

  // 모듈 멤버들
  private handGuide: HandGuide;
  private userInputManager: UserInputManager;
  private inputManager: InputManager;
  private calculationManager: CalculationManager;
  private animationManager: AnimationManager;
  private uiManager: UIManager;
  private resultManager: ResultManager;
  // 메모이즈된 플로우/컨트롤러 인스턴스
  private _subtractionFlow?: SubtractionFlow;
  private _borrowController?: BorrowController;
  private _autoCalculator?: AutoCalculator;

  constructor(props: PageProps) {
    super(props);
    // HandGuide를 #wrap 내부에 추가하여 콘텐츠 스케일에 함께 반응하도록 변경
    const wrapEl = document.querySelector("#wrap") as HTMLElement;
    this.handGuide = new HandGuide(wrapEl || document.body, {
      initialShowDuration: HANDGUIDE_CONFIG.initialShowDuration,
      clickAnimationDelay: HANDGUIDE_CONFIG.clickAnimationDelay,
      clickHoldDuration: HANDGUIDE_CONFIG.clickHoldDuration,
      clickReleaseDelay: HANDGUIDE_CONFIG.clickReleaseDelay,
      betweenClicksDelay: HANDGUIDE_CONFIG.betweenClicksDelay,
    });

    // HandGuide 애니메이션 완료 콜백 설정
    this.handGuide.setAnimationCompleteCallback(() => {
      // 애니메이션이 끝난 후 자동 가이드 타이머 재시작
      this.userInputManager.restartAutoGuideTimer();
    });

    // UserInputManager 초기화
    this.userInputManager = new UserInputManager({
      correctSelectors: [".digit-result-box"],
      excludeSelectors: [".btn-auto-calc", ".btn-result-reset", ".btn-home", "header .home-box .home", "header .title-box"],
      autoGuideDelay: HANDGUIDE_CONFIG.autoGuideDelay,
      wrongClickThreshold: HANDGUIDE_CONFIG.wrongClickThreshold,
    });

    // 이벤트 핸들러 등록
    this.userInputManager.setEventHandlers(
      () => this.handleWrongClick(),
      () => this.handleCorrectClick(),
      () => this.showHandGuideForCurrentPlace()
    );

    // InputManager 초기화
    this.inputManager = new InputManager({
      onOperatorChange: (operator: Operator | "") => {
        // 연산자 변경 시 필요한 처리
      },
      onCalculate: () => {
        this.calculate();
      },
      onReset: () => {
        this.reset();
      },
      onPlaceImages: (place: string, number: number, isResultScreen: boolean) => {
        this.inputManager.placeImages(place, number, isResultScreen);
      },
    });

    // CalculationManager 초기화
    this.calculationManager = new CalculationManager({
      onShowModal: (message: string) => {
        this.showModal(message);
      },
      onShowResultScreen: (left: number, operator: string, right: number) => {
        this.showResultScreen(left, operator, right);
      },
      inputManager: this.inputManager,
    });

    // AnimationManager 초기화
    this.animationManager = new AnimationManager({
      onAnimationComplete: () => {
        // 애니메이션 완료 시 처리
      },
      onStepComplete: (step: number) => {
        // 단계별 완료 시 처리
      },
    });

    // UIManager 초기화
    this.uiManager = new UIManager({
      onPlaceChange: (place: Place) => {
        // 자리 변경 시 처리
        this.highlightCurrentNumBox();
        // 기대 대상 마커 갱신
        this.updateExpectedTargetMarker();
      },
      onStateChange: (state: ProgressState) => {
        // 뺄셈에서 현재 자리의 좌/우가 모두 클릭 완료된 순간에는
        // 잠깐의 과도기(자리 이동 전) 하이라이트 깜빡임을 방지하기 위해 갱신을 건너뛴다.
        const op = this.inputManager.getSelectedOperator();
        const currentPlaceForGuard = this.uiManager.getCurrentPlace();
        const psGuard = this.uiManager.getProgressState();
        const finishedBothSidesAtCurrent = op === "-" && psGuard.clicked[currentPlaceForGuard].left && psGuard.clicked[currentPlaceForGuard].right;
        if (!finishedBothSidesAtCurrent) {
          // 상태 변경 시 기대 대상 마커 갱신
          this.updateExpectedTargetMarker();
          // 클릭 진행 상태에 맞춰 결과 박스 활성/회색 처리 동기화
          const nextTarget = op === "-" ? this.getNextGuideTargetElement() : this.getNextGuideDigitBox();
          let targetDigitBox = (nextTarget?.closest?.(".digit-result-box") as HTMLElement | null) || null;
          if (!targetDigitBox && op === "-" && (this.isInBorrowProcess || this.isWaitingForBorrow)) {
            const from = this.borrowFromPlace;
            if (from) targetDigitBox = this.getDigitResultBox(from, "left");
          }
          this.uiManager.setActiveDigitResultBox(targetDigitBox);
        }
      },
    });

    // ResultManager 초기화 (렌더러 주입)
    this.resultManager = new ResultManager(
      {
        onResultBoxClick: (box: Element, boxIdx: number, placeIdx: number) => {
          this.handleResultBoxClick(box, boxIdx, placeIdx);
        },
      },
      this.renderer
    );

    // 결과 화면 버튼 바인딩을 UIManager로 위임
    this.uiManager.bindResultScreenButtons({
      onAutoCalc: () => {
        if (this.isAutoCalculating || this.isAnimating) return;
        this.autoCalculateAll();
      },
      onReset: () => {
        this.closeCalculationResultPopup();
        this.state.resetCalcFlags();
        this.state.stopAnimating();
        this.state.resetBorrowState();
        this.isCalculationComplete = false;
        this.resetResultScreen();
      },
      onHome: () => {
        this.closeCalculationResultPopup();
        this.state.resetCalcFlags();
        this.state.stopAnimating();
        this.goToHome();
      },
    });
  }

  public override init(): void {
    super.init();

    // InputManager 초기화
    this.inputManager.init();

    // 결과화면 관련 설정
    this.setupResultBoxClick(); // 자리 클릭 이벤트 등록
    this.highlightCurrentNumBox(); // 초기 하이라이트
    // 초기 기대 대상 마커 세팅
    this.updateExpectedTargetMarker();
  }

  protected override hnMessage(e: Event): void {
    super.hnMessage(e);
    const event = e as CustomEvent;
    const data = event.detail;
    switch (data.message) {
      case "CONTENT_RESIZE":
        this.handleResize();
        break;
    }
  }

  /**
   * 리사이즈 이벤트 처리 - 새로운 형태
   */
  private handleResize(): void {
    // fixRatio를 사용한 리사이즈 처리 - wrap 요소 사용
    const wrapElement = document.querySelector("#wrap") as HTMLElement;
    if (wrapElement) {
      fixRatio({
        root: wrapElement,
        stageSize: { width: 1280, height: 720 },
        cb: (params) => {
          (window as unknown as { zoom?: number }).zoom = params.zoom;
          (window as unknown as { resizeData?: unknown }).resizeData = params;
        },
      });
    }

    // 리사이즈 메시지 전송
    sendMessage(window, {
      type: "CONTENT_RESIZE",
      module: this,
    });
  }

  /**
   * 전체 팝업(모달) 표시 함수
   */
  private showModal(message: string): void {
    this.uiManager.showModal(message);
  }

  private hideModal(): void {
    this.uiManager.hideModal();
  }

  private showResultScreen(left: number, operator: string, right: number): void {
    // 새로운 결과화면 진입 시 모든 상태 초기화
    // 자동계산 중에는 결과화면 재초기화 금지 (중단 유발)
    if (!this.isAutoCalculating) {
      this.currentStepIndex = 0;
      this.state.resetCalcFlags();
    }

    // 입력화면의 image-container 이미지 즉시 제거
    document.querySelectorAll(".container .image-container").forEach((el) => {
      el.innerHTML = "";
    });

    // ResultManager를 통한 결과 화면 표시
    this.resultManager.showResultScreen();
    this.resultManager.setFixedButtonsVisibility(true);
    this.resultManager.setResultScreenValues(left, operator, right);

    // 뺄셈 특수분기: 하위 자리가 0이면 시작 자리를 건너뛰어 바로 십/백의자리부터 시작
    if (operator === "-") {
      this.setInitialPlaceForSubtractionStart(left, right);
      this.highlightCurrentNumBox();
    }

    // HandGuide 상태 초기화 및 시작
    this.handGuide.setAutoCalculating(false); // 자동계산 상태 해제
    this.initializeHandGuide();

    // 수 모형 이미지 표시
    const leftPlaces = this.calculationManager.splitNumberByPlaces(left);
    const rightPlaces = this.calculationManager.splitNumberByPlaces(right);

    // 왼쪽 수 모형 이미지 표시
    this.inputManager.placeImages("hundreds-left", leftPlaces.hundreds, true);
    this.inputManager.placeImages("tens-left", leftPlaces.tens, true);
    this.inputManager.placeImages("ones-left", leftPlaces.ones, true);

    // 오른쪽 수 모형 이미지 표시
    this.inputManager.placeImages("hundreds-right", rightPlaces.hundreds, true);
    this.inputManager.placeImages("tens-right", rightPlaces.tens, true);
    this.inputManager.placeImages("ones-right", rightPlaces.ones, true);

    // 빼기 연산인 경우 결과 자리에도 이미지 배치
    if (operator === "-") {
      this.inputManager.placeImages("hundreds-result", leftPlaces.hundreds, true);
      this.inputManager.placeImages("tens-result", leftPlaces.tens, true);
      this.inputManager.placeImages("ones-result", leftPlaces.ones, true);
    }
  }

  /**
   * 계산하기
   */
  private calculate(): void {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const selectedOperator = this.inputManager.getSelectedOperator();

    // CalculationManager를 통한 계산 실행
    const calculationResult = this.calculationManager.calculate(leftNumber, rightNumber, selectedOperator);

    if (!calculationResult.isValid) {
      this.showModal(calculationResult.errorMessage || "계산할 수 없습니다");
      return;
    }

    // 결과 화면으로 전환 및 값 표시 (왼쪽, 연산자, 오른쪽)
    // 자동계산 중이면 전환을 보류하여 흐름을 깨지 않도록 함
    if (!this.isAutoCalculating) {
      this.showResultScreen(leftNumber, selectedOperator, rightNumber);
    } else {
      console.warn("[NumModel.calculate] showResultScreen skipped during auto-calc");
    }
  }

  /**
   * 다시하기 (리셋)
   */
  public reset(): void {
    // InputManager를 통한 입력 화면 리셋
    this.inputManager.resetInputScreen();

    // 결과 화면 자리 클릭 상태 초기화
    this.uiManager.resetProgressState();
    this.tensCarryCount = 0; // 십의자리 자리올림 개수 초기화
    this.hundredsCarryCount = 0; // 백의자리 자리올림 개수 초기화
    // 뺄셈 특수분기: 하위 자리가 0이면 시작 자리를 건너뛰어 바로 십/백의자리부터 시작
    const operatorForReset = this.inputManager.getSelectedOperator();
    if (operatorForReset === "-") {
      const leftNum = this.inputManager.getNumberFromDisplays("left");
      const rightNum = this.inputManager.getNumberFromDisplays("right");
      this.setInitialPlaceForSubtractionStart(leftNum, rightNum);
    }
    this.highlightCurrentNumBox(); // 초기 하이라이트

    // 모든 상태 플래그 확실히 초기화 (handleResultBoxClick에서 체크하는 모든 상태)
    this.currentStepIndex = 0;
    this.state.resetCalcFlags();
    this.state.resetBorrowState();

    // digit-result-box 클릭 다시 활성화 및 결과 이미지 컨테이너 초기화 (ResultManager 위임)
    this.resultManager.resetResultScreen();

    // 계산 완료 시 추가된 클릭 차단 이벤트 리스너 제거
    if (this.preventClickHandler) {
      document.removeEventListener("click", this.preventClickHandler, true);
      this.preventClickHandler = null;
    }

    // 자동계산 버튼 이미지 원래대로 복원 (UIManager 위임)
    this.uiManager.setAutoCalcButtonState(false);

    // 기존 예약된 애니메이션 타임아웃 모두 clear
    this.animationTimeouts.forEach((id) => clearTimeout(id as number));
    this.animationTimeouts = [];

    // HandGuide 정리
    this.handGuide.hide();
    this.userInputManager.stop();

    // 결과화면으로 돌아왔을 때 HandGuide 재시작
    const resultScreenForReset = document.querySelector(".result-screen") as HTMLElement;
    if (resultScreenForReset && getComputedStyle(resultScreenForReset).visibility === "visible") {
      this.initializeHandGuide();
    }
  }

  private resetResultScreen() {
    // 모든 상태 플래그 즉시 중단
    this.state.resetCalcFlags();

    // 모든 setTimeout 중단
    this.animationTimeouts.forEach((id) => {
      if (typeof id === "number") {
        clearTimeout(id);
      } else {
        clearTimeout(id as unknown as number);
      }
    });
    this.animationTimeouts = [];

    // 모든 GSAP 애니메이션 중단
    this.animationManager.stopAllAnimations();

    // ResultManager를 통한 결과 화면 초기화
    this.resultManager.resetResultScreen();

    // 상단 digit-result-box의 수모형 이미지 복구 (좌/우 원래 값 기준)
    const leftNumberAfterReset = this.inputManager.getNumberFromDisplays("left");
    const rightNumberAfterReset = this.inputManager.getNumberFromDisplays("right");
    const leftPlacesAfterReset = this.calculationManager.splitNumberByPlaces(leftNumberAfterReset);
    const rightPlacesAfterReset = this.calculationManager.splitNumberByPlaces(rightNumberAfterReset);
    // 왼쪽
    this.inputManager.placeImages("hundreds-left", leftPlacesAfterReset.hundreds, true);
    this.inputManager.placeImages("tens-left", leftPlacesAfterReset.tens, true);
    this.inputManager.placeImages("ones-left", leftPlacesAfterReset.ones, true);
    // 오른쪽
    this.inputManager.placeImages("hundreds-right", rightPlacesAfterReset.hundreds, true);
    this.inputManager.placeImages("tens-right", rightPlacesAfterReset.tens, true);
    this.inputManager.placeImages("ones-right", rightPlacesAfterReset.ones, true);

    // 클릭 진행 상태 초기화
    this.uiManager.resetProgressState();
    // 뺄셈 특수분기: 하위 자리가 0이면 시작 자리를 건너뛰어 바로 십/백의자리부터 시작
    const operatorForResetScreen = this.inputManager.getSelectedOperator();
    if (operatorForResetScreen === "-") {
      const leftNumForResetScreen = this.inputManager.getNumberFromDisplays("left");
      const rightNumForResetScreen = this.inputManager.getNumberFromDisplays("right");
      this.setInitialPlaceForSubtractionStart(leftNumForResetScreen, rightNumForResetScreen);
    }

    // 모든 카운터 초기화
    this.tensCarryCount = 0;
    this.hundredsCarryCount = 0;
    this.currentStepIndex = 0;

    // 빌림 관련 상태 초기화
    this.state.resetBorrowState();

    // 하이라이트 초기화
    this.highlightCurrentNumBox();

    // 버튼 상태 초기화 (UIManager 위임)
    this.uiManager.setButtonState(".btn-result-reset", false);

    // 계산 완료 시 추가된 클릭 차단 이벤트 리스너 제거
    if (this.preventClickHandler) {
      document.removeEventListener("click", this.preventClickHandler, true);
      this.preventClickHandler = null;
    }

    // digit-result-box 클릭 다시 활성화 (ResultManager 위임)
    this.resultManager.setResultBoxClickEnabled(true);

    // 자동계산 버튼 이미지 원래대로 복원 (UIManager 위임)
    this.uiManager.setAutoCalcButtonState(false);

    // HandGuide 재시작
    this.handGuide.setAutoCalculating(false);
    this.userInputManager.stop();
    this.initializeHandGuide();

    // UserInputManager 재시작 (수동입력 활성화)
    const resultScreen = document.querySelector(".result-screen") as HTMLElement;
    if (resultScreen) {
      this.userInputManager.start(resultScreen);
      // 잘못된 클릭 카운터 리셋
      this.userInputManager.reset();
    }

    // digit-result-box 클릭 다시 활성화
    this.resultManager.setResultBoxClickEnabled(true);
  }

  // HandGuide 재시작 없이 결과화면만 리셋 (처음으로 버튼용)
  private resetResultScreenWithoutHandGuide() {
    // 모든 상태 플래그 즉시 중단
    this.state.resetCalcFlags();

    // 모든 setTimeout 중단
    this.animationTimeouts.forEach((id) => {
      if (typeof id === "number") {
        clearTimeout(id);
      } else {
        clearTimeout(id as unknown as number);
      }
    });
    this.animationTimeouts = [];

    // 모든 GSAP 애니메이션 중단
    this.animationManager.stopAllAnimations();

    // num-box 내부 그룹/이미지/카운트 텍스트 초기화 (렌더러 위임)
    document.querySelectorAll(".num-box").forEach((box) => {
      this.renderer.resetNumBox(box);
    });

    // 모든 carry-group 제거 (올림수 애니메이션 중인 요소들) - 렌더러 위임
    this.renderer.removeAllCarryGroups();

    // 클릭 진행 상태 초기화
    this.uiManager.resetProgressState();
    // 뺄셈 특수분기: 하위 자리가 0이면 시작 자리를 건너뛰어 바로 십/백의자리부터 시작
    const operatorForRstNoGuide = this.inputManager.getSelectedOperator();
    if (operatorForRstNoGuide === "-") {
      const leftNumNoGuide = this.inputManager.getNumberFromDisplays("left");
      const rightNumNoGuide = this.inputManager.getNumberFromDisplays("right");
      this.setInitialPlaceForSubtractionStart(leftNumNoGuide, rightNumNoGuide);
    }

    // 모든 카운터 초기화
    this.tensCarryCount = 0;
    this.hundredsCarryCount = 0;
    this.currentStepIndex = 0;
    this.state.resetBorrowState();

    // 계산 완료 상태도 명시적으로 초기화
    this.isCalculationComplete = false;

    // 하이라이트 초기화
    this.highlightCurrentNumBox();

    // 버튼 상태 초기화 (UIManager 위임)
    this.uiManager.setButtonState(".btn-result-reset", false);

    // 계산 완료 시 추가된 클릭 차단 이벤트 리스너 제거
    if (this.preventClickHandler) {
      document.removeEventListener("click", this.preventClickHandler, true);
      this.preventClickHandler = null;
    }

    // digit-result-box 클릭 다시 활성화 (ResultManager 위임)
    this.resultManager.setResultBoxClickEnabled(true);

    // 자동계산 버튼 이미지 원래대로 복원 (UIManager 위임)
    this.uiManager.setAutoCalcButtonState(false);

    // HandGuide 자동계산 상태 해제 (처음으로 버튼이므로)
    this.handGuide.setAutoCalculating(false);
  }

  private resetInputScreen() {
    // InputManager를 통한 입력 화면 리셋
    this.inputManager.resetInputScreen();

    this.currentStepIndex = 0;
    this.state.resetCalcFlags();

    // 고정 버튼들 숨기기 (ResultManager 위임)
    this.resultManager.setFixedButtonsVisibility(false);
  }

  private goToHome() {
    // 모든 상태 플래그 즉시 중단
    this.state.resetCalcFlags();
    this.state.stopAnimating();
    this.isCalculationComplete = false; // 계산 완료 상태도 초기화

    // 모든 setTimeout 중단
    this.animationTimeouts.forEach((id) => {
      if (typeof id === "number") {
        clearTimeout(id);
      } else {
        clearTimeout(id as unknown as number);
      }
    });
    this.animationTimeouts = [];

    // 모든 GSAP 애니메이션 중단
    this.animationManager.stopAllAnimations();

    // 모든 carry-group 제거 (올림수 애니메이션 중인 요소들) - 렌더러 위임
    this.renderer.removeAllCarryGroups();

    // 결과화면 숨기고 입력화면 보이기 (UIManager 위임)
    this.uiManager.showInputScreen();

    // 입력화면(문제입력)도 완전 초기화
    this.resetInputScreen();

    // 결과화면(num-box 등)도 완전 초기화 (HandGuide 재시작 없이)
    this.resetResultScreenWithoutHandGuide();

    // HandGuide 완전 정리 (입력화면으로 가므로 재시작하지 않음)
    this.handGuide.setAutoCalculating(true); // 먼저 자동계산 상태로 설정하여 애니메이션 차단
    this.handGuide.forceStop(); // HandGuide 강제 정지 (애니메이션 중에도)
    this.handGuide.stopAutoGuide(); // HandGuide 타이머 완전 정지
    this.handGuide.hide(); // HandGuide 즉시 숨기기
    this.userInputManager.stop(); // UserInputManager 완전 정지

    // 계산 완료 시 추가된 클릭 차단 이벤트 리스너 제거
    if (this.preventClickHandler) {
      document.removeEventListener("click", this.preventClickHandler, true);
      this.preventClickHandler = null;
    }

    // digit-result-box 클릭 다시 활성화 (ResultManager 위임)
    this.resultManager.setResultBoxClickEnabled(true);
  }

  // digit-result-box 클릭 이벤트 등록
  private setupResultBoxClick() {
    this.resultManager.setupResultBoxClick((box, boxIdx, placeIdx) => {
      this.handleResultBoxClick(box, boxIdx, placeIdx);
    });
  }

  // 클릭 핸들러
  private handleResultBoxClick(box: Element, boxIdx: number, placeIdx: number) {
    if (this.isAnimating) {
      return; // 애니메이션 중이면 입력 무시
    }
    if (this.isCalculationComplete) {
      return; // 계산이 완료되었으면 입력 무시
    }
    if (this.isAutoCalculating) {
      return; // 자동계산 중이면 입력 무시
    }
    const place: Place = PLACES[placeIdx]; // 0: ones, 1: tens, 2: hundreds
    const side: Side = boxIdx === 0 ? "left" : "right"; // 첫번째 result-box: left, 두번째: right

    // 수모형 제거는 올바른 차례의 클릭이 수용된 후에만 수행 (아래에서 처리)

    // 기대 대상이 아니면 처리하지 않도록 하는 가드는 뺄셈에서만 적용
    const expected = this.getNextGuideTargetElement();
    if (this.inputManager.getSelectedOperator() === "-" && expected) {
      const clickedEl = box as HTMLElement;
      const isExpected = expected === clickedEl || expected.contains(clickedEl) || clickedEl.contains(expected);
      if (!isExpected) {
        // 뺄셈에서 기대 대상이 아닌 곳을 클릭하면 오답 카운팅만 하고, 나머지 가드 로직에 따라 팝업이 표시되도록 계속 진행
        this.userInputManager.reportWrongClick();
      }
    }

    // 빼기/더하기 연산자 확인
    const selectedOperator = this.inputManager.getSelectedOperator();

    // 우선 가드(같은 자리에서만): 기본적으로 같은 자리의 오른쪽을 먼저 클릭하면 경고
    // 단, "마지막 백의자리 단계"이고 하위 자리(일/십)가 모두 완료되었으며 백의자리에서 빌림이 필요 없는 경우에만
    // 왼쪽을 자동 확정 처리하고 진행을 허용한다. (다른 자리는 항상 왼쪽을 먼저 클릭해야 함)
    const progressStateForGuard = this.uiManager.getProgressState();
    if (selectedOperator === "-" && side === "right" && !progressStateForGuard.clicked[place].left && place === this.uiManager.getCurrentPlace()) {
      const ps = this.uiManager.getProgressState();
      const isTensStageDoneOnes = place === "tens" && ps.clicked.ones.left && ps.clicked.ones.right;
      const isOnesBorrowed = place === "tens" && this.borrowedPlaces.has("ones");
      const allowTensAuto = isTensStageDoneOnes && isOnesBorrowed && !this.checkBorrowNeeded("tens");

      const isHundredsFinal = place === "hundreds" && ps.clicked.ones.left && ps.clicked.ones.right && ps.clicked.tens.left && ps.clicked.tens.right;
      const wasHundredsBorrowedToTens = place === "hundreds" && this.borrowedPlaces.has("tens");
      const allowHundredsAuto = isHundredsFinal && wasHundredsBorrowedToTens && !this.checkBorrowNeeded("hundreds");

      if (allowTensAuto || allowHundredsAuto) {
        const numBoxForGuard = document.querySelector(`.num-box[data-place="${place}-result"]`);
        const hasLeftGroupOrCountForGuard =
          !!numBoxForGuard?.querySelector(".num-model-group.group-left") || !!numBoxForGuard?.querySelector(".num-model-count");
        if (!hasLeftGroupOrCountForGuard) {
          this.placeNumModelInCalcContainerForSubtraction(place, "left");
        }
        this.uiManager.setClickedState(place, "left", true);
        // 계속 진행 (return 하지 않음)
      } else {
        this.showModal("빼어지는 수를 먼저 눌러주세요.");
        return;
      }
    }

    // 빌림 과정 중인지 확인
    if (this.isInBorrowProcess) {
      // 빌림 과정 중 클릭 처리
      const clickedElement = box as HTMLElement;
      const isBorrowTargetPlace = place === this.borrowFromPlace;
      // 특수 케이스: 백의자리에서 빌림 진행 중일 때, 십의자리 왼쪽 클릭은 0 표시만 허용
      if (this.borrowFromPlace === "hundreds" && place === "tens" && side === "left") {
        const numBoxTens = document.querySelector(`.num-box[data-place="tens-result"]`);
        const hasLeftGroupTens = !!numBoxTens?.querySelector(".num-model-group.group-left");
        if (!hasLeftGroupTens) this.placeNumModelInCalcContainerForSubtraction("tens", "left");
        return;
      }

      if (!isBorrowTargetPlace) {
        // 같은 자리에서 오른쪽을 재클릭하면 매번 안내 팝업 반복 노출
        if (side === "right" && place === this.uiManager.getCurrentPlace()) {
          if (this.borrowFromPlace) this.showBorrowUI(this.borrowFromPlace);
          this.showModal("먼저 앞자리 수를 빌려오세요.");
        }
        return; // 지정 자리 외 무시
      }

      if (side === "left") {
        // 왼쪽 클릭이면 수모형을 먼저 배치 (중복 배치 방지)
        const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
        const hasLeftGroup = !!numBox?.querySelector(".num-model-group.group-left");
        if (!hasLeftGroup) this.placeNumModelInCalcContainerForSubtraction(place, side);
        // 빌림 UI 표시(테두리 추가)
        if (this.borrowFromPlace) this.showBorrowUI(this.borrowFromPlace);
        // 빌림 과정에서도, 올바른 자리의 왼쪽을 클릭했다면 상단 digit-result-box 수모형 제거
        this.clearResultImageContainer(place, side);
      }
      // 오른쪽 클릭은 borrowable 이미지 클릭만 허용 → BorrowUIManager 리스너에서 처리
      return;
    }

    if (place !== this.uiManager.getCurrentPlace()) {
      // 초기 진입(일의자리 단계)에서는 상위 자리의 왼쪽 클릭을 허용하지 않음
      // (예: 132-124: 첫 클릭은 반드시 왼쪽 일의자리여야 함)
      if (selectedOperator === "-" && side === "left") {
        const curr = this.uiManager.getCurrentPlace();
        if (curr === "ones") {
          const ps0 = this.uiManager.getProgressState();
          if (!ps0.clicked.ones.left) {
            this.userInputManager.reportWrongClick();
            return;
          }
        }
      }
      // 빌림 대기 상태일 때는 빌림할 자리로의 클릭을 허용
      if (this.isWaitingForBorrow && place === this.borrowFromPlace) {
        // 빌림할 자리 클릭 허용
      } else if (selectedOperator === "-" && side === "left") {
        // 빼기에서 왼쪽 클릭은 순서대로 진행 (일의자리 → 십의자리 → 백의자리)
        const currentPlace = this.uiManager.getCurrentPlace();
        const currentPlaceIndex = PLACES.indexOf(currentPlace);
        const clickedPlaceIndex = PLACES.indexOf(place);
        const maxPlace = this.getMaxCalculationPlace();
        const maxIndex = PLACES.indexOf(maxPlace);

        // 빼기에서는 왼쪽을 순서대로 클릭해야 함
        if (clickedPlaceIndex > currentPlaceIndex) {
          // 현재 자리보다 높은 자리를 클릭하려는 경우
          const progressState = this.uiManager.getProgressState();
          const currentPlaceLeftClicked = progressState.clicked[currentPlace].left;
          const needsBorrow = this.checkBorrowNeeded(currentPlace);

          // 빌림이 필요한 경우에는 현재 자리에서 가장 가까운 상위 빌림 자리로의 클릭을 허용
          // (현재 자리 왼쪽 클릭 여부와 무관 — tens에서 0일 때 바로 hundreds로 빌림 허용 등)
          if (needsBorrow && clickedPlaceIndex <= maxIndex) {
            // 빌림이 필요한 경우에는, 현재 자리의 가장 가까운 빌림 가능 자리로의 이동을 허용
            const nearestBorrowablePlace = this.findNearestBorrowablePlace(currentPlace);
            if (nearestBorrowablePlace && place === nearestBorrowablePlace) {
              // 건너뛰기 클릭인 경우에만 중간 자리들의 이미지를 자동으로 생성
              if (clickedPlaceIndex > currentPlaceIndex + 1) {
                this.createMissingPlaceImages(currentPlace, place);
              }
            } else {
              this.userInputManager.reportWrongClick();
              return;
            }
          } else {
            // 빌림이 필요 없는 경우에는 상위 자리 클릭을 허용하지 않음 (현재 자리 단계 유지)
            this.userInputManager.reportWrongClick();
            return;
          }
        } else if (clickedPlaceIndex <= maxIndex) {
          // 현재 자리 이하의 자리는 허용
        } else {
          this.userInputManager.reportWrongClick();
          return;
        }
      } else {
        // 잘못된 클릭: 2회 누적 시 손가이드 표시
        this.userInputManager.reportWrongClick();
        return;
      }
    }

    const progressState = this.uiManager.getProgressState();
    if (progressState.clicked[place][side]) {
      // 이미 클릭 처리된 상태라도, 뺄셈에서 현재 자리의 왼쪽을 사용자가 실제로 클릭했을 때
      // 상단 수모형이 남아있다면 제거해 준다(자동 설정으로 미처 제거되지 않은 경우 보정)
      const opAlready = this.inputManager.getSelectedOperator();
      if (opAlready === "-" && side === "left" && place === this.uiManager.getCurrentPlace()) {
        this.clearResultImageContainer(place, side);
      }
      return;
    }

    // 빼기에서 오른쪽을 먼저 클릭하는 경우는 클릭 상태를 업데이트하지 않음
    const operator = this.inputManager.getSelectedOperator();
    const shouldUpdateClickState = !(operator === "-" && side === "right" && !progressState.clicked[place].left);

    // 뺄셈에서 현재 자리에 빌림이 필요한 상태면, 오른쪽 클릭 시 업데이트/제거 금지
    let canUpdateNow = true;
    if (operator === "-" && side === "right") {
      if (this.checkBorrowNeeded(place)) {
        canUpdateNow = false;
      }
    }

    if (shouldUpdateClickState && canUpdateNow) {
      // 올바른 클릭 처리 (정답 수용)
      this.handleCorrectClick();
      this.uiManager.setClickedState(place, side, true);
      // 유효한 사용자 클릭이 수용된 즉시 다시하기 버튼 활성화
      this.uiManager.setButtonState(".btn-result-reset", true);

      // 올바른 차례의 클릭이 수용된 경우에만 상단 digit-result-box 내부 수모형 이미지를 제거
      this.clearResultImageContainer(place, side);
    }

    // 빼기/더하기 연산자에 따라 다른 로직 적용

    if (selectedOperator === "-") {
      // 빼기 연산에서는 왼쪽을 먼저 클릭해야 함
      if (side === "left") {
        // 200-199 두 단계 빌림 강제 순서
        if (this.isTwoStepBorrowScenario && this.isTwoStepBorrowScenario()) {
          const ps = this.uiManager.getProgressState();
          // tens는 ones 클릭 이후에만 허용
          if (place === "tens" && !ps.clicked.ones.left) {
            this.showModal("먼저 앞자리 수를 빌려오세요.");
            return;
          }
          // hundreds는 ones, tens 클릭 이후에만 허용
          if (place === "hundreds" && (!ps.clicked.ones.left || !ps.clicked.tens.left)) {
            this.showModal("먼저 앞자리 수를 빌려오세요.");
            return;
          }
        }
        // 첫 번째 클릭 시 결과 자리에 이미지 배치
        const leftNumber = this.inputManager.getNumberFromDisplays("left");
        const leftPlaces = this.calculationManager.splitNumberByPlaces(leftNumber);
        const value = place === "ones" ? leftPlaces.ones : place === "tens" ? leftPlaces.tens : place === "hundreds" ? leftPlaces.hundreds : 0;

        this.placeNumModelInCalcContainerForSubtraction(place, side);

        // 왼쪽 클릭 시 해당 자리가 빌림 가능한 자리인지 확인하고 빨간색 테두리 표시
        const currentDigit = this.getDigitAtPlace(leftNumber, place);

        // 현재 자리에 숫자가 있거나, 다른 자리에서 빌림이 필요한 경우 빨간색 테두리 표시
        if (currentDigit > 0) {
          // 다른 자리에서 빌림이 필요한지 확인
          const places: Place[] = ["ones", "tens", "hundreds"];
          const currentIndex = places.indexOf(place);

          // 현재 자리보다 낮은 자리들에서 빌림이 필요한지 확인
          for (let i = 0; i < currentIndex; i++) {
            const lowerPlace = places[i];
            if (this.checkBorrowNeeded(lowerPlace)) {
              // 빨간색 테두리 표시
              this.showBorrowUI(place);
              break;
            }
          }
        } else if (currentDigit === 0) {
          // 현재 자리가 0인 경우, 다른 자리에서 빌림이 필요한지 확인
          const places: Place[] = ["ones", "tens", "hundreds"];
          const currentIndex = places.indexOf(place);

          // 현재 자리보다 낮은 자리들에서 빌림이 필요한지 확인
          for (let i = 0; i < currentIndex; i++) {
            const lowerPlace = places[i];
            if (this.checkBorrowNeeded(lowerPlace)) {
              // 현재 자리가 0이면 이 자리에서 빌려줄 것이 없으므로
              // 빌림 UI를 띄우지 않고 상위 빌림 자리로 이동만 허용
              break;
            }
          }

          // 현재 자리가 0이고, 빌림이 필요한 경우
          const needsBorrow = this.checkBorrowNeeded(place);
          if (needsBorrow) {
            // 일의자리에서 0으로 시작하는 빌림 케이스(예: 130-124)에서는
            // 하이라이트를 일의자리에 유지한 채 상위 자리에서 빌림 UI만 노출한다.
            // (두 단계/단일 단계 모두 동일하게 처리)
            if (place === "ones") {
              const borrowFromPlace = this.findBorrowablePlace(place);
              if (borrowFromPlace) {
                this.state.startBorrowProcess(borrowFromPlace);
                this.showBorrowUI(borrowFromPlace);
              }
              return; // 현재 자리 유지, 사용자가 빌림을 수행하도록 대기
            } else {
              // 일의자리가 아닌 경우에는 기존 동작 유지: 가장 가까운 빌림 가능한 자리로 이동
              const borrowablePlace = this.findNearestBorrowablePlace(place);
              if (borrowablePlace) {
                this.uiManager.setCurrentPlace(borrowablePlace);
                this.highlightCurrentNumBox();
              }
            }
          }
        }

        // 추가: 현재 자리에 숫자가 있어도 빌림이 필요한 경우(예: 204-199의 일의자리 4<9)
        // 즉시 빌림 UI를 시작하여 사용자가 바로 상위 자리에서 빌려올 수 있도록 한다.
        // 기존 흐름에 영향을 주지 않도록, 빌림 프로세스가 진행 중이 아닐 때만 동작.
        if (!this.isInBorrowProcess) {
          const needsBorrowHere = this.checkBorrowNeeded(place);
          if (needsBorrowHere) {
            const borrowFromPlace = this.findBorrowablePlace(place);
            if (borrowFromPlace) {
              this.state.startBorrowProcess(borrowFromPlace);
              this.showBorrowUI(borrowFromPlace);
            }
          }
        }
      } else if (side === "right") {
        // 오른쪽을 먼저 클릭했는지 확인
        if (!progressState.clicked[place].left) {
          // 이미 왼쪽 그룹/카운트가 구성되어 있거나(예: 상위 자리에서 빌림 후 자동 배치),
          // 빌림이 필요 없는 경우에는 왼쪽을 자동 확인 처리 후 진행을 허용한다.
          const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
          const hasLeftGroupOrCount = !!numBox?.querySelector(".num-model-group.group-left") || !!numBox?.querySelector(".num-model-count");
          if (selectedOperator === "-" && (hasLeftGroupOrCount || !this.checkBorrowNeeded(place))) {
            if (!hasLeftGroupOrCount) this.placeNumModelInCalcContainerForSubtraction(place, "left");
            this.uiManager.setClickedState(place, "left", true);
          } else {
            this.showModal("빼어지는 수를 먼저 클릭하세요.");
            return; // 클릭 처리 중단
          }
        }

        // 두 단계 빌림(200-199 등)에서 왼쪽 십의자리 클릭 직후, 오른쪽 10/100의자리 클릭 시 팝업만 표시
        if (selectedOperator === "-" && this.isTwoStepBorrowScenario && this.isTwoStepBorrowScenario()) {
          const ps2 = this.uiManager.getProgressState();
          const afterTensLeftBeforeHundredsLeft = ps2.clicked.ones.left && ps2.clicked.tens.left && !ps2.clicked.hundreds.left;
          // 두 단계 빌림에서도 십의자리는 진행을 막지 않는다. 백의자리 클릭만 제한한다.
          if (afterTensLeftBeforeHundredsLeft && place === "hundreds") {
            this.showModal("먼저 앞자리 수를 빌려오세요.");
            return;
          }
        }

        // 빌림 프로세스 진행 중이면 팝업 재노출 대신 기존 빌림 UI만 유지
        if (this.isInBorrowProcess) {
          // 빌림 프로세스가 남아있더라도, 현재 자리에 더 이상 빌림이 필요 없거나
          // 하위 자리에 빌림이 이미 반영된 경우에는 프로세스를 종료하고 다시 진행 가능하게 한다.
          const noLongerNeedsBorrow = !this.checkBorrowNeeded(place) || this.borrowedPlaces.has("ones") || this.borrowedPlaces.has("tens");
          if (noLongerNeedsBorrow) {
            this.state.endBorrowProcess();
          } else {
            if (this.borrowFromPlace) this.showBorrowUI(this.borrowFromPlace);
            this.uiManager.setClickedState(place, side, false);
            return;
          }
        }

        // 빌림이 필요한지 확인 (빌림이 완료된 자리는 무시)
        if (this.checkBorrowNeeded(place) && !this.borrowedPlaces.has(place)) {
          // 빌림이 필요한 경우, 빌림 가능한 자리 찾기
          const borrowFromPlace = this.findBorrowablePlace(place);
          if (borrowFromPlace) {
            // 하위 자리에서 빌림이 이미 발생했더라도, 현재 자리에서 추가 빌림이 필요하면
            // 반드시 빌림(UI) 과정을 먼저 진행하도록 강제한다. (자동 진행 금지)
            // 빌림 필요 메시지 표시 (단, 이미 빌림 프로세스 중이면 중복 표시 금지)
            if (!this.isInBorrowProcess) {
              this.showModal("먼저 앞자리 수를 빌려오세요.");
              // 빌림 대기 상태 설정
              this.state.startBorrowProcess(borrowFromPlace);
            }
            // 팝업이 떠 있는 경우라도, 모달을 닫은 뒤 바로 빌림을 진행할 수 있도록
            // 빌림 대상 자리의 왼쪽 그룹이 없으면 즉시 생성해 준다(시각적 힌트 강화).
            const borrowToPlace = this.getBorrowToPlace(borrowFromPlace);
            if (borrowToPlace) {
              const toBox = document.querySelector(`.num-box[data-place="${borrowToPlace}-result"]`);
              const hasLeftGroup = !!toBox?.querySelector(".num-model-group.group-left");
              if (!hasLeftGroup) this.placeNumModelInCalcContainerForSubtraction(borrowToPlace, "left");
            }
            // 클릭 상태 업데이트 (다시 클릭할 수 있도록)
            this.uiManager.setClickedState(place, side, false);
            return; // 빼기 로직 중단, 사용자가 직접 빌림을 시작하도록 대기
          } else {
            // 빌림 가능한 자리가 없는 경우 (이론적으로는 발생하지 않음)
            this.showModal("빌림할 수 있는 자리가 없습니다.");
            return;
          }
        }

        // 빌림이 필요하지 않은 경우 기존 로직 실행
        // 단, 현재 자리 왼쪽 클릭 상태가 false라면 먼저 왼쪽을 자동 배치/설정하여 진행 가능 상태로 만든다
        const psNow = this.uiManager.getProgressState();
        if (!psNow.clicked[place].left) {
          this.placeNumModelInCalcContainerForSubtraction(place, "left");
          this.uiManager.setClickedState(place, "left", true);
        }
        this.applySubtractionVisualEffect(place, side);

        // 시각적 효과 완료 후 mergeNumModelGroupsForSubtraction 호출 (계산 완료 처리는 하지 않음)
        const timeoutId = setTimeout(() => {
          // 리셋된 상태라면 애니메이션 실행하지 않음
          if (!this.isAutoCalculating && !this.isAnimating) {
            this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
            return;
          }
          this.mergeNumModelGroupsForSubtraction(place, () => {
            // 계산 완료 처리는 하지 않음 (다음 자리로 이동하거나 마지막 자리에서 처리됨)
          });
          this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
        }, 2300); // 시각효과(빨간색 변환/페이드) 완료(최대 ~2.2s) 이후로 지연
        this.animationTimeouts.push(timeoutId);
      }
    } else {
      // 더하기 연산에서는 기존 로직 사용
      this.placeNumModelInCalcContainer(place, side);
    }

    // btn-result-reset 활성화 (UIManager 위임)
    this.uiManager.setButtonState(".btn-result-reset", true);

    if (progressState.clicked[place].left && progressState.clicked[place].right) {
      // 계산이 필요한 최대 자리까지만 진행
      const maxPlace = this.getMaxCalculationPlace();
      const maxIndex = PLACES.indexOf(maxPlace);
      const currentIndex = PLACES.indexOf(place);

      const nextPlace = this.getNextPlace(place);
      // 현재 자리가 최대 계산 자리보다 작을 때만 다음 자리로 이동
      // 현재 자리가 최대 계산 자리보다 작을 때만 다음 자리로 이동
      if (nextPlace && currentIndex < maxIndex) {
        this.state.startAnimating();
        this.state.startAnimating();
        // ones, tens, hundreds 자리 모두 mergeNumModelGroups 실행
        const timeoutId = setTimeout(() => {
          // 리셋된 상태라면 애니메이션 실행하지 않음
          if (!this.isAutoCalculating && !this.isAnimating) return;

          const numBox = document.querySelector(`.num-box[data-place=\"${place}-result\"]`);
          if (numBox) {
            // 빼기/더하기 연산자에 따라 다른 merge 로직 적용
            const selectedOperator = this.inputManager.getSelectedOperator();
            if (selectedOperator === "-") {
              this.mergeNumModelGroupsForSubtraction(place, () => {
                // 빼기에서 다음 자리에 계산할 것이 있는지 확인
                if (nextPlace) {
                  let nextPlaceLeftDigit = this.getDigitAtPlace(this.inputManager.getNumberFromDisplays("left"), nextPlace);
                  const nextPlaceRightDigit = this.getDigitAtPlace(this.inputManager.getNumberFromDisplays("right"), nextPlace);

                  // 빌림이 발생했는지 확인하고 다음 자리 숫자 조정
                  if (place === "ones" && this.borrowedPlaces.has("ones")) {
                    // 일의자리에서 빌림이 발생했다면 십의자리 숫자를 1 감소
                    nextPlaceLeftDigit = Math.max(0, nextPlaceLeftDigit - 1);
                  }

                  // 상위 자리에 계산할 것이 남았는지 확인
                  const hasRemainingCalculation = this.checkRemainingCalculation(nextPlace);

                  if (!hasRemainingCalculation) {
                    // 모든 계산 완료 후 정리
                    this.clearAllHighlights(); // num-box 하이라이트 제거
                    this.uiManager.deactivateAllDigitResultBoxesHighlight(); // digit-result-box 회색 처리
                    this.handGuide.hide(); // HandGuide 숨기기
                    this.handGuide.stopAutoGuide(); // HandGuide 타이머 완전 정지
                    this.userInputManager.disable(); // UserInputManager 완전 비활성화
                    this.state.finishCalc();
                    this.state.stopAnimating();

                    // 계산 완료 후 digit-result-box 클릭 차단
                    this.resultManager.setResultBoxClickEnabled(false);

                    // 잘못된 클릭 감지도 차단하기 위해 document 전체 클릭 이벤트 차단
                    this.preventClickHandler = (e: Event) => {
                      const target = e.target as HTMLElement;
                      if (target.closest(".digit-result-box")) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                      }
                    };
                    if (this.preventClickHandler) {
                      document.addEventListener("click", this.preventClickHandler, true);
                    }

                    // UserInputManager의 잘못된 클릭 카운터도 리셋
                    this.userInputManager.reset();

                    // 빼기 전용 자리 업데이트 (덧셈에서는 호출하지 않음)
                    if (this.inputManager.getSelectedOperator() === "-") {
                      this.updateAllPlacesForSubtraction();
                    }

                    // 수동 계산 완료 시 계산결과 팝업 표시
                    this.showCalculationResultPopup();
                  } else {
                    // 다음 자리에 계산할 것이 있으면 다음 자리로 이동
                    this.uiManager.setCurrentPlace(nextPlace);
                    this.highlightCurrentNumBox();
                    this.state.stopAnimating();

                    // 다음 자리로 이동했을 때 HandGuide 타이머만 재시작 (바로 표시하지 않음)
                    this.userInputManager.restartAutoGuideTimer();
                  }
                }
              });
            } else {
              this.mergeNumModelGroups(numBox, place, () => {
                // 천의자리는 클릭 진행이 없으므로, nextPlace가 thousands이면 즉시 완료 처리
                if (nextPlace === "thousands") {
                  // 모든 계산 완료 후 정리 (덧셈 기준)
                  this.clearAllHighlights(); // num-box 하이라이트 제거
                  this.uiManager.deactivateAllDigitResultBoxesHighlight(); // digit-result-box 회색 처리
                  this.handGuide.hide();
                  this.handGuide.stopAutoGuide();
                  this.userInputManager.disable();
                  this.state.finishCalc();
                  this.state.stopAnimating();

                  // 계산 완료 후 digit-result-box 클릭 차단
                  this.resultManager.setResultBoxClickEnabled(false);

                  // 잘못된 클릭 감지도 차단하기 위해 document 전체 클릭 이벤트 차단
                  this.preventClickHandler = (e: Event) => {
                    const target = e.target as HTMLElement;
                    if (target.closest(".digit-result-box")) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                    }
                  };
                  if (this.preventClickHandler) {
                    document.addEventListener("click", this.preventClickHandler, true);
                  }

                  // UserInputManager의 잘못된 클릭 카운터도 리셋
                  this.userInputManager.reset();

                  // 덧셈에서는 최종 결과 기준으로 동기화
                  this.updateAllPlacesForAddition();

                  // 수동 계산 완료 시 계산결과 팝업 표시
                  this.showCalculationResultPopup();
                } else {
                  // 덧셈 중간 단계에서는 현재 자리 외 카운트를 최종값으로 동기화하지 않음
                  this.uiManager.setCurrentPlace(nextPlace);
                  this.highlightCurrentNumBox();
                  this.state.stopAnimating();

                  // 다음 자리로 이동했을 때 HandGuide 타이머만 재시작 (바로 표시하지 않음)
                  this.userInputManager.restartAutoGuideTimer();
                }
              });
            }
          }
          // 완료 후 타이머 ID 제거
          this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
        }, 1200);
        // 타이머 ID를 배열에 저장하여 리셋 시 중단 가능하도록 함
        this.animationTimeouts.push(timeoutId);
      } else {
        // 최대 자리에 도달했거나 모든 자리 계산이 완료된 경우
        this.state.startAnimating();
        const timeoutId = setTimeout(
          () => {
            // 리셋된 상태라면 애니메이션 실행하지 않음
            if (!this.isAutoCalculating && !this.isAnimating) return;

            const numBox = document.querySelector(`.num-box[data-place=\"${place}-result\"]`);
            if (numBox) {
              // 빼기/더하기 연산자에 따라 다른 merge 로직 적용
              const selectedOperator = this.inputManager.getSelectedOperator();
              if (selectedOperator === "-") {
                // 빼기에서도 계산 완료 조건에 도달했을 때 계산 완료 처리
                this.mergeNumModelGroupsForSubtraction(place, () => {
                  // 모든 계산 완료 후 정리
                  this.clearAllHighlights(); // num-box 하이라이트 제거
                  this.uiManager.deactivateAllDigitResultBoxesHighlight(); // digit-result-box 회색 처리
                  this.handGuide.hide(); // HandGuide 숨기기
                  this.handGuide.stopAutoGuide(); // HandGuide 타이머 완전 정지
                  this.userInputManager.disable(); // UserInputManager 완전 비활성화
                  this.state.finishCalc();
                  this.state.stopAnimating();

                  // 계산 완료 후 digit-result-box 클릭 차단
                  this.resultManager.setResultBoxClickEnabled(false);

                  // 잘못된 클릭 감지도 차단하기 위해 document 전체 클릭 이벤트 차단
                  this.preventClickHandler = (e: Event) => {
                    const target = e.target as HTMLElement;
                    if (target.closest(".digit-result-box")) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                    }
                  };
                  if (this.preventClickHandler) {
                    document.addEventListener("click", this.preventClickHandler, true);
                  }

                  // UserInputManager의 잘못된 클릭 카운터도 리셋
                  this.userInputManager.reset();

                  // 빼기 전용 자리 업데이트 (덧셈에서는 호출하지 않음)
                  if (this.inputManager.getSelectedOperator() === "-") {
                    this.updateAllPlacesForSubtraction();
                  }

                  // 수동 계산 완료 시 계산결과 팝업 표시
                  this.showCalculationResultPopup();
                });
              } else {
                this.mergeNumModelGroups(numBox, place, () => {
                  // 덧셈 중간 단계에서는 최종 동기화하지 않음
                  // 모든 계산 완료 후 정리
                  this.clearAllHighlights(); // num-box 하이라이트 제거
                  this.uiManager.deactivateAllDigitResultBoxesHighlight(); // digit-result-box 회색 처리
                  this.handGuide.hide(); // HandGuide 숨기기
                  this.handGuide.stopAutoGuide(); // HandGuide 타이머 완전 정지
                  this.userInputManager.disable(); // UserInputManager 완전 비활성화
                  this.state.finishCalc();
                  this.state.stopAnimating();

                  // 계산 완료 후 digit-result-box 클릭 차단
                  this.resultManager.setResultBoxClickEnabled(false);

                  // 잘못된 클릭 감지도 차단하기 위해 document 전체 클릭 이벤트 차단
                  this.preventClickHandler = (e: Event) => {
                    const target = e.target as HTMLElement;
                    if (target.closest(".digit-result-box")) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                    }
                  };
                  if (this.preventClickHandler) {
                    document.addEventListener("click", this.preventClickHandler, true);
                  }

                  // UserInputManager의 잘못된 클릭 카운터도 리셋
                  this.userInputManager.reset();

                  // 빼기에서 모든 자리 업데이트
                  this.updateAllPlacesForSubtraction();

                  // 수동 계산 완료 시 계산결과 팝업 표시
                  this.showCalculationResultPopup();
                });
              }
            }
            // 완료 후 타이머 ID 제거
            this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
          },
          place === "ones" ? 2000 : 3500
        );
        // 타이머 ID를 배열에 저장하여 리셋 시 중단 가능하도록 함
        this.animationTimeouts.push(timeoutId);
      }
    }
  }

  // 자리 이동 시 하이라이트
  private highlightCurrentNumBox() {
    this.uiManager.highlightCurrentNumBox();
    // 현재 기대 대상에 따라 digit-result-box 활성화 상태도 동기화
    const op = this.inputManager.getSelectedOperator();
    const currentPlaceForGuard = this.uiManager.getCurrentPlace();
    const psGuard = this.uiManager.getProgressState();
    const finishedBothSidesAtCurrent = op === "-" && psGuard.clicked[currentPlaceForGuard].left && psGuard.clicked[currentPlaceForGuard].right;
    if (!finishedBothSidesAtCurrent) {
      const nextTarget = op === "-" ? this.getNextGuideTargetElement() : this.getNextGuideDigitBox();
      const targetDigitBox = nextTarget?.closest?.(".digit-result-box") || null;
      this.uiManager.setActiveDigitResultBox(targetDigitBox as HTMLElement | null);
    }
  }

  // 다음 자리 반환
  private getNextPlace(place: Place): Place | null {
    return this.uiManager.getNextPlace(place);
  }

  // 수모형 배치(자리, 방향)
  private placeNumModelInCalcContainer(place: Place, side: Side) {
    const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
    if (!numBox) return;

    // 그룹 분리 시 merged-only 해제
    this.renderer.removeMergedOnly(numBox);

    // 클릭할 때마다 즉시 개수 텍스트 업데이트
    // 덧셈의 경우 현재 자리(place)일 때만 업데이트하여 상위 자리(십/백)가 미리 뜨지 않도록 제한
    const operator = this.inputManager.getSelectedOperator();
    const currentPlace = this.uiManager.getCurrentPlace();
    if (operator !== "+" || place === currentPlace) {
      this.updateNumModelCountForCurrentState(numBox, place);
    }

    // 백의자리 특별 처리 - 올림수가 있을 때와 없을 때 모두 처리
    if (place === "hundreds") {
      const merged = numBox.querySelector(".group-merged") as HTMLElement | null;
      const mergedImgs = merged ? merged.querySelectorAll("img") : null;
      const hasMergedCarry = !!merged && !!mergedImgs && mergedImgs.length > 0;

      // 이미 left 그룹에 carry 이미지가 존재하는지(hun-carry 클래스) 확인
      let leftGroupNode = numBox.querySelector(".num-model-group.group-left") as HTMLElement | null;
      const hasCarryInLeftGroup = !!leftGroupNode && leftGroupNode.querySelectorAll("img.hun-carry").length > 0;
      const hasCarryInBox = hasMergedCarry || hasCarryInLeftGroup;

      // 클릭된 쪽 그룹 준비 및 초기화
      let group = this.ensureGroup(numBox as HTMLElement, side, place);
      // 왼쪽을 클릭했고, 이미 carry가 박스 내에 시각화되어 있다면(left에 존재) 지우지 않고 이어서 추가
      if (!(side === "left" && hasCarryInBox)) {
        group.innerHTML = "";
      }

      // carry가 group-merged로 존재하면 항상 left 그룹으로 흡수한다 (hun-carry 클래스 유지)
      if (hasMergedCarry) {
        leftGroupNode = numBox.querySelector(".num-model-group.group-left") as HTMLElement | null;
        if (!leftGroupNode) {
          leftGroupNode = this.ensureGroup(numBox as HTMLElement, "left", place);
        }
        // 이전 잔여 제거 후 carry 이미지를 이동
        leftGroupNode.innerHTML = "";
        mergedImgs!.forEach((img) => leftGroupNode!.appendChild(img));
        // carry를 이동했으므로 merged 제거
        merged!.remove();
      }

      // group-merged가 없지만 carry 카운트가 존재하고, 우측을 먼저 클릭한 경우에도
      // 시각적으로 carry 1을 반영하기 위해 left 그룹에 hun-carry 이미지를 생성한다
      if (!hasCarryInBox && this.hundredsCarryCount > 0 && side === "right") {
        leftGroupNode = numBox.querySelector(".num-model-group.group-left") as HTMLElement | null;
        if (!leftGroupNode) {
          leftGroupNode = this.ensureGroup(numBox as HTMLElement, "left", place);
        }
        // carry 이미지 생성 (hun-carry 마킹)
        const frag = document.createDocumentFragment();
        for (let i = 0; i < this.hundredsCarryCount; i++) {
          const img = document.createElement("img");
          img.src = "./images/hun.png";
          img.className = "num-model-img hun-carry";
          frag.appendChild(img);
        }
        leftGroupNode.appendChild(frag);
      }

      // boxIdx: 0=left, 1=right
      const boxIdx = side === "left" ? 0 : 1;
      const digitSelector = `.digit-result[data-place="hundreds-result"]`;
      const digitEl = document.querySelectorAll(digitSelector)[boxIdx] as HTMLElement;
      let value = digitEl ? parseInt(digitEl.textContent || "0", 10) : 0;

      // 왼쪽 클릭 시, carry 시각화가 되어있지 않다면 수치로 carry 반영
      let totalValue = value;
      if (side === "left" && !hasCarryInBox) {
        totalValue += this.hundredsCarryCount;
      }

      // 값이 0이면 group 생성하지 않고 바로 return
      if (totalValue === 0) {
        if (group) group.remove();
        this.renderer.toggleHasBothGroups(numBox);
        this.updateNumModelCountForCurrentState(numBox, place);
        return;
      }

      // 백의자리 이미지 추가 (클릭된 쪽)
      this.renderer.appendImagesToGroup(group, "hun.png", totalValue, 0, "Number 100");

      // 백의자리 수모형: group-left, group-right 모두 이미지 개수에 따라 중앙 기준으로 translate 보정
      const leftGroup = numBox.querySelector(".num-model-group.group-left");
      if (leftGroup) this.renderer.stackGroupImagesCentered(leftGroup);
      const rightGroup = numBox.querySelector(".num-model-group.group-right");
      if (rightGroup) this.renderer.stackGroupImagesCentered(rightGroup);

      // 그룹 상태에 따라 클래스 토글
      this.renderer.toggleHasBothGroups(numBox);

      return;
    }

    // 십의자리에서 왼쪽/오른쪽 구분 없이 group-merged(올림수)가 있으면 클릭한 쪽 group에 합쳐서 넣기
    if (place === "tens") {
      const merged = numBox.querySelector(".group-merged") as HTMLElement;
      if (merged) {
        // group-merged의 이미지는 이동하지 않고, digit 값만큼만 group에 추가
        const boxIdx = side === "left" ? 0 : 1;
        const digitSelector = `.digit-result[data-place="${place}-result"]`;
        const digitEl = document.querySelectorAll(digitSelector)[boxIdx] as HTMLElement;
        let value = digitEl ? parseInt(digitEl.textContent || "0", 10) : 0;

        // 값이 0이면 group 생성하지 않음
        if (value === 0) {
          // 그룹 상태 클래스 토글 (렌더러 위임)
          this.renderer.toggleHasBothGroups(numBox);
          // 0일 때도 개수 텍스트 업데이트 (0 표시)
          this.updateNumModelCountForCurrentState(numBox, place);
          return;
        }

        this.renderer.ensureSideGroupWithValue(numBox, side, place, value);
        // 그룹 상태 클래스 토글
        this.renderer.toggleHasBothGroups(numBox);
        return;
      }
    }

    // 그룹 div 준비
    let group = this.ensureGroup(numBox as HTMLElement, side, place);

    // 기존 이미지 제거(같은 그룹만)
    group.innerHTML = "";

    // boxIdx: 0=left, 1=right
    const boxIdx = side === "left" ? 0 : 1;
    const digitSelector = `.digit-result[data-place="${place}-result"]`;
    const digitEl = document.querySelectorAll(digitSelector)[boxIdx] as HTMLElement;
    let value = digitEl ? parseInt(digitEl.textContent || "0", 10) : 0;
    // tens 자리의 경우 자리올림까지 합산
    let totalValue = value;
    if (place === "tens" && side === "left") {
      totalValue += this.tensCarryCount;
    }
    // 값이 0이면 group 생성하지 않고 바로 return
    if (totalValue === 0) {
      // 혹시 기존 group이 있다면 제거
      if (group) group.remove();
      // 그룹 상태 클래스 토글 (렌더러 위임)
      this.renderer.toggleHasBothGroups(numBox);
      // 0일 때도 개수 텍스트 업데이트 (0 표시)
      this.updateNumModelCountForCurrentState(numBox, place);
      return;
    }
    // 이미지 종류 결정
    let imgSrc = "./images/one.png";
    if (place === "tens") imgSrc = "./images/ten.png";
    if (place === "thousands") imgSrc = "./images/thousand.png";
    // 십의자리 왼쪽 그룹: tensCarryCount(올림수)도 포함
    if (place === "tens" && side === "left") {
      value = totalValue;
    }
    this.renderer.appendImagesToGroup(group, imgSrc.split("/").pop() as string, value, 0, "Number");

    // 그룹 상태에 따라 클래스 토글
    this.renderer.toggleHasBothGroups(numBox);

    // 일의자리(덧셈) 전용: 중앙 배치(최대 10) → 10 초과 시 좌측 10, 우측 나머지
    if (place === "ones") {
      this.updateOnesCenteredLayout(numBox as HTMLElement, place);
    }

    // 양쪽 모두 클릭 시 합치기 예약
    const progressState = this.uiManager.getProgressState();
    if (progressState.clicked[place].left && progressState.clicked[place].right) {
      // 일의자리는 handleResultBoxClick에서 setTimeout과 콜백으로 처리하므로 여기서는 아무것도 하지 않음
      if (place !== "ones") {
        // 자동계산 중에는 mergeNumModelGroups를 호출하지 않음 (handleResultBoxClickAsync에서 처리)
        if (!this.isAutoCalculating) {
          const timeoutId = setTimeout(() => {
            this.mergeNumModelGroups(numBox, place);
            this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
          }, 2000); // 시각효과가 없는 단순 병합은 1.2초로 설정할 수 있으나, 여기서는 기존 병합 애니메이션을 2.0초로 통일
          this.animationTimeouts.push(timeoutId);
        }
      }
    }
  }

  // 일의자리 덧셈 배치: 중앙에 최대 10개까지 배치, 10 초과 시 좌측 10개, 우측 나머지
  private updateOnesCenteredLayout(numBox: Element, place: Place): void {
    try {
      // 현재 좌/우 클릭 여부 및 값 읽기
      const ps = this.uiManager.getProgressState();
      const digitNodes = document.querySelectorAll('.digit-result[data-place="ones-result"]');
      const rawLeft = parseInt((digitNodes[0] as HTMLElement)?.textContent || "0", 10) || 0;
      const rawRight = parseInt((digitNodes[1] as HTMLElement)?.textContent || "0", 10) || 0;
      const leftVal = ps.clicked.ones.left ? rawLeft : 0;
      const rightVal = ps.clicked.ones.right ? rawRight : 0;
      const total = leftVal + rightVal;

      const leftGroup = this.renderer.getGroup(numBox, "left");
      const rightGroup = this.renderer.getGroup(numBox, "right");

      // 합이 10 이하: 클릭된 범위의 합계를 중앙 그룹(merged)에 표시, 좌/우 그룹 숨김
      if (total <= 10) {
        const merged = this.renderer.clearAndEnsureMergedGroup(numBox);
        // 이미지 채우기
        for (let i = 0; i < total; i++) {
          const img = document.createElement("img");
          img.src = "./images/one.png";
          img.className = "num-model-img";
          merged.appendChild(img);
        }

        // 좌/우 그룹은 존재하더라도 화면에 보이지 않게만 처리(계산용 카운팅을 위해 DOM은 유지)
        if (leftGroup) (leftGroup as HTMLElement).style.display = "none";
        if (rightGroup) (rightGroup as HTMLElement).style.display = "none";

        // has-both-groups 클래스로 인한 레이아웃 영향 제거
        (numBox as HTMLElement).classList.remove("has-both-groups");
        return;
      }

      // 합이 10을 초과: 중앙 그룹 제거 후 좌측에 10, 우측에 나머지 배치
      const mergedNow = this.renderer.getGroup(numBox, "merged");
      this.renderer.removeGroup(mergedNow);

      // 좌측 10개 보장
      const left = this.ensureGroup(numBox as HTMLElement, "left", place);
      left.innerHTML = "";
      for (let i = 0; i < 10; i++) {
        const img = document.createElement("img");
        img.src = "./images/one.png";
        img.className = "num-model-img";
        left.appendChild(img);
      }
      (left as HTMLElement).style.display = "";

      // 우측에 나머지
      const remain = total - 10;
      const right = this.ensureGroup(numBox as HTMLElement, "right", place);
      right.innerHTML = "";
      for (let i = 0; i < remain; i++) {
        const img = document.createElement("img");
        img.src = "./images/one.png";
        img.className = "num-model-img";
        right.appendChild(img);
      }
      (right as HTMLElement).style.display = "";

      // 좌/우 그룹이 모두 보이도록 클래스 토글
      this.renderer.toggleHasBothGroups(numBox);
    } catch (e) {
      // 안전 장치: 오류가 발생해도 기존 흐름을 막지 않음
      // console.error("updateOnesCenteredLayout error", e);
    }
  }

  // 합치기 함수에 콜백 추가
  private mergeNumModelGroups(numBox: Element, place: Place, onComplete?: () => void) {
    const leftGroup = this.renderer.getGroup(numBox, "left");
    const rightGroup = this.renderer.getGroup(numBox, "right");
    let total = this.renderer.countImagesIn(leftGroup) + this.renderer.countImagesIn(rightGroup);
    if (place === "tens") total += this.renderer.countCarryInMerged(numBox, "ten.png");
    if (place === "hundreds") total += this.renderer.countCarryInMerged(numBox, "hun.png");

    this.renderer.removeGroup(leftGroup);
    this.renderer.removeGroup(rightGroup);
    this.renderer.setMergedOnly(numBox, true);

    // 일의자리: 10 미만이면 그대로, 10 이상이면 10을 뺀 나머지
    let ones = total;
    let tens = 0;
    if (place === "ones" && total >= 10) {
      ones = total % 10;
      tens = Math.floor(total / 10);
    }

    // 십의자리: 10 미만이면 그대로, 10 이상이면 10을 뺀 나머지(백의자리로 자리올림)
    let tensRemain = total;
    let huns = 0;
    if (place === "tens" && total >= 10) {
      tensRemain = total % 10;
      huns = Math.floor(total / 10);
    }

    // 백의자리: 10 미만이면 그대로, 10 이상이면 10을 뺀 나머지(천의자리로 자리올림)
    let hunsRemain = total;
    let thous = 0;
    if (place === "hundreds" && total >= 10) {
      hunsRemain = total % 10;
      thous = Math.floor(total / 10);
    }

    // 합쳐진 그룹 추가 (2개씩 grid)
    const merged = this.renderer.clearAndEnsureMergedGroup(numBox);

    // 계산 과정을 보여주기 위해 합쳐진 결과를 먼저 표시
    // 일의자리(덧셈)에서는 총합(예: 9+2=11)을 그대로 보여주고, 이후 자리올림 이동 후 1로 갱신
    if (place === "ones") {
      this.renderer.updateNumModelCount(numBox, total);
    } else if (place === "hundreds" && thous > 0) {
      // 백의자리에서 자리올림(→ 천) 발생 시에는 이동 전 총합(예: 19)을 먼저 보여준다
      this.renderer.updateNumModelCount(numBox, total);
    } else {
      this.updateNumModelCountWithTotal(numBox, place);
    }

    // 자리올림이 있는 경우: one.png/ten.png는 merged에, ten.png/hun.png는 group-left에 추가
    if (place === "ones" && tens > 0) {
      // 합쳐진 전체 개수 텍스트 먼저 표시 (계산 과정 보여주기)
      this.renderer.updateNumModelCount(numBox, total);

      // 나머지 일의자리가 있는 경우에만 merged에 추가
      if (ones > 0) {
        this.renderer.appendMerged(numBox, "ones", ones);
      } else {
        // 나머지가 0이면 merged 그룹 자체를 제거
        merged.remove();
      }
      // 자리올림 십의자리: group-left에 추가 (항상 맨 앞에 오도록)
      let carryGroup = this.renderer.createCarryGroupLeft(numBox, "ten", "ten.png", tens);
      this.tensCarryCount += tens; // 자리올림 발생 시 tensCarryCount 증가
      // 1.5초 후 십의자리로 ten.png만 이동
      const timeoutId = setTimeout(() => {
        // 자동계산 중 중복 실행 방지
        if (this.isAutoCalculating && !this.isAnimating) return;
        const tenImgs = carryGroup.querySelectorAll("img.ten-carry");
        const tensNumBox = document.querySelector('.num-box[data-place="tens-result"]');
        if (tensNumBox) {
          this.renderer.prepareMergedAndAppend(tensNumBox, tenImgs);
        } else {
          tenImgs.forEach((img) => img.remove());
        }
        // 일의자리에는 one.png만 남음 (나머지가 있는 경우)
        if (carryGroup) carryGroup.remove();
        this.renderer.removeMergedOnly(numBox);
        // tensCarryCount는 초기화하지 않음 - 자리올림이 발생했으므로 유지

        // 빈 그룹 제거 (렌더러 위임)
        this.renderer.removeEmptyGroups(numBox);

        // 자리올림 이동 후에는 남은 일의자리(ones)만 표시 (예: 11 → 1)
        this.updateNumModelCountForRemaining(numBox, place, ones);

        // 십의자리에는 올림으로 넘어온 1만 보이게(현재 상태 기준)
        if (tensNumBox) {
          this.updateNumModelCountForCurrentState(tensNumBox, "tens");
        }

        if (onComplete) onComplete(); // 자리올림 애니메이션 후 콜백 실행
        this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
      }, 1500);
      this.animationTimeouts.push(timeoutId);
      return;
    }

    // 십의자리 자리올림이 있는 경우
    if (place === "tens" && huns > 0) {
      // 자리올림 애니메이션 시작
      this.state.startAnimating();

      // 합쳐진 전체 개수 텍스트 먼저 표시: 현재 합계(예: 11)를 유지
      this.renderer.updateNumModelCount(numBox, total);

      // 나머지 십의자리가 있는 경우에만 merged에 추가
      if (tensRemain > 0) {
        this.renderer.appendMerged(numBox, "tens", tensRemain);
      } else {
        // 나머지가 0이면 merged 그룹을 제거하지 않고 빈 상태로 유지
        // (carryGroup이 보여질 수 있도록)
      }
      // 자리올림 백의자리: group-left에 추가 (항상 맨 앞에 오도록)
      let carryGroup = this.renderer.createCarryGroupLeft(numBox, "hun", "hun.png", huns);

      // 백의자리 이미지를 잠깐 보여주는 애니메이션 (백의자리와 동일하게 처리)
      this.animationManager.fadeIn(carryGroup as HTMLElement, 0.3);

      // 1.5초 후 백의자리로 hun.png만 이동
      const timeoutId = setTimeout(() => {
        // 자동계산 중에도 항상 실행되도록 수정
        // if (this.isAutoCalculating && !this.isAnimating) return;
        const hunImgs = carryGroup.querySelectorAll("img.hun-carry");
        const hunsNumBox = document.querySelector('.num-box[data-place="hundreds-result"]');
        if (hunsNumBox && hunImgs.length > 0) {
          this.renderer.prepareMergedAndAppend(hunsNumBox, hunImgs);

          // 백의자리로 이동하는 애니메이션
          this.animationManager.animateModelMovement("tens-result", "hundreds-result", () => {
            // 이동 완료 후 처리
          });

          // 백의자리 수모형 개수 텍스트는 현재 상태(올림수만)로 표시
          setTimeout(() => {
            this.updateNumModelCountForCurrentState(hunsNumBox, "hundreds");
          }, 100);
        } else {
          hunImgs.forEach((img) => img.remove());
        }
        // 십의자리에는 ten.png만 남음 (tensRemain이 0이면 아무것도 남지 않음)
        if (carryGroup) carryGroup.remove();
        this.renderer.removeMergedOnly(numBox);
        this.hundredsCarryCount += huns; // 자리올림 발생 시 hundredsCarryCount 증가

        // 자리올림 이동 후 남은 십의자리(예: 11 → 1 또는 0)를 표시 - 최종 자릿수 기준
        this.updateNumModelCountForRemaining(numBox, place, tensRemain);

        // 백의자리에 올림수 개수 텍스트 표시 (현재 상태 기준)
        setTimeout(() => {
          if (hunsNumBox) {
            this.updateNumModelCountForCurrentState(hunsNumBox, "hundreds");
          }
        }, 100);

        // 자리올림 애니메이션 완료
        this.state.stopAnimating();

        if (onComplete) onComplete(); // 자리올림 애니메이션 후 콜백 실행
        this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
      }, 1500);
      this.animationTimeouts.push(timeoutId);
      return;
    }

    // 백의자리 자리올림이 있는 경우
    if (place === "hundreds" && thous > 0) {
      // 합쳐진 전체 개수 텍스트 먼저 표시: 현재 합계(예: 19)를 유지
      // tens와 동일하게, 자리올림 이동 전에는 총합을 그대로 보여준다
      this.renderer.updateNumModelCount(numBox, total);

      // 나머지 백의자리가 있는 경우에만 merged에 추가
      if (hunsRemain > 0) {
        this.renderer.appendMerged(numBox, "hundreds", hunsRemain);
        // 백의자리 이미지를 중앙 정렬로 겹치기 배치
        const mergedGroup = this.renderer.getGroup(numBox, "merged");
        if (mergedGroup) this.renderer.stackGroupImagesCentered(mergedGroup);
        // merged-only 상태에서는 백의자리 이미지가 한 점에 겹쳐 보여 1개처럼 보일 수 있으므로 즉시 해제
        this.renderer.removeMergedOnly(numBox);
      } else {
        // 나머지가 0이면 merged 그룹 자체를 제거
        merged.remove();
      }
      // 자리올림 천의자리: group-left에 추가 (백의자리 num-box 내부 왼쪽에 배치)
      let carryGroup = this.renderer.createCarryGroupLeft(numBox, "thou", "thousand.png", thous);

      // 천의자리 이미지를 잠깐 보여주는 애니메이션
      this.animationManager.fadeIn(carryGroup as HTMLElement, 0.3);

      // 1.5초 후 천의자리로 thousand.png만 이동
      const timeoutId = setTimeout(() => {
        // 애니메이션 중단 조건 제거 - 항상 실행되도록
        // if (!this.isAutoCalculating || this.isAnimating) return;

        // 천의자리로 이동하는 애니메이션
        const thouImgs = carryGroup.querySelectorAll("img.thou-carry");
        const thousNumBox = document.querySelector('.num-box[data-place="thousands-result"]');

        if (thousNumBox && thouImgs.length > 0) {
          this.renderer.prepareMergedAndAppend(thousNumBox, thouImgs);

          // 천의자리로 이동하는 애니메이션 (AnimationManager 사용)
          this.animationManager.animateModelMovement("hundreds-result", "thousands-result");

          // 천의자리 수모형 개수 텍스트 업데이트 (애니메이션 완료 후)
          setTimeout(() => {
            this.updateNumModelCount(thousNumBox, "thousands");
            // 상위 자리로 이동 완료 후, 백의자리 수모형 이미지를 남은 값으로 재구성
            this.renderer.appendMerged(numBox, "hundreds", hunsRemain);
            // 겹침-only 상태를 해제하고 중앙 배치로 보정
            this.renderer.removeMergedOnly(numBox);
            const mergedGroup = this.renderer.getGroup(numBox, "merged");
            if (mergedGroup) this.renderer.stackGroupImagesCentered(mergedGroup);
            // 그리고 텍스트도 남은 값으로 동기화
            this.updateNumModelCountForRemaining(numBox, "hundreds", hunsRemain);
          }, 100);
        } else {
          thouImgs.forEach((img) => img.remove());
        }

        // 백의자리에는 hun.png만 남음
        if (carryGroup) carryGroup.remove();
        this.renderer.removeMergedOnly(numBox);
        this.hundredsCarryCount = 0; // 자리올림 애니메이션 후 hundredsCarryCount 초기화

        // 수모형 개수 텍스트 업데이트 (자리올림 후 남은 개수 - hunsRemain만 남음)
        this.updateNumModelCountForRemaining(numBox, place, hunsRemain);
        // 추가 안전장치: 덧셈 시 최종 결과 자릿수로 한 번 더 동기화 (간헐적 미갱신 방지)
        if (this.inputManager.getSelectedOperator() === "+") {
          const result = this.getCalculationResult();
          const digit = this.getDigitAtPlace(result, "hundreds");
          this.renderer.updateNumModelCount(numBox, digit);
        }

        if (onComplete) onComplete(); // 자리올림 애니메이션 후 콜백 실행
        this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
      }, 1500);
      this.animationTimeouts.push(timeoutId);
      return;
    }

    // 자리올림이 없는 경우: one.png/ten.png/hun.png만 모두 추가
    // 자리올림이 있는 경우는 이미 위에서 처리되었으므로, 여기서는 자리올림이 없는 경우만 처리
    let count = 0;
    if (place === "tens") count = tensRemain;
    else if (place === "hundreds") count = total;
    else count = ones;

    this.renderer.appendMerged(numBox, place, count);
    // 자리올림이 없으면 merged-only 클래스 제거하고 하나의 그룹만 남김
    this.renderer.removeMergedOnly(numBox);

    // 기존의 group-left, group-right 제거 (하나의 group-merged만 남김)
    const existingLeftGroup = numBox.querySelector(".group-left");
    const existingRightGroup = numBox.querySelector(".group-right");
    if (existingLeftGroup) existingLeftGroup.remove();
    if (existingRightGroup) existingRightGroup.remove();

    // 빈 그룹 제거 (렌더러 위임)
    this.renderer.removeEmptyGroups(numBox);

    // 수모형 개수 텍스트 업데이트
    this.updateNumModelCountForCurrentState(numBox, place);

    if (onComplete) onComplete();
  }

  // 수모형 개수 텍스트 업데이트 메서드
  private updateNumModelCount(numBox: Element, place: Place): void {
    // 현재 수모형 개수 계산 후 렌더러에 위임
    // 덧셈에서는 DOM 이미지 개수 대신 실제 결과 기준으로 표시하도록 상향 일치
    const operator = this.inputManager.getSelectedOperator();
    if (operator === "+") {
      const result = this.getCalculationResult();
      const digit = this.getDigitAtPlace(result, place);
      if (digit <= 0) {
        // 덧셈에서도 선행 0은 숨김
        if (this.shouldHideZeroForPlace(result, place)) {
          const existing = numBox.querySelector(".num-model-count");
          if (existing) existing.remove();
        } else {
          this.renderer.updateNumModelCountZero(numBox);
        }
      } else {
        this.renderer.updateNumModelCount(numBox, digit);
      }
      return;
    }
    const count = numBox.querySelectorAll("img.num-model-img").length;
    if (count === 0) return;
    this.renderer.updateNumModelCount(numBox, count);
  }

  // 현재 상태에 따른 개수 텍스트 업데이트 메서드 (클릭할 때마다 호출)
  private updateNumModelCountForCurrentState(numBox: Element, place: Place): void {
    // 현재 클릭/자리올림 상태 반영하여 수 계산 (DOM 텍스트 대신 실제 입력값 기반)
    let total = 0;
    let carryCount = 0;
    if (place === "tens") carryCount = this.tensCarryCount;
    else if (place === "hundreds") carryCount = this.hundredsCarryCount;

    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const progressState = this.uiManager.getProgressState();
    if (progressState.clicked[place].left) total += this.getDigitAtPlace(leftNumber, place);
    if (progressState.clicked[place].right) total += this.getDigitAtPlace(rightNumber, place);
    total += carryCount;

    if (total <= 0) {
      // 덧셈에서는 선행 0 숨김 반영
      const operator = this.inputManager.getSelectedOperator();
      if (operator === "+") {
        const result = this.getCalculationResult();
        if (this.shouldHideZeroForPlace(result, place)) {
          const existing = numBox.querySelector(".num-model-count");
          if (existing) existing.remove();
          return;
        }
      }
      this.renderer.updateNumModelCountZero(numBox);
      return;
    }
    this.renderer.updateNumModelCount(numBox, total);
  }

  // 자리올림 후 남은 개수 텍스트 업데이트 메서드
  private updateNumModelCountForRemaining(numBox: Element, place: Place, remainingCount: number): void {
    const operator = this.inputManager.getSelectedOperator();
    if (operator === "+") {
      // 덧셈: 자리올림 이동 후에는 해당 자리에 남은 개수(remainingCount)를 그대로 표시
      if (remainingCount <= 0) {
        const result = this.getCalculationResult();
        if (this.shouldHideZeroForPlace(result, place)) {
          const existing = numBox.querySelector(".num-model-count");
          if (existing) existing.remove();
          return;
        }
        this.renderer.updateNumModelCountZero(numBox);
        return;
      }
      this.renderer.updateNumModelCount(numBox, remainingCount);
      return;
    }
    // 뺄셈: 기존 로직 유지
    const existingCountText = numBox.querySelector(".num-model-count");
    if (existingCountText) existingCountText.remove();
    if (remainingCount === 0) {
      this.renderer.clearAllGroupsAndImages(numBox);
      this.renderer.updateNumModelCountZero(numBox);
      return;
    }
    this.renderer.updateNumModelCount(numBox, remainingCount);
  }

  // 합쳐진 전체 개수 텍스트 업데이트 메서드 (자리올림 애니메이션 시작 전에 호출)
  private updateNumModelCountWithTotal(numBox: Element, place: Place): void {
    // 실제 값으로 총합 계산 (입력값 기반; DOM 텍스트 의존 제거)
    let total = 0;
    let carryCount = 0;

    if (place === "tens") carryCount = this.tensCarryCount;
    else if (place === "hundreds") carryCount = this.hundredsCarryCount;

    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const progressState = this.uiManager.getProgressState();
    if (progressState.clicked[place].left) total += this.getDigitAtPlace(leftNumber, place);
    if (progressState.clicked[place].right) total += this.getDigitAtPlace(rightNumber, place);
    total += carryCount;

    const operator = this.inputManager.getSelectedOperator();
    if (operator === "+") {
      // 덧셈은 최종 결과 기준으로 표시를 맞춘다
      const result = this.getCalculationResult();
      const digit = this.getDigitAtPlace(result, place);
      if (digit <= 0) {
        if (this.shouldHideZeroForPlace(result, place)) {
          const existing = numBox.querySelector(".num-model-count");
          if (existing) existing.remove();
        } else {
          this.renderer.updateNumModelCountZero(numBox);
        }
      } else {
        this.renderer.updateNumModelCount(numBox, digit);
      }
    } else {
      if (total <= 0) {
        this.renderer.updateNumModelCountZero(numBox);
        return;
      }
      this.renderer.updateNumModelCount(numBox, total);
    }
  }

  // 계산이 필요한 최대 자리를 미리 계산 (결과 화면 기준)
  private getMaxCalculationPlace(): Place {
    // 입력 화면에서 실제 입력된 숫자들을 가져와서 계산
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const operator = this.inputManager.getSelectedOperator();

    return this.calculationManager.getMaxCalculationPlace(leftNumber, rightNumber, operator);
  }

  // 모든 하이라이트 제거
  private clearAllHighlights() {
    this.uiManager.clearAllHighlights();
  }

  // 자동 계산 메인 함수
  private async autoCalculateAll() {
    const autoCalc = this.getAutoCalculator();
    await autoCalc.start();
  }

  // 자리별 자동 계산/애니메이션 함수 (자리 인덱스별로 처리)
  private async animatePlaceValue(index: number) {
    // AutoCalculator 내부로 이동됨. 유지 호환용 위임.
    const autoCalc = this.getAutoCalculator();
    await (autoCalc as any)["animatePlaceValue"].call(autoCalc, index);
  }

  // AutoCalculator 메모이즈 팩토리
  private getAutoCalculator(): AutoCalculator {
    if (this._autoCalculator) return this._autoCalculator;
    const self = this;
    this._autoCalculator = new AutoCalculator({
      state: this.state as any,
      uiManager: this.uiManager,
      resultManager: this.resultManager,
      handGuide: this.handGuide,
      userInputManager: this.userInputManager,
      getMaxCalculationPlace: () => self.getMaxCalculationPlace(),
      resetResultScreenWithoutHandGuide: () => self.resetResultScreenWithoutHandGuide(),
      handleResultBoxClickAsync: (box, boxIdx, placeIdx) => self.handleResultBoxClickAsync(box, boxIdx, placeIdx),
      showCalculationResultPopup: () => self.showCalculationResultPopup(),
      getNextPlace: (place) => self.getNextPlace(place),
      highlightCurrentNumBox: () => self.highlightCurrentNumBox(),
      getBorrowToPlace: (from) => self.getBorrowToPlace(from),
      checkBorrowNeeded: (place) => self.checkBorrowNeeded(place),
      findNearestBorrowablePlace: (place) => self.findNearestBorrowablePlace(place),
      autoPerformBorrow: async (from) => {
        // 자동계산이 중단되었다면 즉시 종료 (리셋/처음으로 등)
        if (!self.isAutoCalculating) return;

        // 빌림을 수행할 자리의 이미지가 이미 존재하면 재구성(placeLeftGroup)으로 지우지 않도록 보호
        const numBox = document.querySelector(`.num-box[data-place="${from}-result"]`) as HTMLElement | null;
        const hasImages = !!numBox && numBox.querySelectorAll(".num-model-img").length > 0;
        if (!hasImages) {
          // 처음 노출되는 경우에만 그룹을 구성
          if (!self.isAutoCalculating) return;
          self.placeNumModelInCalcContainerForSubtraction(from, "left");
          await new Promise((res) => setTimeout(res, 350));
          if (!self.isAutoCalculating) return;
        } else {
          // 기존 하이라이트가 보이도록 소폭 대기
          await new Promise((res) => setTimeout(res, 200));
          if (!self.isAutoCalculating) return;
        }
        // 자동계산 중 빌림 시작 시, 빌림하는 자리(from)의 상단 수모형을 즉시 제거하여 진행감을 맞춤
        self.clearResultImageContainer(from as Place, "left");
        // 백의자리에서 빌림을 노출할 때, 십의자리에 0 텍스트를 먼저 보여주어 인지성 향상
        const toPlace = self.getBorrowToPlace(from);
        if (!self.isAutoCalculating) return;
        if (from === "hundreds" && toPlace === "tens") {
          const tensBox = document.querySelector(`.num-box[data-place="tens-result"]`) as HTMLElement | null;
          const hasCount = !!tensBox && !!tensBox.querySelector(".num-model-count");
          if (!hasCount) {
            self.placeNumModelInCalcContainerForSubtraction("tens", "left");
          }
        }
        if (!self.isAutoCalculating) return;
        self.showBorrowUI(from);
        const boxAfterUI = numBox ?? (document.querySelector(`.num-box[data-place="${from}-result"]`) as HTMLElement | null);
        // 우선 borrowable이 지정된 이미지를 시도하고, 없으면 첫 이미지로 대체
        let target = boxAfterUI?.querySelector(".num-model-img.borrowable") as HTMLImageElement | null;
        if (!target) {
          target = boxAfterUI?.querySelector(".num-model-img") as HTMLImageElement | null;
        }
        if (!self.isAutoCalculating) return;
        if (target) {
          // 빌림 과정을 자연스럽게 보여주기 위해 원래 대기 시간 유지
          await new Promise((res) => setTimeout(res, 1200));
          if (!self.isAutoCalculating) return;
          await self.executeBorrowAnimation(from, target);
        }
      },
      placeNumModelInCalcContainer: (place, side) => self.placeNumModelInCalcContainer(place, side),
      placeNumModelInCalcContainerForSubtraction: (place, side) => self.placeNumModelInCalcContainerForSubtraction(place, side),
      applySubtractionVisualEffect: (place, side) => self.applySubtractionVisualEffect(place, side),
      addGlobalClickBlocker: (handler) => {
        self.preventClickHandler = handler;
        document.addEventListener("click", handler, true);
      },
      isSubtractionOperator: () => self.inputManager.getSelectedOperator() === "-",
    });
    return this._autoCalculator;
  }

  // setupResultScreenButtons는 UIManager.bindResultScreenButtons로 대체됨

  // Promise 버전 클릭 핸들러(일의자리 자동계산용)
  private handleResultBoxClickAsync(box: Element, boxIdx: number, placeIdx: number): Promise<void> {
    return new Promise((resolve) => {
      const place: Place = PLACES[placeIdx];
      const side: Side = boxIdx === 0 ? "left" : "right";
      if (!this.isAutoCalculating && !this.isAnimating) {
        return resolve();
      }

      if (!this.isAutoCalculating && this.isAnimating) {
        return resolve();
      }
      const progressState = this.uiManager.getProgressState();
      if (place !== progressState.currentPlace) {
        return resolve();
      }
      if (progressState.clicked[place][side]) {
        return resolve();
      }
      this.uiManager.setClickedState(place, side, true);

      // 자동계산에서도 사용자 클릭과 동일하게 상단 수모형 제거 타이밍을 맞춘다
      this.clearResultImageContainer(place, side);

      const selectedOperator = this.inputManager.getSelectedOperator();

      if (selectedOperator === "-") {
        if (side === "left") {
          this.placeNumModelInCalcContainerForSubtraction(place, side);
        } else if (side === "right") {
          this.applySubtractionVisualEffect(place, side);
        }
      } else {
        this.placeNumModelInCalcContainer(place, side);
      }
      this.uiManager.setButtonState(".btn-result-reset", true);
      if (this.uiManager.getProgressState().clicked[place].left && this.uiManager.getProgressState().clicked[place].right) {
        const nextPlace = this.getNextPlace(place);
        if (nextPlace) {
          this.state.startAnimating();

          if (selectedOperator === "-") {
            const timeoutId = setTimeout(() => {
              this.mergeNumModelGroupsForSubtraction(place, () => {
                this.uiManager.setCurrentPlace(nextPlace);
                this.highlightCurrentNumBox();
                this.state.stopAnimating();
                resolve();
              });
              this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
            }, 1000); // 1초 대기 후 빼기 애니메이션
            this.animationTimeouts.push(timeoutId);
          } else {
            const timeoutId = setTimeout(() => {
              if (!this.isAutoCalculating && !this.isAnimating) {
                resolve();
                return;
              }

              const numBox = document.querySelector(`.num-box[data-place=\"${place}-result\"]`);
              if (numBox) {
                this.mergeNumModelGroups(numBox, place, () => {
                  this.uiManager.setCurrentPlace(nextPlace);
                  this.highlightCurrentNumBox();
                  this.state.stopAnimating();
                  resolve();
                });
              } else {
                resolve();
              }
              this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
            }, 2000);
            this.animationTimeouts.push(timeoutId);
          }
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  // HandGuide 초기화 및 시작
  private initializeHandGuide() {
    this.handGuide.setAutoCalculating(false);
    this.handGuide.hide();
    // 현재 기대 대상 마커 갱신 (덧셈은 기대 마커 비활성화)
    const opForMarker = this.inputManager.getSelectedOperator();
    if (opForMarker === "-") {
      this.updateExpectedTargetMarker();
    } else {
      document.querySelectorAll(".expected-target").forEach((el) => el.classList.remove("expected-target"));
    }
    const nextDigitBox = opForMarker === "-" ? this.getNextGuideTargetElement() : this.getNextGuideDigitBox();

    if (nextDigitBox) {
      const timeoutId = setTimeout(() => {
        const position = this.getHandGuidePosition(nextDigitBox);
        const currentPlace = this.uiManager.getCurrentPlace();
        const progressState = this.uiManager.getProgressState();
        const isLeft = !progressState.clicked[currentPlace].left;

        this.handGuide.guideOnce(position.x, position.y).then(() => {
          const resultScreen = document.querySelector(".result-screen") as HTMLElement;
          if (resultScreen) {
            this.userInputManager.start(resultScreen);
          }
        });
        // 손가이드 대상에 맞춰 digit-result-box 활성/회색 처리 동기화 (과도기 깜빡임 방지 가드)
        const currentPlaceForGuard = this.uiManager.getCurrentPlace();
        const psGuard = this.uiManager.getProgressState();
        const finishedBothSidesAtCurrent = opForMarker === "-" && psGuard.clicked[currentPlaceForGuard].left && psGuard.clicked[currentPlaceForGuard].right;
        if (!finishedBothSidesAtCurrent) {
          const targetDigitBox = nextDigitBox.closest(".digit-result-box") as HTMLElement | null;
          this.uiManager.setActiveDigitResultBox(targetDigitBox);
        }
        this.animationTimeouts = this.animationTimeouts.filter((id) => id !== timeoutId);
      }, 100);
      this.animationTimeouts.push(timeoutId);
    } else {
    }
  }

  // 자동 HandGuide 시작 (UserInputManager에서 처리됨)
  private startAutoHandGuide() {}

  // 현재 자리에 대한 HandGuide 표시
  private showHandGuideForCurrentPlace() {
    const currentPlace = this.uiManager.getCurrentPlace();

    // 덧셈은 기대 타겟을 강제하지 않고, 현재 자리에서 아직 클릭 안 한 쪽을 가이드
    const operatorForGuide = this.inputManager.getSelectedOperator();
    const nextDigitBox = operatorForGuide === "-" ? this.getNextGuideTargetElement() : this.getNextGuideDigitBox();

    if (nextDigitBox) {
      // 마커는 뺄셈에서만 표시
      if (operatorForGuide === "-") {
        this.markExpectedTarget(nextDigitBox);
      } else {
        document.querySelectorAll(".expected-target").forEach((el) => el.classList.remove("expected-target"));
      }
      const position = this.getHandGuidePosition(nextDigitBox);

      this.handGuide.guideTwice(position.x, position.y);

      // 손가이드 대상에 맞춰 digit-result-box 활성/회색 처리 동기화
      const currentPlaceForGuard = this.uiManager.getCurrentPlace();
      const psGuard = this.uiManager.getProgressState();
      const finishedBothSidesAtCurrent = operatorForGuide === "-" && psGuard.clicked[currentPlaceForGuard].left && psGuard.clicked[currentPlaceForGuard].right;
      if (!finishedBothSidesAtCurrent) {
        const targetDigitBox = nextDigitBox.closest(".digit-result-box") as HTMLElement | null;
        this.uiManager.setActiveDigitResultBox(targetDigitBox);
      }
    }
  }

  // 잘못된 클릭 처리
  private handleWrongClick() {
    // 손가이드 표시 시 기대 대상 마커도 재설정 (덧셈 제외)
    if (this.inputManager.getSelectedOperator() === "-") {
      this.updateExpectedTargetMarker();
    } else {
      document.querySelectorAll(".expected-target").forEach((el) => el.classList.remove("expected-target"));
    }
    this.showHandGuideForCurrentPlace();
  }

  // 올바른 클릭 처리
  private handleCorrectClick() {
    this.handGuide.hide();
    // 정답 수용 시 오답 카운트 리셋 및 타이머 재시작
    this.userInputManager.reset();
  }

  // 결과화면에서 잘못된 클릭 감지 설정 (UserInputManager에서 처리됨)
  private setupResultScreenClickDetection() {}

  // HandGuide 위치 계산 헬퍼 메서드 (향후 확장성을 위해)
  private getHandGuidePosition(targetElement: HTMLElement): { x: number; y: number } {
    return this.uiManager.getHandGuidePosition(targetElement);
  }

  // digit-result-box 상단 수모형 제거 유틸 (자리/측 기반)
  private clearResultImageContainer(place: Place, side: Side): void {
    const boxIdx = side === "left" ? 0 : 1;
    const resultBox = document.querySelectorAll(".result-box")[boxIdx];
    if (!resultBox) return;
    const idxMap: Record<string, number> = { hundreds: 0, tens: 1, ones: 2 };
    const targetIndex = idxMap[place as string] ?? 0;
    const nodeList = resultBox.querySelectorAll(".digit-result-box");
    const clickedBox = nodeList[targetIndex] as HTMLElement | null;
    if (!clickedBox) return;
    const resultImageContainer = clickedBox.querySelector(".result-image-container") as HTMLElement | null;
    if (resultImageContainer) {
      resultImageContainer.innerHTML = "";
    }
  }

  // 현재 자리의 digit-result-box 찾기 헬퍼 메서드
  private getCurrentPlaceDigitBox(): HTMLElement | null {
    return this.uiManager.getCurrentPlaceDigitBox();
  }

  // 다음에 가이드할 digit-result-box 찾기 (왼쪽 우선, 클릭 상태에 따라)
  private getNextGuideDigitBox(): HTMLElement | null {
    return this.uiManager.getNextGuideDigitBox();
  }

  // 특정 자리/측의 digit-result-box 헬퍼 (좌=left, 우=right)
  private getDigitResultBox(place: Place, side: "left" | "right"): HTMLElement | null {
    const idxMap: Record<string, number> = { hundreds: 0, tens: 1, ones: 2 };
    const boxIdx = side === "left" ? 0 : 1;
    const resultBox = document.querySelectorAll(".result-box")[boxIdx];
    if (!resultBox) return null;
    const digitBoxes = resultBox.querySelectorAll(".digit-result-box");
    const targetIndex = idxMap[place as string] ?? 0;
    return (digitBoxes[targetIndex] as HTMLElement) || null;
  }

  // 하위 자리가 0일 때 시작 자리를 tens/hundreds로 조정하는 특수 분기
  private setInitialPlaceForSubtractionStart(left: number, right: number): void {
    const leftOnes = left % 10;
    const rightOnes = right % 10;
    const leftTens = Math.floor((left % 100) / 10);
    const rightTens = Math.floor((right % 100) / 10);
    const leftHundreds = Math.floor(left / 100);
    const rightHundreds = Math.floor(right / 100);

    // 40-30, 400-300 등: 하위 자리가 모두 0이면 해당 상위 자리부터 시작
    // 1) 일의자리가 모두 0이면 십의자리부터
    if (leftOnes === 0 && rightOnes === 0) {
      // 십의자리도 모두 0이면 백의자리부터
      if (leftTens === 0 && rightTens === 0) {
        // 백의자리가 존재할 때만 백의자리로
        if (leftHundreds > 0 || rightHundreds > 0) {
          this.uiManager.setCurrentPlace("hundreds");
          return;
        }
      } else {
        // 십의자리 계산이 필요한 경우 십의자리로
        this.uiManager.setCurrentPlace("tens");
        return;
      }
    }

    // 기본: 일의자리부터 (변경 없음)
  }

  // 뺄셈의 빌림 케이스에서는 borrowable 이미지 위에 손가이드를 표시하도록 타겟 결정
  private getNextGuideTargetElement(): HTMLElement | null {
    const operator = this.inputManager.getSelectedOperator();
    const idxMap: Record<string, number> = { hundreds: 0, tens: 1, ones: 2 };
    const getDigitBox = (place: Place, side: "left" | "right"): HTMLElement | null => {
      const boxIdx = side === "left" ? 0 : 1;
      const resultBox = document.querySelectorAll(".result-box")[boxIdx];
      if (!resultBox) return null;
      const digitBoxes = resultBox.querySelectorAll(".digit-result-box");
      const targetIndex = idxMap[place as string] ?? 0;
      return (digitBoxes[targetIndex] as HTMLElement) || null;
    };
    const getDigitValue = (place: Place, side: "left" | "right"): number => {
      const boxIdx = side === "left" ? 0 : 1;
      const resultBox = document.querySelectorAll(".result-box")[boxIdx];
      const digit = resultBox?.querySelector(`.digit-result[data-place="${place}-result"]`) as HTMLElement | null;
      return digit ? parseInt(digit.textContent || "0", 10) : 0;
    };

    if (operator === "-") {
      const currentPlace = this.uiManager.getCurrentPlace();
      const ps = this.uiManager.getProgressState();

      // 두 번의 빌림이 완료된 특수 케이스(백→십, 십→일):
      // ones 좌/우가 완료되어 있고, tens가 10을 빌린 기록이 있으며(Counts.tens ≥ 10),
      // ones로의 빌림이 완료되었을 때는 십의자리 오른쪽으로 바로 유도한다.
      // (204-199 등의 케이스 보정. 다른 케이스는 기존 분기 로직 유지)
      if (currentPlace === "tens" && ps.clicked.ones.left && ps.clicked.ones.right) {
        // 연속 빌림 완료 신뢰 지표: 하위 자리로의 빌림이 각각 반영된 상태(tens, ones)
        const isDoubleBorrowDone = this.borrowedPlaces.has("tens") && this.borrowedPlaces.has("ones");
        if (isDoubleBorrowDone) {
          const tensRightEarly = getDigitBox("tens", "right");
          if (tensRightEarly) return tensRightEarly;
        }
      }
      const hasLeftPrepared = (place: Place): boolean => {
        const nb = document.querySelector(`.num-box[data-place="${place}-result"]`);
        const hasLeftGroup = !!nb?.querySelector(".num-model-group.group-left");
        const hasCount = !!nb?.querySelector(".num-model-count");
        return hasLeftGroup || hasCount;
      };

      if (
        currentPlace === "tens" &&
        ps.clicked.ones.left &&
        ps.clicked.ones.right &&
        !this.isInBorrowProcess &&
        !this.isWaitingForBorrow &&
        (this.borrowedPlaces.has("ones") || (this.state.getBorrowedCountsRecord()["tens"] || 0) >= 10)
      ) {
        // 214-199과 같이 ones 완료 후 tens가 0이 되어 상위 자리에서 빌림이 필요한 경우,
        // 오른쪽 tens 클릭보다 상위 자리(백의자리) 빌림 대상으로 손가이드를 우선 유도
        if (this.checkBorrowNeeded("tens")) {
          const borrowFrom = this.findBorrowablePlace("tens");
          if (borrowFrom) {
            const nb = document.querySelector(`.num-box[data-place="${borrowFrom}-result"]`);
            const b = nb?.querySelector(".borrowable") as HTMLElement | null;
            if (b) return b;
            const leftBoxIdx = 0;
            const resultBox = document.querySelectorAll(".result-box")[leftBoxIdx];
            if (resultBox) {
              const digitBoxes = resultBox.querySelectorAll(".digit-result-box");
              const idxMap: Record<string, number> = { hundreds: 0, tens: 1, ones: 2 };
              const targetIndex = idxMap[borrowFrom as string] ?? 0;
              const left = (digitBoxes[targetIndex] as HTMLElement) || null;
              if (left) return left;
            }
          }
        }
        const tensRight = getDigitBox("tens", "right");
        if (tensRight) return tensRight;
      }

      if (this.isInBorrowProcess || this.isWaitingForBorrow) {
        const from = this.borrowFromPlace;
        if (from) {
          const numBox = document.querySelector(`.num-box[data-place="${from}-result"]`);
          const borrowable = numBox?.querySelector(".borrowable") as HTMLElement | null;
          if (borrowable) return borrowable;
          const psNow = this.uiManager.getProgressState();
          if (!psNow.clicked[from].left) {
            const fallback = getDigitBox(from, "left");
            if (fallback) return fallback;
          }
        }
      }

      if (!ps.clicked[currentPlace].left) {
        if (
          currentPlace === "tens" &&
          ps.clicked.ones.left &&
          ps.clicked.ones.right &&
          !this.isInBorrowProcess &&
          !this.isWaitingForBorrow &&
          (this.borrowedPlaces.has("ones") || (this.state.getBorrowedCountsRecord()["tens"] || 0) >= 10)
        ) {
          const rightTarget = getDigitBox("tens", "right");
          if (rightTarget) return rightTarget;
        }
        if (hasLeftPrepared(currentPlace) && !this.checkBorrowNeeded(currentPlace)) {
          const targetRight = getDigitBox(currentPlace, "right");
          if (targetRight) return targetRight;
        }
        if (this.checkBorrowNeeded(currentPlace)) {
          const from = this.findBorrowablePlace(currentPlace);
          if (from) {
            const numBox = document.querySelector(`.num-box[data-place="${from}-result"]`);
            const borrowable = numBox?.querySelector(".borrowable") as HTMLElement | null;
            if (borrowable) return borrowable;
          }
        }
        const targetLeft = getDigitBox(currentPlace, "left");
        if (targetLeft) return targetLeft;
      }

      if (ps.clicked[currentPlace].left && !ps.clicked[currentPlace].right) {
        if (this.checkBorrowNeeded(currentPlace)) {
          const borrowFrom = this.findBorrowablePlace(currentPlace);
          if (borrowFrom) {
            const nb = document.querySelector(`.num-box[data-place="${borrowFrom}-result"]`);
            const b = nb?.querySelector(".borrowable") as HTMLElement | null;
            if (b) return b;
            const fallback = getDigitBox(borrowFrom, "left");
            if (fallback) return fallback;
          }
        }
        if (
          currentPlace === "tens" &&
          !this.isInBorrowProcess &&
          !this.isWaitingForBorrow &&
          (this.borrowedPlaces.has("ones") || (this.state.getBorrowedCountsRecord()["tens"] || 0) >= 10)
        ) {
          const lowerDone = ps.clicked.ones.left && ps.clicked.ones.right;
          if (lowerDone) {
            const target = getDigitBox("tens", "right");
            if (target) return target;
          }
        }
        const targetRight = getDigitBox(currentPlace, "right");
        if (targetRight) return targetRight;
      }
    }

    return this.getNextGuideDigitBox();
  }

  // 기대 대상 마커를 최신 기대 요소에 부여
  private updateExpectedTargetMarker(): void {
    // 덧셈에서는 기대 마커 사용하지 않음
    const opForMarker = this.inputManager.getSelectedOperator();
    document.querySelectorAll(".expected-target").forEach((el) => el.classList.remove("expected-target"));
    if (opForMarker === "-") {
      const el = this.getNextGuideTargetElement();
      if (el) this.markExpectedTarget(el);
    }
  }

  private markExpectedTarget(element: HTMLElement): void {
    // 기존 마커 제거 후 지정 요소에 마커 부여
    document.querySelectorAll(".expected-target").forEach((el) => el.classList.remove("expected-target"));
    element.classList.add("expected-target");
  }

  // 일의자리 자동 계산 (왼쪽→오른쪽 순서로 클릭, 값/수모형/애니메이션 포함)
  private async autoCalcOnesOnly() {
    if (this.isAnimating) return;
    this.state.stopAnimating();
    this.uiManager.setCurrentPlace("ones");
    this.uiManager.resetClickedStates();
    const place = "ones";
    for (let boxIdx = 0; boxIdx < 2; boxIdx++) {
      const side: Side = boxIdx === 0 ? "left" : "right";
      const progressState = this.uiManager.getProgressState();
      if (progressState.clicked[place][side]) continue;
      const digitSelector = `.digit-result[data-place="${place}-result"]`;
      const digitEl = document.querySelectorAll(digitSelector)[boxIdx] as HTMLElement;
      let value = digitEl ? parseInt(digitEl.textContent || "0", 10) : 0;

      if (value === 0) {
        continue;
      }
      const resultBox = document.querySelectorAll(".result-box")[boxIdx];
      const nodeList = resultBox.querySelectorAll(".digit-result-box");
      const box = nodeList[nodeList.length - 1 - 0];
      if (box) {
        await this.handleResultBoxClickAsync(box, boxIdx, 0);
      }
    }
    this.state.stopAnimating();
  }

  /**
   * 계산 완료 팝업 닫기
   */
  private closeCalculationResultPopup(): void {
    this.popupManager.closeCalculationResultPopup();
  }

  /**
   * 계산 완료 팝업 표시
   */
  private showCalculationResultPopup(): void {
    if (this.isCalculationComplete === false) return;
    if (!this.isAutoCalculating && !this.isCalculationComplete) return;

    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const resultNumber = this.getCalculationResult();
    const selectedOperator = this.inputManager.getSelectedOperator();
    if (selectedOperator === "+") {
      this.updateAllPlacesForAddition();
    } else if (selectedOperator === "-") {
      this.updateAllPlacesForSubtraction();
      const result = leftNumber - rightNumber;
      (["hundreds", "tens"] as Place[]).forEach((p) => {
        const nb = document.querySelector(`.num-box[data-place="${p}-result"]`);
        if (!nb) return;
        const zeroNode = nb.querySelector(".num-model-count");
        if (zeroNode && zeroNode.textContent?.trim() === "0" && this.shouldHideZeroForPlace(result, p)) {
          zeroNode.remove();
        }
      });
    }
    // 계산 완료 시점: 하이라이트/가이드/클릭 비활성화(자동 계산 포함)
    this.clearAllHighlights();
    this.uiManager.deactivateAllDigitResultBoxesHighlight();

    const calculationFormula = `${leftNumber}${selectedOperator}${rightNumber}=${resultNumber}`;
    this.popupManager.showCalculationResultPopup(calculationFormula);
  }

  /**
   * 특정 자리의 숫자 가져오기
   */
  private getDigitAtPlace(number: number, place: Place): number {
    return getDigitAtPlaceUtil(number, place);
  }

  /**
   * 빼기 시각적 표현 - 이미지를 빨간색으로 변환
   */
  private changeToRedImage(imgElement: HTMLImageElement, place: Place): void {
    changeToRedImage(imgElement, place);
  }

  /**
   * 빼기 시각적 표현 - 이미지를 원래 색으로 복원
   */
  private changeToOriginalImage(imgElement: HTMLImageElement, place: Place): void {
    changeToOriginalImage(imgElement, place);
  }

  /**
   * 빼기 전용 calc-container 배치
   */
  private placeNumModelInCalcContainerForSubtraction(place: Place, side: Side): void {
    const flow = this.getSubtractionFlow();
    flow.placeLeftGroup(place);
  }

  /**
   * 빼기 시각적 효과 적용
   */
  private applySubtractionVisualEffect(place: Place, side: Side): void {
    const flow = this.getSubtractionFlow();
    flow.applyVisual(place);
  }

  /**
   * 빼기 전용 mergeNumModelGroups
   */
  private mergeNumModelGroupsForSubtraction(place: Place, onComplete?: () => void): void {
    const flow = this.getSubtractionFlow();
    flow.mergeGroups(place, onComplete);
  }

  /**
   * 빼기에서 남은 이미지 개수 텍스트 업데이트
   */
  private updateNumModelCountForSubtraction(numBox: Element, place: Place, remainingCount: number): void {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const result = leftNumber - rightNumber;
    const shouldHideZero = (p: Place) => this.shouldHideZeroForPlace(result, p);
    this.renderer.updateSubtractionCount(numBox, place, remainingCount, shouldHideZero);
  }

  /**
   * 빼기에서 모든 자리 업데이트
   */
  private updateAllPlacesForSubtraction(): void {
    const flow = this.getSubtractionFlow();
    flow.updateAllPlaces();
  }

  /**
   * 더하기에서 모든 자리 카운트를 최종 결과 기준으로 동기화
   */
  private updateAllPlacesForAddition(): void {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const result = leftNumber + rightNumber;
    const places: Place[] = ["ones", "tens", "hundreds"];
    for (const place of places) {
      const numBox = document.querySelector(`.num-box[data-place="${place}-result"]`);
      if (!numBox) continue;
      const digit = this.getDigitAtPlace(result, place);
      if (digit <= 0) {
        if (this.shouldHideZeroForPlace(result, place)) {
          const existing = numBox.querySelector(".num-model-count");
          if (existing) existing.remove();
        } else {
          this.renderer.updateNumModelCountZero(numBox);
        }
      } else {
        this.renderer.updateNumModelCount(numBox, digit);
      }
    }
  }

  /**
   * 결과값 기준으로 선행 0 숨김 판단 유틸
   */
  private shouldHideZeroForPlace(result: number, place: Place): boolean {
    return shouldHideZeroForPlaceUtil(result, place);
  }

  /**
   * 뺄셈 계산이 완전히 끝났는지 확인
   */
  private isSubtractionCalculationComplete(): boolean {
    const flow = this.getSubtractionFlow();
    return flow.isCalculationComplete();
  }

  private getSubtractionFlow(): SubtractionFlow {
    if (this._subtractionFlow) return this._subtractionFlow;
    const self = this;
    this._subtractionFlow = new SubtractionFlow({
      inputManager: this.inputManager,
      calculationManager: this.calculationManager,
      renderer: this.renderer,
      effects: { runSubtractionHighlightAndFade },
      logic: { computeSubtractionDigitForPlace: computeSubtractionDigitForPlaceLogic },
      state: {
        get isAutoCalculating(): boolean {
          return self.isAutoCalculating;
        },
        get isCalculationComplete(): boolean {
          return self.isCalculationComplete;
        },
      },
      borrowedPlaces: this.borrowedPlaces,
      buildBorrowedCounts: () => this.buildBorrowedCounts(),
    });
    return this._subtractionFlow;
  }

  /**
   * 빼기에서 빌림이 필요한지 확인
   */
  private checkBorrowNeeded(place: Place): boolean {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const borrowed: Record<Place, number> = this.buildBorrowedCounts();
    const needs = needsBorrowLogic(leftNumber, rightNumber, place, borrowed, this.borrowedPlaces);
    return needs;
  }

  /**
   * 특정 자리에서 하위 자리로 빌림이 필요한지 확인
   */
  private checkBorrowNeededForLowerPlace(place: Place): boolean {
    const places: Place[] = ["ones", "tens", "hundreds"];
    const currentIndex = places.indexOf(place);
    for (let i = 0; i < currentIndex; i++) {
      const lowerPlace = places[i];
      if (this.checkBorrowNeeded(lowerPlace)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 빌림 가능한 자리 찾기
   */
  private findBorrowablePlace(currentPlace: Place): Place | null {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const borrowed = this.state.getBorrowedCountsRecord();
    return findBorrowablePlaceLogic(leftNumber, currentPlace, borrowed);
  }
  private isTwoStepBorrowScenario(): boolean {
    const left = this.inputManager.getNumberFromDisplays("left");
    const right = this.inputManager.getNumberFromDisplays("right");
    if (left <= right) return false;
    const leftMod100 = left % 100;
    const rightMod100 = right % 100;
    return leftMod100 === 0 && rightMod100 === 99;
  }

  /**
   * 가장 가까운 빌림 가능한 자리 찾기
   */
  private findNearestBorrowablePlace(currentPlace: Place): Place | null {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const borrowed = this.state.getBorrowedCountsRecord();
    return findNearestBorrowablePlaceLogic(leftNumber, currentPlace, borrowed);
  }

  /**
   * 빌림받을 자리 찾기 (상위 자리에서 하위 자리로)
   */
  private getBorrowToPlace(borrowFromPlace: Place): Place | null {
    return getBorrowToPlaceLogic(borrowFromPlace);
  }

  /**
   * 특정 자리에서 실제 계산 가능한 개수 반환 (원래 숫자 + 빌림받은 개수)
   */
  private getActualAvailableCount(place: Place): number {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const borrowed = this.state.getBorrowedCountsRecord();
    return getActualAvailableCountLogic(leftNumber, place, borrowed);
  }

  /**
   * 빌림 UI 표시 - 빌림 가능한 이미지에 3px dashed red 테두리 표시
   */
  private showBorrowUI(borrowFromPlace: Place): void {
    const controller = this.getBorrowController();
    controller.showBorrowUI(borrowFromPlace);
    setTimeout(() => {
      this.showHandGuideForCurrentPlace();
    }, 80);
  }

  /**
   * 빌림 클릭 처리
   */
  private handleBorrowClick(borrowFromPlace: Place, clickedImage: HTMLImageElement): void {
    setTimeout(() => void this.executeBorrowAnimation(borrowFromPlace, clickedImage), 100);
  }

  /**
   * 빌림 애니메이션 실행
   */
  private async executeBorrowAnimation(borrowFromPlace: Place, clickedImage: HTMLImageElement): Promise<void> {
    const prevCurrentPlace = this.uiManager.getCurrentPlace();
    const controller = this.getBorrowController();
    const targetToPlaceBefore = controller ? undefined : undefined;
    const result = await controller.handleBorrowClick(borrowFromPlace, clickedImage);
    if (!result) return;
    const { to: borrowToPlace, totalImages, wasBorrowedPlace } = result as { to: Place; totalImages: number; wasBorrowedPlace: boolean };

    const targetNumBox = this.numBoxFor(borrowToPlace);
    if (targetNumBox) this.updateNumModelCountForSubtraction(targetNumBox, borrowToPlace as Place, totalImages);

    // tens 자리의 카운트는 ones에서 빌림이 발생하면 즉시 +10을 반영하여 다음 단계에서 9-8=1이 되도록 유지
    if (borrowToPlace === "tens") {
      const tensBox = this.numBoxFor("tens");
      if (tensBox) this.renderer.updateSubtractionCount(tensBox, "tens", totalImages, (p: Place) => false);
    }

    // 자동계산 중이든 수동이든, 빌림이 완료되어 하위 자리(borrowToPlace) 왼쪽이 확정되는 순간
    // 해당 자리의 상단 수모형을 제거하여 상태를 동기화
    this.clearResultImageContainer(borrowToPlace, "left");

    const psAfterBorrow = this.uiManager.getProgressState();
    if (!psAfterBorrow.clicked[borrowToPlace].left) {
      this.uiManager.setClickedState(borrowToPlace, "left", true);
    }

    if (borrowFromPlace === "tens" || borrowFromPlace === "hundreds") {
      const borrowNumBox = document.querySelector(`.num-box[data-place="${borrowFromPlace}-result"]`);
      if (borrowNumBox) {
        if (wasBorrowedPlace) {
          const remainingCount = 9;
          this.renderer.rebuildBorrowFromBox(borrowNumBox, borrowFromPlace, remainingCount);
        } else {
          const leftNumber = this.inputManager.getNumberFromDisplays("left");
          const borrowDigit = this.getDigitAtPlace(leftNumber, borrowFromPlace);
          const remainingCount = Math.max(borrowDigit - 1, 0);
          this.renderer.rebuildBorrowFromBox(borrowNumBox, borrowFromPlace, remainingCount);
        }
      }
    }

    this.borrowedPlaces.add(borrowToPlace);
    this.isWaitingForBorrow = false;
    if (this.isTwoStepBorrowScenario && this.isTwoStepBorrowScenario()) {
      this.uiManager.setCurrentPlace(prevCurrentPlace);
      this.highlightCurrentNumBox();
    }
    this.state.endBorrowProcess();
    // 빌림이 모두 끝난 뒤, 다음 클릭 타겟(예: 오른쪽 일의자리)으로 하이라이트/타깃 갱신
    this.updateExpectedTargetMarker();
    this.highlightCurrentNumBox();
  }

  private getBorrowController(): BorrowController {
    if (this._borrowController) return this._borrowController;
    const self = this;
    this._borrowController = new BorrowController({
      state: {
        startBorrowProcess: (from) => this.state.startBorrowProcess(from),
        endBorrowProcess: () => this.state.endBorrowProcess(),
        get isInBorrowProcess(): boolean {
          return self.isInBorrowProcess;
        },
        get isWaitingForBorrow(): boolean {
          return self.isWaitingForBorrow;
        },
      },
      uiManager: { setClickedState: (place, side, clicked) => this.uiManager.setClickedState(place, side, clicked) },
      borrowUI: { showBorrowUI: (p) => this.borrowUI.showBorrowUI(p) },
      renderer: { rebuildBorrowFromBox: (box: HTMLElement, p: Place, n: number) => this.renderer.rebuildBorrowFromBox(box, p, n) },
      helpers: {
        numBoxFor: (p) => this.numBoxFor(p as Place),
        ensureGroup: (nb, s, p) => this.ensureGroup(nb as HTMLElement, s as "left" | "right", p as Place),
        splitGroupsAndDistribute: (a, b, c, d, e, f, g) =>
          this.splitGroupsAndDistribute(a as HTMLElement, b as NodeListOf<Element>, c as Place, d as string, e as number, f as number, g as string),
        appendImagesToGroup: (a, b, c, d, e) => this.appendImagesToGroup(a as HTMLElement, b as string, c as number, d as number, e as string),
      },
      logic: {
        applyBorrow: (borrowed, from) => applyBorrowLogic(borrowed, from),
        findBorrowablePlace: (left, current, borrowed) => findBorrowablePlaceLogic(left, current, borrowed),
        needsBorrow: (left, right, place, borrowed) => needsBorrowLogic(left, right, place, borrowed),
      },
      accessors: {
        getLeftNumber: () => this.inputManager.getNumberFromDisplays("left"),
        getRightNumber: () => this.inputManager.getNumberFromDisplays("right"),
        getBorrowedCountsRecord: () => this.state.getBorrowedCountsRecord(),
        setBorrowCount: (place, value) => this.borrowCounts.set(place, value),
        isBorrowedPlace: (place) => this.borrowedPlaces.has(place),
      },
    });
    return this._borrowController;
  }

  /**
   * 누락된 자리들의 이미지를 자동으로 생성
   */
  private createMissingPlaceImages(fromPlace: Place, toPlace: Place): void {
    const places: Place[] = ["ones", "tens", "hundreds"];
    const fromIndex = places.indexOf(fromPlace);
    const toIndex = places.indexOf(toPlace);

    for (let i = fromIndex + 1; i < toIndex; i++) {
      const middlePlace = places[i];
      const progressState = this.uiManager.getProgressState();

      if (!progressState.clicked[middlePlace].left) {
        this.placeNumModelInCalcContainerForSubtraction(middlePlace, "left");

        this.uiManager.setClickedState(middlePlace, "left", true);
      }
    }
  }

  /**
   * 상위 자리에 계산할 것이 남았는지 확인
   */
  private checkRemainingCalculation(currentPlace: Place): boolean {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    return hasRemainingCalculationLogic(currentPlace, leftNumber, rightNumber, this.borrowedPlaces);
  }

  /**
   * 계산 결과 가져오기
   */
  private getCalculationResult(): number {
    const leftNumber = this.inputManager.getNumberFromDisplays("left");
    const rightNumber = this.inputManager.getNumberFromDisplays("right");
    const selectedOperator = this.inputManager.getSelectedOperator();

    return this.calculationManager.getCalculationResult(leftNumber, rightNumber, selectedOperator);
  }
}

