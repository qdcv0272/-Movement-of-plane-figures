import gsap from "gsap";
import { splitNumberByPlaces } from "../logic/PlaceUtils";

// 자리 및 방향 타입 정의
const PLACES = ["ones", "tens", "hundreds", "thousands"] as const;
type Place = (typeof PLACES)[number];
type Side = "left" | "right";

export interface AnimationManagerConfig {
  onAnimationComplete?: () => void;
  onStepComplete?: (step: number) => void;
}

export default class AnimationManager {
  private config: AnimationManagerConfig;
  private currentAnimation: gsap.core.Timeline | null = null;
  private timeouts: Array<number | ReturnType<typeof setTimeout>> = [];

  constructor(config: AnimationManagerConfig = {}) {
    this.config = config;
  }

  /**
   * 수모형 애니메이션 실행
   */
  public animateNumberModels(leftNumber: number, rightNumber: number, operator: string, onComplete?: () => void): void {
    // 기존 애니메이션 중지
    if (this.currentAnimation) {
      this.currentAnimation.kill();
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        this.currentAnimation = null;
        if (onComplete) onComplete();
        if (this.config.onAnimationComplete) this.config.onAnimationComplete();
      },
    });

    this.currentAnimation = timeline;

    // 연산자에 따른 애니메이션 분기
    if (operator === "+") {
      this.animateAddition(leftNumber, rightNumber, timeline);
    } else if (operator === "-") {
      this.animateSubtraction(leftNumber, rightNumber, timeline);
    }
  }

  /**
   * 덧셈 애니메이션
   */
  private animateAddition(leftNumber: number, rightNumber: number, timeline: gsap.core.Timeline): void {
    // 1단계: 왼쪽 수모형 나타나기
    timeline.add(() => {
      this.showNumberModels("left", leftNumber);
    }, 0);

    // 2단계: 연산자 나타나기
    timeline.add(() => {
      this.showOperator("+");
    }, 0.5);

    // 3단계: 오른쪽 수모형 나타나기
    timeline.add(() => {
      this.showNumberModels("right", rightNumber);
    }, 1);

    // 4단계: 계산 과정 애니메이션
    timeline.add(() => {
      this.animateCalculationProcess(leftNumber, rightNumber, "+");
    }, 1.5);
  }

  /**
   * 뺄셈 애니메이션
   */
  private animateSubtraction(leftNumber: number, rightNumber: number, timeline: gsap.core.Timeline): void {
    // 1단계: 왼쪽 수모형 나타나기
    timeline.add(() => {
      this.showNumberModels("left", leftNumber);
    }, 0);

    // 2단계: 연산자 나타나기
    timeline.add(() => {
      this.showOperator("-");
    }, 0.5);

    // 3단계: 오른쪽 수모형 나타나기
    timeline.add(() => {
      this.showNumberModels("right", rightNumber);
    }, 1);

    // 4단계: 계산 과정 애니메이션
    timeline.add(() => {
      this.animateCalculationProcess(leftNumber, rightNumber, "-");
    }, 1.5);
  }

  /**
   * 수모형 표시
   */
  private showNumberModels(side: Side, number: number): void {
    const places = splitNumberByPlaces(number);

    // 백의자리
    if (places.hundreds > 0) {
      this.placeImages(`hundreds-${side}`, places.hundreds, true);
    }

    // 십의자리
    if (places.tens > 0) {
      this.placeImages(`tens-${side}`, places.tens, true);
    }

    // 일의자리
    if (places.ones > 0) {
      this.placeImages(`ones-${side}`, places.ones, true);
    }
  }

  /**
   * 연산자 표시
   */
  private showOperator(operator: string): void {
    const operatorElement = document.querySelector(".operator-display");
    if (operatorElement) {
      operatorElement.textContent = operator;
      gsap.fromTo(operatorElement, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" });
    }
  }

  /**
   * 계산 과정 애니메이션
   */
  private animateCalculationProcess(leftNumber: number, rightNumber: number, operator: string): void {
    const result = operator === "+" ? leftNumber + rightNumber : leftNumber - rightNumber;
    const resultPlaces = splitNumberByPlaces(result);

    // 결과 수모형 애니메이션
    if (resultPlaces.hundreds > 0) {
      this.animateResultPlace("hundreds-result", resultPlaces.hundreds, 0);
    }
    if (resultPlaces.tens > 0) {
      this.animateResultPlace("tens-result", resultPlaces.tens, 0.2);
    }
    if (resultPlaces.ones > 0) {
      this.animateResultPlace("ones-result", resultPlaces.ones, 0.4);
    }
  }

  /**
   * 결과 자리 애니메이션
   */
  private animateResultPlace(place: string, number: number, delay: number): void {
    const timeoutId = setTimeout(() => {
      this.placeImages(place, number, true);

      // 숫자 표시 애니메이션
      const digitElement = document.querySelector(`[data-place="${place}"]`);
      if (digitElement) {
        gsap.fromTo(digitElement, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.7)" });
      }
    }, delay * 1000);
    this.timeouts.push(timeoutId);
  }

  /**
   * 자리올림 애니메이션
   */
  public animateCarry(fromPlace: string, toPlace: string): void {
    // 자리올림 표시 애니메이션
    const carryElement = document.querySelector(`.carry-indicator[data-from="${fromPlace}"][data-to="${toPlace}"]`);
    if (carryElement) {
      gsap.fromTo(carryElement, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    }
  }

  /**
   * 자리내림 애니메이션
   */
  public animateBorrow(fromPlace: string, toPlace: string): void {
    // 자리내림 표시 애니메이션
    const borrowElement = document.querySelector(`.borrow-indicator[data-from="${fromPlace}"][data-to="${toPlace}"]`);
    if (borrowElement) {
      gsap.fromTo(borrowElement, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
    }
  }

  /**
   * 수모형 이동 애니메이션
   */
  public animateModelMovement(fromPlace: string, toPlace: string, onComplete?: () => void): void {
    const fromContainer = document.querySelector(`.image-container[data-place="${fromPlace}"]`);
    const toContainer = document.querySelector(`.image-container[data-place="${toPlace}"]`);

    if (!fromContainer || !toContainer) return;

    const images = fromContainer.querySelectorAll("img");
    if (images.length === 0) return;

    // 첫 번째 이미지를 이동
    const movingImage = images[0] as HTMLElement;
    const fromRect = fromContainer.getBoundingClientRect();
    const toRect = toContainer.getBoundingClientRect();

    // 이미지를 body에 추가하여 자유롭게 이동
    const clonedImage = movingImage.cloneNode(true) as HTMLElement;
    clonedImage.style.position = "fixed";
    clonedImage.style.left = `${fromRect.left}px`;
    clonedImage.style.top = `${fromRect.top}px`;
    clonedImage.style.zIndex = "9999";
    document.body.appendChild(clonedImage);

    // 이동 애니메이션
    gsap.to(clonedImage, {
      x: toRect.left - fromRect.left,
      y: toRect.top - fromRect.top,
      duration: 0.5,
      ease: "power2.inOut",
      onComplete: () => {
        document.body.removeChild(clonedImage);
        if (onComplete) onComplete();
      },
    });

    // 원본 이미지 제거
    movingImage.remove();
  }

  /**
   * 하이라이트 애니메이션
   */
  public animateHighlight(element: HTMLElement, duration: number = 0.3): void {
    gsap.fromTo(element, { backgroundColor: "rgba(255, 255, 0, 0.3)" }, { backgroundColor: "transparent", duration, ease: "power2.out" });
  }

  /**
   * 페이드 인 애니메이션
   */
  public fadeIn(element: HTMLElement, duration: number = 0.3): void {
    gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration, ease: "power2.out" });
  }

  /**
   * 페이드 아웃 애니메이션
   */
  public fadeOut(element: HTMLElement, duration: number = 0.3, onComplete?: () => void): void {
    gsap.fromTo(
      element,
      { opacity: 1 },
      {
        opacity: 0,
        duration,
        ease: "power2.in",
        onComplete: () => {
          if (onComplete) onComplete();
        },
      }
    );
  }

  /**
   * 스케일 애니메이션
   */
  public scaleAnimation(element: HTMLElement, scale: number, duration: number = 0.3): void {
    gsap.to(element, {
      scale,
      duration,
      ease: "back.out(1.7)",
    });
  }

  /**
   * 현재 애니메이션 중지
   */
  public stopCurrentAnimation(): void {
    if (this.currentAnimation) {
      this.currentAnimation.kill();
      this.currentAnimation = null;
    }
  }

  /**
   * 모든 애니메이션 중지
   */
  public stopAllAnimations(): void {
    gsap.killTweensOf("*");
    this.currentAnimation = null;
    // 등록된 타임아웃 일괄 해제
    this.timeouts.forEach((id) => clearTimeout(id as number));
    this.timeouts = [];
  }

  /**
   * 이미지 배치 (InputManager와 동일한 로직)
   */
  private placeImages(place: string, number: number, isResultScreen: boolean = false): void {
    let imageContainer: HTMLElement | null = null;

    if (isResultScreen) {
      // 결과 화면의 image-container 찾기
      const resultScreen = document.querySelector(".result-screen");
      if (resultScreen) {
        imageContainer = resultScreen.querySelector(`.image-container[data-place="${place}"]`) as HTMLElement;
      }
    } else {
      // 입력 화면의 container 클래스 안의 image-container 찾기
      const container = document.querySelector(".container");
      if (container) {
        imageContainer = container.querySelector(`.image-container[data-place="${place}"]`) as HTMLElement;
      }
      if (!imageContainer) {
        // 입력 화면 쪽에서 찾기
        const digitDisplay = document.querySelector(`[data-place="${place}"]`) as HTMLElement;
        if (digitDisplay && digitDisplay.parentElement) {
          imageContainer = digitDisplay.parentElement.querySelector(".image-container") as HTMLElement;
        }
      }
    }

    if (!imageContainer) {
      console.error(`Image container not found for place: ${place}`);
      return;
    }

    // 기존 이미지 제거
    imageContainer.innerHTML = "";

    // 숫자가 0이면 이미지 배치하지 않음
    if (number === 0) return;

    // 자릿수에 따라 이미지 경로 결정
    let imagePath = "";
    if (place.includes("hundreds")) {
      imagePath = "./images/hun.png";
    } else if (place.includes("tens")) {
      imagePath = "./images/ten.png";
    } else if (place.includes("ones")) {
      imagePath = "./images/one.png";
    }

    // 중앙정렬을 위한 images-inner 래퍼 생성 (특히 결과화면 백의자리)
    let imagesInner: HTMLElement | null = null;
    if (isResultScreen && place.includes("hundreds")) {
      imagesInner = document.createElement("div");
      imagesInner.className = "images-inner";
      imageContainer.appendChild(imagesInner);
    }

    // 이미지 append 대상 결정
    const appendTarget = imagesInner || imageContainer;

    // 입력/결과 화면 모두 image-container에 바로 img append
    let imageElements: HTMLImageElement[] = [];
    for (let i = 0; i < number; i++) {
      const img = document.createElement("img");
      img.src = imagePath;
      img.alt = `Number ${number} image ${i + 1}`;
      // 결과화면에서는 페이드인 제거
      if (isResultScreen) {
        img.style.opacity = "1";
      } else {
        img.style.opacity = "0";
      }
      appendTarget.appendChild(img);
      imageElements.push(img);

      // 이미지 로드 에러 처리
      img.onerror = () => {
        console.error(`Failed to load image: ${imagePath}`);
        img.style.display = "none";
      };
    }

    // 모든 이미지가 로드된 후 한꺼번에 애니메이션 적용
    let loadedCount = 0;
    const totalImages = imageElements.length;

    imageElements.forEach((img) => {
      img.onload = () => {
        loadedCount++;

        // 모든 이미지가 로드되면 처리
        if (loadedCount === totalImages) {
          // 백의 자리라면 입력/결과 화면 모두 동일하게 중앙정렬+겹침 효과 적용
          if (place.includes("hundreds")) {
            const xGap = 8;
            const yGap = 8;
            const imgWidth = 100;
            const imgHeight = 100;
            const centerOffset = (totalImages - 1) / 2;

            if (imagesInner) {
              // 결과화면
              imageElements.forEach((img, i) => {
                img.style.position = "absolute";
                img.style.width = "100px";
                img.style.height = "100px";
                img.style.left = `calc(50% + ${(i - centerOffset) * xGap}px - 50px)`;
                img.style.top = `calc(50% - ${(i - centerOffset) * yGap}px - 50px)`;
                img.style.transform = "none";
                img.style.zIndex = String(totalImages - i);
              });
            } else {
              // 입력화면
              imageElements.forEach((img, i) => {
                img.style.position = "absolute";
                img.style.width = "100px";
                img.style.height = "100px";
                img.style.left = `calc(50% + ${(i - centerOffset) * xGap}px - 50px)`;
                img.style.top = `calc(50% - ${(i - centerOffset) * yGap}px - 50px)`;
                img.style.transform = "none";
                img.style.zIndex = String(totalImages - i);
              });
            }
          }
          // 결과화면에서는 애니메이션 제거, 입력화면 등은 유지
          if (isResultScreen) {
            imageElements.forEach((img) => (img.style.opacity = "1"));
          } else {
            gsap.to(imageElements, {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out",
            });
          }
        }
      };
    });
  }
}
