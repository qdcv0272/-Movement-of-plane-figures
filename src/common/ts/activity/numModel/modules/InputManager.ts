import gsap from "gsap";

// 자리 및 방향 타입 정의
const PLACES = ["ones", "tens", "hundreds", "thousands"] as const;
type Place = (typeof PLACES)[number];
type Side = "left" | "right";

// 연산자 타입 정의
type Operator = "+" | "-";

export interface InputManagerConfig {
  onOperatorChange?: (operator: Operator | "") => void;
  onCalculate?: () => void;
  onReset?: () => void;
  onPlaceImages?: (place: string, number: number, isResultScreen: boolean) => void;
}

export default class InputManager {
  private selectedOperator: Operator | "" = "";
  private operatorToggleState: boolean = false;
  private isAutoOpening: boolean = false;
  private autoOpened: { [key: string]: boolean } = {
    "hundreds-left": false,
    "tens-left": false,
    "hundreds-right": false,
    "tens-right": false,
  };
  private config: InputManagerConfig;

  constructor(config: InputManagerConfig = {}) {
    this.config = config;
  }

  /**
   * 입력 화면 초기화
   */
  public init(): void {
    this.createPickerButtons();
    this.setupNumberPicker();
    this.setupOperatorButtons();
    this.setupActionButtons();
  }

  /**
   * 연산자 버튼 설정
   */
  private setupOperatorButtons(): void {
    document.querySelectorAll(".operator").forEach((btn) => {
      btn.addEventListener("click", () => {
        const operatorAttr = btn.getAttribute("data-op");
        const operator = operatorAttr === "+" || operatorAttr === "-" ? operatorAttr : "+";
        // 이미 선택된 연산자를 다시 클릭하면 토글
        if (this.selectedOperator === operator && this.operatorToggleState) {
          this.deselectOperator();
        } else {
          this.selectOperator(operator);
        }
      });
    });
  }

  /**
   * 연산자 선택
   */
  private selectOperator(operator: Operator): void {
    this.selectedOperator = operator;
    this.operatorToggleState = true;
    // 모든 연산자 버튼에서 active 클래스 제거
    document.querySelectorAll(".operator").forEach((btn) => {
      btn.classList.remove("active");
      // 선택된 연산자 외에는 숨김
      if (btn.getAttribute("data-op") !== operator) {
        (btn as HTMLElement).style.display = "none";
      } else {
        (btn as HTMLElement).style.display = "";
      }
    });
    // 선택된 연산자 버튼에 active 클래스 추가
    const selectedBtn = document.querySelector(`[data-op="${operator}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add("active");
    }

    if (this.config.onOperatorChange) {
      this.config.onOperatorChange(operator);
    }
  }

  /**
   * 연산자 선택 해제 (토글)
   */
  private deselectOperator(): void {
    this.selectedOperator = "";
    this.operatorToggleState = false;
    // 모든 연산자 버튼에서 active 클래스 제거 및 모두 표시
    document.querySelectorAll(".operator").forEach((btn) => {
      btn.classList.remove("active");
      (btn as HTMLElement).style.display = "";
    });

    if (this.config.onOperatorChange) {
      this.config.onOperatorChange("");
    }
  }

  /**
   * 계산하기, 다시하기 버튼 설정
   */
  private setupActionButtons(): void {
    // 계산하기 버튼
    const calculateBtn = document.querySelector(".btn-primary");
    if (calculateBtn) {
      calculateBtn.addEventListener("click", () => {
        if (this.config.onCalculate) {
          this.config.onCalculate();
        }
      });
    }

    // 다시하기 버튼
    const resetBtn = document.querySelector(".btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (this.config.onReset) {
          this.config.onReset();
        }
      });
    }
  }

  /**
   * picker 버튼들 생성
   */
  private createPickerButtons(): void {
    // 모든 picker-list에 숫자 버튼들을 생성
    document.querySelectorAll(".picker-list").forEach((pickerList) => {
      const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
      numbers.forEach((num) => {
        const button = document.createElement("div");
        button.className = "picker-btn";
        button.textContent = num;
        pickerList.appendChild(button);
      });
    });
  }

  /**
   * 숫자 선택기 설정
   */
  private setupNumberPicker(): void {
    document.querySelectorAll(".digit-box").forEach((box) => {
      box.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        // picker 버튼 또는 picker 영역을 클릭했으면 상위 박스 클릭 로직은 실행하지 않음
        if (target.closest(".picker-btn") || target.closest(".inline-picker")) return;
        // 자동 오픈 중에는 사용자 직접 클릭만 막고, 코드(click())로 호출된 경우는 허용
        if (this.isAutoOpening && event.isTrusted) return;
        const parentBox = box as HTMLElement;
        const picker = parentBox.querySelector(".inline-picker")! as HTMLElement;
        const buttons = picker.querySelectorAll(".picker-btn");
        const digitDisplay = parentBox.querySelector(".digit-display")! as HTMLElement;
        const place = digitDisplay.getAttribute("data-place");

        // 열려있던 다른 picker 닫기 및 digit-display 복원 (애니메이션 적용)
        document.querySelectorAll(".inline-picker").forEach((el) => {
          if (el !== picker) {
            const pickerEl = el as HTMLElement;
            const wasActive = pickerEl.classList.contains("active");
            const otherButtons = pickerEl.querySelectorAll(".picker-btn");
            this.closePicker(pickerEl, otherButtons);
            // 다른 picker의 digit-display 복원
            const otherDigitDisplay = pickerEl.parentElement!.querySelector(".digit-display") as HTMLElement;
            if (otherDigitDisplay) {
              setTimeout(() => {
                otherDigitDisplay.classList.remove("hide");
                otherDigitDisplay.style.opacity = "1";
                otherDigitDisplay.style.pointerEvents = "auto";

                // 방금 닫힌 picker가 실제로 열려있었고, 사용자가 값을 재선택하지 않은 경우
                // digit-display의 현재 값으로 수모형 이미지를 복원
                if (wasActive) {
                  const otherPlace = otherDigitDisplay.getAttribute("data-place");
                  if (otherPlace) {
                    const valText = otherDigitDisplay.textContent || "0";
                    const val = parseInt(valText, 10) || 0;
                    this.placeImages(otherPlace, val, false);
                  }
                }
              }, 200); // picker 닫힘 애니메이션 후 복원 처리
            }
          }
        });

        // 토글
        const isOpen = picker.classList.contains("active");
        if (!isOpen) {
          // digit-display와 이미지를 동시에 숨기기
          this.hideDigitDisplayAndImages(digitDisplay, place);

          // 숨김 애니메이션 완료 후 picker 등장
          setTimeout(() => {
            this.openPicker(picker, buttons);
          }, 200); // 애니메이션 완료 후 picker 등장
        } else {
          // 이미 열린 상태에서는 박스 클릭으로 토글하지 않음 (picker-btn만 눌리도록)
          return;
        }
      });
    });

    // 숫자 클릭 시 값 반영
    document.querySelectorAll(".picker-btn").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        // 박스 클릭 이벤트로 전파되지 않도록 차단
        event.stopPropagation();
        // 자동 오픈 중이면 클릭 막기
        if (this.isAutoOpening) return;
        const value = btn.textContent ?? "0";
        const picker = btn.closest(".inline-picker")! as HTMLElement;
        const digitDisplay = picker.parentElement!.querySelector(".digit-display")! as HTMLElement;
        const buttons = picker.querySelectorAll(".picker-btn");

        digitDisplay.textContent = value;

        // 숫자가 선택되면 selected 클래스 추가 (0도 포함)
        digitDisplay.classList.add("selected");

        // digit-display 즉시 다시 나타나기
        digitDisplay.classList.remove("hide");
        digitDisplay.style.opacity = "1";
        digitDisplay.style.pointerEvents = "auto";

        // 닫기 애니메이션과 함께
        this.closePicker(picker, buttons);

        // picker가 완전히 닫힌 후 이미지 배치 (겹침 방지)
        setTimeout(() => {
          const place = digitDisplay.getAttribute("data-place");
          if (place && this.config.onPlaceImages) {
            this.config.onPlaceImages(place, parseInt(value), false);
          }
          // 자동으로 다음 자리 picker 열기 (최초 1회만)
          let nextDisplay: HTMLElement | null = null;
          let autoOpenKey = "";
          if (place === "hundreds-left") {
            nextDisplay = document.querySelector('.digit-display[data-place="tens-left"]') as HTMLElement;
            autoOpenKey = "hundreds-left";
          } else if (place === "tens-left") {
            nextDisplay = document.querySelector('.digit-display[data-place="ones-left"]') as HTMLElement;
            autoOpenKey = "tens-left";
          } else if (place === "hundreds-right") {
            nextDisplay = document.querySelector('.digit-display[data-place="tens-right"]') as HTMLElement;
            autoOpenKey = "hundreds-right";
          } else if (place === "tens-right") {
            nextDisplay = document.querySelector('.digit-display[data-place="ones-right"]') as HTMLElement;
            autoOpenKey = "tens-right";
          }
          if (nextDisplay && autoOpenKey && !this.autoOpened[autoOpenKey]) {
            // 다음 자리에 이미 숫자가 선택되어 있는지 확인
            const nextDisplayText = nextDisplay.textContent || "0";
            const hasValue = nextDisplayText !== "0" || nextDisplay.classList.contains("selected");

            // 숫자가 선택되어 있지 않은 경우에만 자동 오픈
            if (!hasValue) {
              this.autoOpened[autoOpenKey] = true;
              this.isAutoOpening = true;
              setTimeout(() => {
                const nextBox = nextDisplay.closest(".digit-box") as HTMLElement;
                if (nextBox) {
                  nextBox.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                }
                setTimeout(() => {
                  this.isAutoOpening = false;
                }, 700); // 자동 오픈 후 0.7초 뒤에 다시 클릭 허용
              }, 350);
            }
          }
        }, 300); // picker 닫힘 애니메이션 완료 후
      });
    });
  }

  /**
   * 숫자 선택기를 열고 애니메이션 적용
   */
  private openPicker(picker: HTMLElement, buttons: NodeListOf<Element>): void {
    picker.classList.add("active");

    // 모든 버튼을 애니메이션 시작 전 초기화
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      el.style.opacity = "0";
      el.style.transform = "translateX(20px)";
    });

    // GSAP 슬라이드 인 애니메이션
    gsap.to(buttons, {
      x: 0,
      opacity: 1,
      duration: 0.4,
      ease: "power2.out",
      stagger: 0.03,
    });
  }

  /**
   * 숫자 선택기를 닫고 애니메이션 적용
   */
  private closePicker(picker: HTMLElement, buttons?: NodeListOf<Element>): void {
    if (buttons) {
      // 닫기 애니메이션 적용
      gsap.to(buttons, {
        x: 20,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        stagger: 0.02,
        onComplete: () => {
          picker.classList.remove("active");
        },
      });
    } else {
      // 즉시 닫기 (다른 picker를 열 때)
      picker.classList.remove("active");
    }
  }

  /**
   * digit-display와 이미지를 동시에 숨기기 함수
   */
  private hideDigitDisplayAndImages(digitDisplay: HTMLElement, place: string | null): void {
    // 이미지가 있다면 함께 숨기기
    if (place) {
      const imageContainer = digitDisplay.parentElement?.querySelector(".image-container") as HTMLElement;
      if (imageContainer) {
        const images = imageContainer.querySelectorAll("img");
        if (images.length > 0) {
          // digit-display와 이미지를 동시에 페이드아웃
          const elementsToHide = [digitDisplay, ...Array.from(images)];
          gsap.to(elementsToHide, {
            opacity: 0,
            duration: 0.15,
            ease: "power2.in",
            onComplete: () => {
              // 애니메이션 완료 후 이미지들 제거
              imageContainer.innerHTML = "";
              // digit-display에 hide 클래스 추가 (애니메이션 완료 후)
              digitDisplay.classList.add("hide");
            },
          });
        } else {
          // 이미지가 없으면 digit-display만 숨기기
          gsap.to(digitDisplay, {
            opacity: 0,
            duration: 0.15,
            ease: "power2.in",
            onComplete: () => {
              digitDisplay.classList.add("hide");
            },
          });
        }
      } else {
        // 이미지 컨테이너가 없으면 digit-display만 숨기기
        gsap.to(digitDisplay, {
          opacity: 0,
          duration: 0.15,
          ease: "power2.in",
          onComplete: () => {
            digitDisplay.classList.add("hide");
          },
        });
      }
    } else {
      // place가 없으면 digit-display만 숨기기
      gsap.to(digitDisplay, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          digitDisplay.classList.add("hide");
        },
      });
    }
  }

  /**
   * 이미지 숨기기 함수 (기존 함수 유지 - 다른 곳에서 사용할 수 있음)
   */
  public hideImages(place: string): void {
    const digitDisplay = document.querySelector(`[data-place="${place}"]`) as HTMLElement;
    if (!digitDisplay) {
      console.error(`Digit display not found for place: ${place}`);
      return;
    }

    const imageContainer = digitDisplay.parentElement?.querySelector(".image-container") as HTMLElement;
    if (!imageContainer) {
      console.error(`Image container not found for place: ${place}`);
      return;
    }

    // 기존 이미지들을 애니메이션과 함께 숨기기
    const images = imageContainer.querySelectorAll("img");
    if (images.length > 0) {
      gsap.to(images, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          // 애니메이션 완료 후 이미지들 제거
          imageContainer.innerHTML = "";
        },
      });
    }
  }

  /**
   * 이미지 배치 함수
   */
  public placeImages(place: string, number: number, isResultScreen: boolean = false): void {
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
      // console.error(`Image container not found for place: ${place}`);
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
      // 결과화면에서는 페이드인 효과 제거: 초기 opacity를 1로 설정
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
                img.style.top = `calc(50% - ${(i - centerOffset) * yGap}px - 50px)`; // 이 부분이 핵심!
                img.style.transform = "none";
                img.style.zIndex = String(totalImages - i);
              });
            }
          }
          // 결과화면에서는 애니메이션 없이 즉시 표시
          if (isResultScreen) {
            imageElements.forEach((img) => {
              img.style.opacity = "1";
            });
          } else {
            // 입력화면 등에서는 기존 페이드인 유지
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

  /**
   * 입력 화면 리셋
   */
  public resetInputScreen(): void {
    // 1. 입력값 초기화
    document.querySelectorAll(".digit-display").forEach((el) => {
      el.textContent = "0";
    });
    // 2. 이미지/수모형 초기화
    document.querySelectorAll(".image-container").forEach((el) => {
      el.innerHTML = "";
    });
    // 3. 연산자 초기화
    this.selectedOperator = "";
    this.operatorToggleState = false;
    document.querySelectorAll(".operator").forEach((btn) => {
      btn.classList.remove("active");
      (btn as HTMLElement).style.display = "";
    });

    // 4. 열린 picker들 즉시 닫기 (애니메이션 없이)
    document.querySelectorAll(".inline-picker.active").forEach((picker) => {
      const pickerElement = picker as HTMLElement;
      pickerElement.classList.remove("active");
      pickerElement.style.opacity = "0";
      pickerElement.style.pointerEvents = "none";

      // picker-btn들의 스타일도 초기화
      const buttons = pickerElement.querySelectorAll(".picker-btn");
      buttons.forEach((btn) => {
        const btnElement = btn as HTMLElement;
        btnElement.style.opacity = "0";
        btnElement.style.transform = "translateX(20px)";
      });
    });

    // 모든 inline-picker의 인라인 스타일 제거 (CSS 기본값으로 복원)
    document.querySelectorAll(".inline-picker").forEach((picker) => {
      const pickerElement = picker as HTMLElement;
      pickerElement.style.removeProperty("opacity");
      pickerElement.style.removeProperty("pointer-events");
    });

    // 5. digit-display들 복원 (숨겨진 상태라면)
    document.querySelectorAll(".digit-display").forEach((display) => {
      const element = display as HTMLElement;
      element.classList.remove("hide");
      element.classList.remove("selected"); // 선택 상태 제거
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
    });

    // 자동 오픈 관련 상태 초기화
    this.isAutoOpening = false;
    this.autoOpened = {
      "hundreds-left": false,
      "tens-left": false,
      "hundreds-right": false,
      "tens-right": false,
    };
  }

  /**
   * 숫자 표시에서 숫자 가져오기
   */
  public getNumberFromDisplays(side: "left" | "right"): number {
    const hundreds = document.querySelector(`[data-place="hundreds-${side}"]`)?.textContent || "0";
    const tens = document.querySelector(`[data-place="tens-${side}"]`)?.textContent || "0";
    const ones = document.querySelector(`[data-place="ones-${side}"]`)?.textContent || "0";
    return parseInt(hundreds) * 100 + parseInt(tens) * 10 + parseInt(ones);
  }

  /**
   * 해당 자리의 모든 digit-display가 비어있으면 true 반환
   */
  public isNumberEmpty(side: "left" | "right"): boolean {
    const hundreds = document.querySelector(`[data-place="hundreds-${side}"]`)?.textContent || "";
    const tens = document.querySelector(`[data-place="tens-${side}"]`)?.textContent || "";
    const ones = document.querySelector(`[data-place="ones-${side}"]`)?.textContent || "";
    return [hundreds, tens, ones].every((v) => !v || v.trim() === "" || v === "0");
  }

  /**
   * 선택된 연산자 반환
   */
  public getSelectedOperator(): Operator | "" {
    // console.log(`[InputManager] getSelectedOperator 호출됨 - 반환값: "${this.selectedOperator}"`);
    return this.selectedOperator;
  }

  /**
   * 연산자 토글 상태 반환
   */
  public getOperatorToggleState(): boolean {
    return this.operatorToggleState;
  }
}

