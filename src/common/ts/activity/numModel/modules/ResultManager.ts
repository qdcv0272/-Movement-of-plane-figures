// 결과 화면 관리 ResultManager
import { splitNumberByPlaces } from "../logic/PlaceUtils";
import NumModelRenderer from "../logic/NumModelRenderer";

export interface ResultManagerConfig {
  onResultBoxClick?: (box: Element, boxIdx: number, placeIdx: number) => void;
}

export default class ResultManager {
  private config: ResultManagerConfig;
  private renderer?: NumModelRenderer;

  constructor(config: ResultManagerConfig = {}, renderer?: NumModelRenderer) {
    this.config = config;
    this.renderer = renderer;
  }

  /**
   * 결과 화면 표시 (입력/결과 화면 전환)
   */
  public showResultScreen(): void {
    const resultScreen = document.querySelector(".result-screen") as HTMLElement;
    if (resultScreen) resultScreen.style.visibility = "visible";
    const mainLayout = document.querySelector(".main-layout") as HTMLElement;
    if (mainLayout) mainLayout.style.visibility = "hidden";
    const container = document.querySelector(".container") as HTMLElement;
    if (container) container.style.visibility = "hidden";
  }

  /**
   * 결과 화면 값 세팅 (자리별 값, 연산자)
   */
  public setResultScreenValues(left: number, operator: string, right: number): void {
    // 왼쪽 값 자리수 분리
    const leftPlaces = splitNumberByPlaces(left);
    const lHundreds = leftPlaces.hundreds;
    const lTens = leftPlaces.tens;
    const lOnes = leftPlaces.ones;

    // 오른쪽 값 자리수 분리
    const rightPlaces = splitNumberByPlaces(right);
    const rHundreds = rightPlaces.hundreds;
    const rTens = rightPlaces.tens;
    const rOnes = rightPlaces.ones;

    // 왼쪽 result-box에 값 채우기 (첫 번째 result-box)
    const leftResultBox = document.querySelectorAll(".result-box")[0];
    if (leftResultBox) {
      const leftHundredsDigit = leftResultBox.querySelector('.digit-result[data-place="hundreds-result"]') as HTMLElement;
      const leftTensDigit = leftResultBox.querySelector('.digit-result[data-place="tens-result"]') as HTMLElement;
      const leftOnesDigit = leftResultBox.querySelector('.digit-result[data-place="ones-result"]') as HTMLElement;

      if (leftHundredsDigit) leftHundredsDigit.textContent = lHundreds.toString();
      if (leftTensDigit) leftTensDigit.textContent = lTens.toString();
      if (leftOnesDigit) leftOnesDigit.textContent = lOnes.toString();
    }

    // 오른쪽 result-box에 값 채우기 (두 번째 result-box)
    const rightResultBox = document.querySelectorAll(".result-box")[1];
    if (rightResultBox) {
      const rightHundredsDigit = rightResultBox.querySelector('.digit-result[data-place="hundreds-result"]') as HTMLElement;
      const rightTensDigit = rightResultBox.querySelector('.digit-result[data-place="tens-result"]') as HTMLElement;
      const rightOnesDigit = rightResultBox.querySelector('.digit-result[data-place="ones-result"]') as HTMLElement;

      if (rightHundredsDigit) rightHundredsDigit.textContent = rHundreds.toString();
      if (rightTensDigit) rightTensDigit.textContent = rTens.toString();
      if (rightOnesDigit) rightOnesDigit.textContent = rOnes.toString();
    }

    // 연산자 표시 (선택된 것만 보이기)
    document.querySelectorAll(".operator-sign .sign").forEach((sign) => {
      (sign as HTMLElement).style.display = sign.getAttribute("data-op") === operator ? "" : "none";
    });

    // 연산자 텍스트 표시 (operator-display)
    const operatorDisplay = document.querySelector(".operator-display") as HTMLElement;
    if (operatorDisplay) {
      operatorDisplay.textContent = operator;
    }
  }

  /**
   * 결과 화면 리셋
   */
  public resetResultScreen(): void {
    // 렌더러가 주입된 경우 렌더러 유틸 사용, 아니면 기존 로직 유지
    if (this.renderer) {
      document.querySelectorAll(".num-box").forEach((box) => {
        this.renderer?.resetNumBox(box as Element);
      });
      this.renderer?.removeAllCarryGroups();
    } else {
      document.querySelectorAll(".num-box").forEach((box) => {
        box.innerHTML = "";
        box.classList.remove("merged-only", "has-both-groups", "active");
        const countText = box.querySelector(".num-model-count");
        if (countText) countText.remove();
      });
      document.querySelectorAll(".ten-carry-group, .hun-carry-group, .thou-carry-group").forEach((group) => {
        group.remove();
      });
    }

    // 결과 상단의 digit-result-box 내부 이미지 컨테이너도 함께 초기화
    document.querySelectorAll(".result-image-container").forEach((container) => {
      (container as HTMLElement).innerHTML = "";
    });

    // 클릭 활성화
    this.setResultBoxClickEnabled(true);
  }

  /**
   * 결과 화면 자리 클릭 이벤트 연결
   */
  public setupResultBoxClick(onClick: (box: Element, boxIdx: number, placeIdx: number) => void): void {
    document.querySelectorAll(".result-box").forEach((resultBox, boxIdx) => {
      const nodeList = resultBox.querySelectorAll(".digit-result-box");
      nodeList.forEach((box, idx) => {
        const placeIdx = nodeList.length - 1 - idx;
        box.addEventListener("click", () => {
          onClick(box, boxIdx, placeIdx);
          // 기대 대상 마커 갱신은 빼기일 때만 NumModel 쪽에서 처리
        });
      });
    });
  }

  /**
   * 자리 클릭 활성화/비활성화
   */
  public setResultBoxClickEnabled(enabled: boolean): void {
    document.querySelectorAll(".digit-result-box").forEach((box) => {
      (box as HTMLElement).style.pointerEvents = enabled ? "auto" : "none";
    });
  }

  /**
   * 고정 버튼들 숨기기/보이기
   */
  public setFixedButtonsVisibility(visible: boolean): void {
    const fixedBtns = document.querySelector(".result-btns-fixed") as HTMLElement;
    const rightBtnsFixed = document.querySelector(".right-btns-fixed") as HTMLElement;

    if (fixedBtns) {
      fixedBtns.style.visibility = visible ? "visible" : "hidden";
    }
    if (rightBtnsFixed) {
      rightBtnsFixed.style.visibility = visible ? "visible" : "hidden";
    }
  }
}
