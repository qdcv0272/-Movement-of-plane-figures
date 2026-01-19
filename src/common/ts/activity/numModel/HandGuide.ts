interface HandGuideConfig {
  initialShowDuration: number; // 초기 가이드 표시 시간 (ms)
  clickAnimationDelay: number; // 클릭 애니메이션 시작 전 대기 시간 (ms)
  clickHoldDuration: number; // 클릭 상태 유지 시간 (ms)
  clickReleaseDelay: number; // 클릭 해제 후 대기 시간 (ms)
  betweenClicksDelay: number; // 클릭 사이 대기 시간 (ms)
}

class HandGuide {
  private handEl: HTMLDivElement;
  private autoGuideTimer: number | null = null;
  private lastInputTime: number = Date.now();
  private autoGuideX: number = 0;
  private autoGuideY: number = 0;
  private isAnimating: boolean = false;
  private isAutoCalculating: boolean = false; // 자동계산 중인지 상태 추가
  private onAnimationComplete: (() => void) | null = null;
  private config: HandGuideConfig;

  constructor(container: HTMLElement = document.body, config?: Partial<HandGuideConfig>) {
    // 기본 설정
    this.config = {
      initialShowDuration: 1000, // 1초
      clickAnimationDelay: 400, // 0.4초
      clickHoldDuration: 500, // 0.5초
      clickReleaseDelay: 500, // 0.5초
      betweenClicksDelay: 300, // 0.3초
      ...config, // 사용자 설정으로 덮어쓰기
    };

    this.handEl = document.createElement("div");
    this.handEl.className = "hand-guide";
    this.handEl.setAttribute("aria-label", "터치 유도");

    container.appendChild(this.handEl);
  }

  show(x: number, y: number) {
    // 자동계산 중이면 가이드 표시하지 않음
    if (this.isAutoCalculating) {
      return;
    }

    this.handEl.style.left = `${x}px`;
    this.handEl.style.top = `${y}px`;
    this.handEl.classList.add("show");
    this.handEl.classList.remove("clicking"); // 클릭 상태 제거
  }

  // 초기 가이드용 (클릭 애니메이션 없이 단순 표시)
  async showInitialGuide(x: number, y: number) {
    this.show(x, y);
    await this.sleep(this.config.initialShowDuration);
    this.hide();
  }

  hide() {
    this.handEl.classList.remove("show");
  }

  // 강제 정지 (애니메이션 중에도 즉시 정지)
  forceStop() {
    this.handEl.classList.remove("show");
    this.handEl.classList.remove("clicking");
    this.isAnimating = false;
    this.isAutoCalculating = true; // 추가 보호 장치
    // 애니메이션 완료 콜백도 호출하지 않음
  }

  // 자동계산 상태 설정
  setAutoCalculating(isCalculating: boolean) {
    this.isAutoCalculating = isCalculating;
    if (isCalculating) {
      // 자동계산 시작 시 현재 진행 중인 가이드 숨기기
      this.hide();
    }
  }

  // 애니메이션 완료 콜백 설정
  setAnimationCompleteCallback(callback: () => void) {
    this.onAnimationComplete = callback;
  }

  async guideTwice(x: number, y: number) {
    // 자동계산 중이면 가이드 실행하지 않음
    if (this.isAutoCalculating) {
      return;
    }

    if (this.isAnimating) return;
    this.isAnimating = true;

    // 처음에 손을 보여줌
    this.show(x, y);
    await this.sleep(this.config.clickAnimationDelay);

    for (let i = 0; i < 2; i++) {
      // 자동계산 중이면 중단
      if (this.isAutoCalculating) {
        this.isAnimating = false;
        return;
      }

      // 클릭 애니메이션만 실행 (보이기/숨기기 없이)
      await this.playClickMotion();
      if (i < 1) await this.sleep(this.config.betweenClicksDelay);
    }

    // 마지막에 숨기기
    this.hide();
    this.isAnimating = false;

    // 애니메이션 완료 후 콜백 호출
    if (this.onAnimationComplete) {
      this.onAnimationComplete();
    }
  }

  // 클릭 모션만 재생 (보이기/숨기기 없이)
  private async playClickMotion() {
    // 1. 클릭 모션 - 약간 아래로 이동
    this.handEl.classList.add("clicking"); // 클릭 시 약간 아래로
    await this.sleep(this.config.clickHoldDuration);

    // 자동계산 중이면 중단
    if (this.isAutoCalculating) {
      this.handEl.classList.remove("clicking");
      return;
    }

    // 2. 다시 원래 손으로 - 원래 위치로
    this.handEl.classList.remove("clicking");
    await this.sleep(this.config.clickReleaseDelay);
  }

  // 1회 클릭 가이드 (초기 진입용)
  async guideOnce(x: number, y: number) {
    // 자동계산 중이면 가이드 실행하지 않음
    if (this.isAutoCalculating) {
      return;
    }

    if (this.isAnimating) return;
    this.isAnimating = true;

    // 처음에 손을 보여줌
    this.show(x, y);
    await this.sleep(this.config.clickAnimationDelay);

    // 자동계산 중이면 중단
    if (this.isAutoCalculating) {
      this.isAnimating = false;
      return;
    }

    // 1회 클릭 애니메이션
    await this.playClickMotion();

    // 자동계산 중이면 중단 (클릭 애니메이션 후)
    if (this.isAutoCalculating) {
      this.isAnimating = false;
      return;
    }

    // 마지막에 숨기기
    this.hide();
    this.isAnimating = false;

    // 애니메이션 완료 후 콜백 호출
    if (this.onAnimationComplete) {
      this.onAnimationComplete();
    }
  }

  // 클릭 애니메이션 재생 (완전한 버전 - 보이기부터 숨기기까지)
  private async playClickAnimation(x: number, y: number) {
    // 1. 손 표시 (hand.png)
    this.show(x, y);
    await this.sleep(this.config.clickAnimationDelay);

    // 2. 클릭 모션 실행
    await this.playClickMotion();

    // 3. 숨기기
    this.hide();
  }

  /**
   * 5초마다 입력이 없으면 자동으로 guideTwice(x, y) 실행
   * @param x x좌표
   * @param y y좌표
   */
  startAutoGuide(x: number, y: number) {
    this.autoGuideX = x;
    this.autoGuideY = y;
    this.lastInputTime = Date.now();
    if (this.autoGuideTimer) {
      clearInterval(this.autoGuideTimer);
    }
    this.autoGuideTimer = window.setInterval(async () => {
      // 자동계산 중이면 자동 가이드 실행하지 않음
      if (this.isAutoCalculating) {
        return;
      }

      const now = Date.now();
      if (now - this.lastInputTime >= 5000) {
        await this.guideTwice(this.autoGuideX, this.autoGuideY);
        this.lastInputTime = Date.now(); // 안내 후 타이머 리셋
      }
    }, 1000);
    // 입력 감지 이벤트 등록 (클릭, 터치 등)
    window.addEventListener("pointerdown", this.resetAutoGuideTimer, true);
  }

  stopAutoGuide() {
    if (this.autoGuideTimer) {
      clearInterval(this.autoGuideTimer);
      this.autoGuideTimer = null;
    }
    window.removeEventListener("pointerdown", this.resetAutoGuideTimer, true);
    // 자동 가이드 정지 시 현재 진행 중인 애니메이션도 강제 정지
    this.forceStop();
  }

  private resetAutoGuideTimer = () => {
    this.lastInputTime = Date.now();
  };

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default HandGuide;

