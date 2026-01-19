export interface InputConfig {
  correctSelectors: string[]; // 올바른 클릭 영역 선택자들
  excludeSelectors: string[]; // 제외할 클릭 영역 선택자들
  autoGuideDelay: number; // 자동 가이드 지연 시간 (ms) - 기본값: 5000ms (5초)
  wrongClickThreshold: number; // 잘못된 클릭 임계값
}

export interface InputState {
  wrongClickCount: number;
  lastInputTime: number;
  isActive: boolean;
}

export default class UserInputManager {
  private config: InputConfig;
  private state: InputState;
  private onWrongClick: (() => void) | null = null;
  private onCorrectClick: (() => void) | null = null;
  private onAutoGuide: (() => void) | null = null;
  private autoGuideTimeout: ReturnType<typeof setTimeout> | null = null;
  private clickListener: ((e: Event) => void) | null = null;

  constructor(config: InputConfig) {
    this.config = config;
    this.state = {
      wrongClickCount: 0,
      lastInputTime: Date.now(),
      isActive: false,
    };
  }

  // 이벤트 핸들러 등록
  setEventHandlers(onWrongClick: () => void, onCorrectClick: () => void, onAutoGuide: () => void) {
    this.onWrongClick = onWrongClick;
    this.onCorrectClick = onCorrectClick;
    this.onAutoGuide = onAutoGuide;
  }

  // 입력 감지 시작
  start(container: HTMLElement) {
    if (this.state.isActive) return;

    // console.log(`[UserInputManager] 입력 감지 시작`);

    this.state.isActive = true;
    this.state.wrongClickCount = 0;
    this.state.lastInputTime = Date.now();

    // 클릭 이벤트 리스너 등록 (캡처 단계에서 먼저 판정)
    this.clickListener = (e: Event) => this.handleClick(e);
    container.addEventListener("click", this.clickListener, true);

    // 자동 가이드 타이머 시작
    this.startAutoGuideTimer();
  }

  // 입력 감지 중지
  stop() {
    // console.log(`[UserInputManager] 입력 감지 중지`);

    this.state.isActive = false;

    // 클릭 이벤트 리스너 제거 (container에서 제거)
    if (this.clickListener) {
      // document에서도 제거 시도
      document.removeEventListener("click", this.clickListener, true);
      document.removeEventListener("click", this.clickListener);
      // result-screen에서도 제거 시도
      const resultScreen = document.querySelector(".result-screen");
      if (resultScreen) {
        resultScreen.removeEventListener("click", this.clickListener, true);
        resultScreen.removeEventListener("click", this.clickListener);
      }
      // 모든 가능한 컨테이너에서 제거 시도
      document.querySelectorAll(".container, .main-layout, .result-screen").forEach((container) => {
        container.removeEventListener("click", this.clickListener!, true);
        container.removeEventListener("click", this.clickListener!);
      });
      this.clickListener = null;
    }

    // 자동 가이드 타이머 중지
    this.stopAutoGuideTimer();
  }

  // 클릭 이벤트 처리
  private handleClick(e: Event) {
    const target = e.target as HTMLElement;

    // 제외할 요소들 체크
    for (const excludeSelector of this.config.excludeSelectors) {
      if (target.closest(excludeSelector)) {
        return; // 제외할 요소 클릭은 무시
      }
    }

    // 올바른 클릭 영역 체크
    let isCorrectClick = false;
    // 1) 기대 대상 마커(.expected-target)가 존재하면 이를 최우선으로 사용
    const expectedMarked = document.querySelector(".expected-target") as HTMLElement | null;
    if (expectedMarked) {
      isCorrectClick = !!target.closest(".expected-target");
    } else {
      // 2) 없다면 기존 correctSelectors 기준으로 판단
      for (const correctSelector of this.config.correctSelectors) {
        if (target.closest(correctSelector)) {
          isCorrectClick = true;
          break;
        }
      }
    }

    if (isCorrectClick) {
      this.handleCorrectClick();
    } else {
      this.handleWrongClick();
    }
  }

  // 올바른 클릭 처리
  private handleCorrectClick() {
    // console.log(`[UserInputManager] 올바른 클릭 감지`);
    this.state.wrongClickCount = 0;
    this.state.lastInputTime = Date.now();

    if (this.onCorrectClick) {
      this.onCorrectClick();
    }

    // 자동 가이드 타이머 재시작
    this.restartAutoGuideTimer();
  }

  // 잘못된 클릭 처리
  private handleWrongClick() {
    this.state.wrongClickCount++;
    this.state.lastInputTime = Date.now();

    // console.log(`[UserInputManager] 잘못된 클릭 감지 - 카운트: ${this.state.wrongClickCount}/${this.config.wrongClickThreshold}`);

    if (this.state.wrongClickCount >= this.config.wrongClickThreshold) {
      // console.log(`[UserInputManager] 잘못된 클릭 임계값 도달 - 가이드 실행`);
      if (this.onWrongClick) {
        this.onWrongClick();
      }
      this.state.wrongClickCount = 0; // 카운트 리셋
    }
  }

  // 자동 가이드 타이머 시작
  private startAutoGuideTimer() {
    this.stopAutoGuideTimer();

    // console.log(`[UserInputManager] 자동 가이드 타이머 시작 - ${this.config.autoGuideDelay}ms 후 실행`);

    this.autoGuideTimeout = setTimeout(() => {
      // console.log(`[UserInputManager] 자동 가이드 실행`);
      if (this.onAutoGuide) {
        this.onAutoGuide();
      }
      this.state.lastInputTime = Date.now(); // 타이머 리셋

      // 타이머는 한 번만 실행하고, 애니메이션이 끝난 후에 다시 시작됨
      // (HandGuide에서 애니메이션 완료 후 restartAutoGuideTimer 호출)
    }, this.config.autoGuideDelay);
  }

  // 외부(도메인 로직)에서 잘못된 클릭을 보고할 때 사용
  public reportWrongClick(): void {
    this.state.wrongClickCount++;
    this.state.lastInputTime = Date.now();

    if (this.state.wrongClickCount >= this.config.wrongClickThreshold) {
      if (this.onWrongClick) {
        this.onWrongClick();
      }
      this.state.wrongClickCount = 0;
    }
  }

  // 자동 가이드 타이머 중지
  private stopAutoGuideTimer() {
    if (this.autoGuideTimeout) {
      clearTimeout(this.autoGuideTimeout);
      this.autoGuideTimeout = null;
    }
  }

  // 자동 가이드 타이머 재시작
  restartAutoGuideTimer() {
    this.startAutoGuideTimer();
  }

  // 일시정지 (자동계산 중)
  pause() {
    // console.log(`[UserInputManager] 일시정지`);
    this.state.isActive = false;
    this.stopAutoGuideTimer();
  }

  // 재개 (자동계산 완료 후)
  resume() {
    // console.log(`[UserInputManager] 재개`);
    this.state.isActive = true;
    this.restartAutoGuideTimer();
  }

  // 상태 리셋
  reset() {
    this.state.wrongClickCount = 0;
    this.state.lastInputTime = Date.now();
    this.restartAutoGuideTimer();
  }

  // 완전 비활성화 (계산 완료 시)
  disable() {
    // console.log(`[UserInputManager] 완전 비활성화`);
    this.state.isActive = false;
    this.state.wrongClickCount = 0;
    this.stopAutoGuideTimer();

    // 클릭 이벤트 리스너 제거
    if (this.clickListener) {
      document.removeEventListener("click", this.clickListener, true);
      document.removeEventListener("click", this.clickListener);
      const resultScreen = document.querySelector(".result-screen");
      if (resultScreen) {
        resultScreen.removeEventListener("click", this.clickListener, true);
        resultScreen.removeEventListener("click", this.clickListener);
      }
      this.clickListener = null;
    }
  }

  // 현재 상태 반환
  getState(): InputState {
    return { ...this.state };
  }
}
