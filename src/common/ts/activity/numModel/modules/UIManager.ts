// 자리 및 방향 타입 정의
import { PLACES, type Place } from "../logic/PlaceUtils";
type Side = "left" | "right";

export interface ProgressState {
  currentPlace: Place;
  clicked: {
    ones: { left: boolean; right: boolean };
    tens: { left: boolean; right: boolean };
    hundreds: { left: boolean; right: boolean };
    thousands: { left: boolean; right: boolean };
  };
}

export interface UIManagerConfig {
  onPlaceChange?: (place: Place) => void;
  onStateChange?: (state: ProgressState) => void;
}

export type ResultButtonHandlers = {
  onAutoCalc?: () => void;
  onReset?: () => void;
  onHome?: () => void;
};

export default class UIManager {
  private config: UIManagerConfig;
  private progressState: ProgressState = {
    currentPlace: "ones",
    clicked: {
      ones: { left: false, right: false },
      tens: { left: false, right: false },
      hundreds: { left: false, right: false },
      thousands: { left: false, right: false },
    },
  };

  constructor(config: UIManagerConfig = {}) {
    this.config = config;
  }

  /**
   * 현재 진행 상태 반환
   */
  public getProgressState(): ProgressState {
    return { ...this.progressState };
  }

  /**
   * 현재 자리 반환
   */
  public getCurrentPlace(): Place {
    return this.progressState.currentPlace;
  }

  /**
   * 현재 자리 설정
   */
  public setCurrentPlace(place: Place): void {
    this.progressState.currentPlace = place;
    if (this.config.onPlaceChange) {
      this.config.onPlaceChange(place);
    }
  }

  /**
   * 클릭 상태 설정
   */
  public setClickedState(place: Place, side: Side, clicked: boolean): void {
    this.progressState.clicked[place][side] = clicked;
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getProgressState());
    }
  }

  /**
   * 모든 클릭 상태 초기화
   */
  public resetClickedStates(): void {
    this.progressState.clicked = {
      ones: { left: false, right: false },
      tens: { left: false, right: false },
      hundreds: { left: false, right: false },
      thousands: { left: false, right: false },
    };
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getProgressState());
    }
  }

  /**
   * 진행 상태 완전 초기화
   */
  public resetProgressState(): void {
    this.progressState = {
      currentPlace: "ones",
      clicked: {
        ones: { left: false, right: false },
        tens: { left: false, right: false },
        hundreds: { left: false, right: false },
        thousands: { left: false, right: false },
      },
    };
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getProgressState());
    }
  }

  /**
   * 다음 자리 반환
   */
  public getNextPlace(place: Place): Place | null {
    const placeIndex = PLACES.indexOf(place);
    if (placeIndex < PLACES.length - 1) {
      return PLACES[placeIndex + 1];
    }
    return null;
  }

  /**
   * 현재 자리 하이라이트
   */
  public highlightCurrentNumBox(): void {
    // 모든 하이라이트 제거 (num-model-count는 보존)
    this.clearAllHighlights();

    // 현재 자리의 num-box 하이라이트
    const currentPlace = this.progressState.currentPlace;
    const numBoxes = document.querySelectorAll(`.num-box[data-place="${currentPlace}-result"]`);
    numBoxes.forEach((box) => {
      box.classList.add("active");
    });
    // 결과 박스 하이라이트도 함께 갱신
    this.updateDigitResultBoxesHighlight();
  }

  /**
   * 모든 하이라이트 제거
   */
  public clearAllHighlights(): void {
    document.querySelectorAll(".num-box").forEach((box) => {
      box.classList.remove("active");
    });
  }

  /**
   * 결과 화면의 digit-result-box 하이라이트 갱신
   * - 현재 차례의 박스만 컬러 유지, 나머지는 회색 처리
   */
  public updateDigitResultBoxesHighlight(): void {
    const allBoxes = Array.from(document.querySelectorAll(".digit-result-box")) as HTMLElement[];
    if (allBoxes.length === 0) return;

    // 다음 가이드 대상 박스(현재 자리에서 아직 클릭하지 않은 쪽, 왼쪽 우선)
    const nextBox = this.getNextGuideDigitBox();
    if (!nextBox) return; // 타깃이 없을 땐 기존 상태 유지
    // nextBox만 활성화, 나머지는 회색 처리
    allBoxes.forEach((box) => {
      if (box === nextBox) box.classList.remove("inactive");
      else box.classList.add("inactive");
    });
  }

  /**
   * 주어진 박스만 활성화(회색 해제)하고 나머지는 회색 처리
   */
  public setActiveDigitResultBox(targetBox: HTMLElement | null): void {
    if (!targetBox) return; // 타깃이 없으면 상태 유지
    const allBoxes = Array.from(document.querySelectorAll(".digit-result-box")) as HTMLElement[];
    if (allBoxes.length === 0) return;
    allBoxes.forEach((box) => {
      if (box === targetBox) box.classList.remove("inactive");
      else box.classList.add("inactive");
    });
  }

  /**
   * 모든 digit-result-box를 회색 처리(비활성화)로 전환
   */
  public deactivateAllDigitResultBoxesHighlight(): void {
    document.querySelectorAll(".digit-result-box").forEach((box) => {
      (box as HTMLElement).classList.add("inactive");
    });
  }

  /**
   * 입력 화면 표시
   */
  public showInputScreen(): void {
    // 입력화면 보이기
    const mainLayout = document.querySelector(".main-layout") as HTMLElement;
    if (mainLayout) {
      mainLayout.style.visibility = "visible";
    }

    const container = document.querySelector(".container") as HTMLElement;
    if (container) {
      container.style.visibility = "visible";
    }

    // 결과화면 숨기기
    const resultScreen = document.querySelector(".result-screen") as HTMLElement;
    if (resultScreen) {
      resultScreen.style.visibility = "hidden";
    }
  }

  /**
   * 모달 표시
   */
  public showModal(message: string): void {
    const modal = document.querySelector("#global-modal") as HTMLElement;
    const modalText = document.querySelector(".global-modal-message") as HTMLElement;

    if (modal && modalText) {
      modalText.textContent = message;
      modal.style.display = "flex";

      // 확인 버튼 클릭 이벤트 추가
      const closeBtn = modal.querySelector(".global-modal-close");
      if (closeBtn) {
        const closeHandler = () => {
          this.hideModal();
          closeBtn.removeEventListener("click", closeHandler);
        };
        closeBtn.addEventListener("click", closeHandler);
      }

      // ESC 키 이벤트 리스너 추가
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          this.hideModal();
          document.removeEventListener("keydown", escHandler);
        }
      };
      document.addEventListener("keydown", escHandler);
    }
  }

  /**
   * 모달 숨기기
   */
  public hideModal(): void {
    const modal = document.querySelector("#global-modal") as HTMLElement;
    if (modal) {
      modal.style.display = "none";
    }
  }

  /**
   * 버튼 상태 설정
   */
  public setButtonState(buttonSelector: string, active: boolean): void {
    const button = document.querySelector(buttonSelector);
    if (button) {
      if (active) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }

  /**
   * 버튼 비활성화/활성화
   */
  public setButtonEnabled(buttonSelector: string, enabled: boolean): void {
    const button = document.querySelector(buttonSelector) as HTMLElement;
    if (button) {
      button.style.pointerEvents = enabled ? "auto" : "none";
      button.style.opacity = enabled ? "1" : "0.5";
    }
  }

  /**
   * 결과 화면 버튼들 설정
   */
  public setupResultScreenButtons(): void {
    // 자동계산 버튼
    const autoCalcBtn = document.querySelector(".btn-auto-calc");
    if (autoCalcBtn) {
      autoCalcBtn.addEventListener("click", () => {
        // 자동계산 로직은 외부에서 처리
        this.setButtonState(".btn-auto-calc", true);
      });
    }

    // 처음으로 버튼
    const homeBtn = document.querySelector(".btn-home");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        // 홈으로 가기 로직은 외부에서 처리
        this.showInputScreen();
      });
    }

    // 다시하기 버튼
    const resetBtn = document.querySelector(".btn-result-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        // 리셋 로직은 외부에서 처리
        this.setButtonState(".btn-result-reset", true);
      });
    }
  }

  /**
   * 결과 화면 버튼 바인딩 (콜백 위임)
   */
  public bindResultScreenButtons(handlers: ResultButtonHandlers): void {
    const { onAutoCalc, onReset, onHome } = handlers;
    const autoCalcBtn = document.querySelector(".btn-auto-calc");
    if (autoCalcBtn && onAutoCalc) {
      autoCalcBtn.addEventListener("click", () => onAutoCalc());
    }
    const resetBtn = document.querySelector(".btn-result-reset");
    if (resetBtn && onReset) {
      resetBtn.addEventListener("click", () => onReset());
    }
    const homeBtn = document.querySelector(".btn-home");
    if (homeBtn && onHome) {
      homeBtn.addEventListener("click", () => onHome());
    }
  }

  /**
   * 자동계산 버튼 상태 설정
   */
  public setAutoCalcButtonState(calculating: boolean): void {
    const autoCalcBtn = document.querySelector(".btn-auto-calc");
    if (autoCalcBtn) {
      if (calculating) {
        autoCalcBtn.classList.add("calculating");
      } else {
        autoCalcBtn.classList.remove("calculating");
      }
    }
  }

  /**
   * 현재 자리의 digit-box 반환
   */
  public getCurrentPlaceDigitBox(): HTMLElement | null {
    const currentPlace = this.progressState.currentPlace;
    const progressState = this.getProgressState();

    // 왼쪽을 클릭하지 않았다면 왼쪽 result-box에서 찾기
    if (!progressState.clicked[currentPlace].left) {
      const leftResultBox = document.querySelectorAll(".result-box")[0];
      if (leftResultBox) {
        const digitBoxes = leftResultBox.querySelectorAll(".digit-result-box");
        const targetIndex = this.getPlaceIndex(currentPlace);
        return (digitBoxes[targetIndex] as HTMLElement) || null;
      }
    }
    // 오른쪽을 클릭하지 않았다면 오른쪽 result-box에서 찾기
    else if (!progressState.clicked[currentPlace].right) {
      const rightResultBox = document.querySelectorAll(".result-box")[1];
      if (rightResultBox) {
        const digitBoxes = rightResultBox.querySelectorAll(".digit-result-box");
        const targetIndex = this.getPlaceIndex(currentPlace);
        return (digitBoxes[targetIndex] as HTMLElement) || null;
      }
    }

    return null;
  }

  /**
   * 다음 가이드할 digit-box 반환 (현재 자리에서 클릭하지 않은 쪽)
   */
  public getNextGuideDigitBox(): HTMLElement | null {
    const currentPlace = this.progressState.currentPlace;
    const progressState = this.getProgressState();

    // 현재 자리에서 클릭하지 않은 쪽 찾기 (왼쪽 우선)
    const isLeftClicked = progressState.clicked[currentPlace].left;
    const isRightClicked = progressState.clicked[currentPlace].right;

    // 왼쪽을 클릭하지 않았다면 왼쪽 가이드
    if (!isLeftClicked) {
      // 왼쪽 result-box의 digit-result-box 찾기
      const leftResultBox = document.querySelectorAll(".result-box")[0];
      if (leftResultBox) {
        const digitBoxes = leftResultBox.querySelectorAll(".digit-result-box");
        const targetIndex = this.getPlaceIndex(currentPlace);
        if (digitBoxes[targetIndex]) {
          return digitBoxes[targetIndex] as HTMLElement;
        }
      }
    }
    // 오른쪽을 클릭하지 않았다면 오른쪽 가이드
    else if (!isRightClicked) {
      // 오른쪽 result-box의 digit-result-box 찾기
      const rightResultBox = document.querySelectorAll(".result-box")[1];
      if (rightResultBox) {
        const digitBoxes = rightResultBox.querySelectorAll(".digit-result-box");
        const targetIndex = this.getPlaceIndex(currentPlace);
        if (digitBoxes[targetIndex]) {
          return digitBoxes[targetIndex] as HTMLElement;
        }
      }
    }

    // 현재 자리에서 모두 클릭했다면 다음 자리로
    const nextPlace = this.getNextPlace(currentPlace);
    if (nextPlace) {
      // 다음 자리는 왼쪽부터 시작
      const leftResultBox = document.querySelectorAll(".result-box")[0];
      if (leftResultBox) {
        const digitBoxes = leftResultBox.querySelectorAll(".digit-result-box");
        const targetIndex = this.getPlaceIndex(nextPlace);
        if (digitBoxes[targetIndex]) {
          return digitBoxes[targetIndex] as HTMLElement;
        }
      }
    }
    return null;
  }

  /**
   * 자리별 인덱스 반환 (ones: 2, tens: 1, hundreds: 0)
   */
  private getPlaceIndex(place: Place): number {
    switch (place) {
      case "ones":
        return 2;
      case "tens":
        return 1;
      case "hundreds":
        return 0;
      case "thousands":
        return 0; // thousands는 hundreds와 같은 위치
      default:
        return 0;
    }
  }

  /**
   * HandGuide 위치 계산
   */
  public getHandGuidePosition(targetElement: HTMLElement): { x: number; y: number } {
    const rect = targetElement.getBoundingClientRect();

    const handGuideWidth = 80;
    const handGuideHeight = 100;

    // #wrap 기준 좌표로 변환: wrap의 좌상단을 (0,0)으로 보정
    const wrapEl = document.querySelector("#wrap") as HTMLElement;
    const wrapRect = wrapEl ? wrapEl.getBoundingClientRect() : ({ left: 0, top: 0 } as DOMRect);

    // borrowable(빨간 테두리) 이미지 위에는 중앙 정렬 + 추가 오프셋(X:+8px, Y:+30px)
    const isBorrowableTarget = targetElement.classList.contains("borrowable") || targetElement.classList.contains("borrowable-highlight");
    // borrowable(빨간 테두리)일 때 보정값
    // 기본 보정은 약간 왼쪽, 백의자리(hundreds)에서는 오른쪽으로 조금 더 이동시켜 정중앙에 가깝게 보정
    let borrowableXOffset = -10; // 기본값
    const borrowableYOffset = 32; // 살짝 아래
    if (isBorrowableTarget) {
      const isHundreds = !!targetElement.closest('.num-box[data-place="hundreds-result"]');
      if (isHundreds) {
        borrowableXOffset = 20; // 백의자리에서는 오른쪽으로 조금 이동
      }
    }
    const xViewport = isBorrowableTarget ? rect.left + borrowableXOffset : rect.right - handGuideWidth + 10;
    const yViewport = isBorrowableTarget ? rect.top + borrowableYOffset : rect.bottom - handGuideHeight + 30;

    const scale = (window as unknown as { bound?: { scale?: number } }).bound?.scale || 1;
    const x = (xViewport - wrapRect.left) / scale;
    const y = (yViewport - wrapRect.top) / scale;

    return { x, y };
  }
}

