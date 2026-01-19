import { splitNumberByPlaces } from "../logic/PlaceUtils";
import type { Place } from "../logic/PlaceUtils";

export interface CalculationResult {
  result: number;
  operationText: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface CalculationManagerConfig {
  onShowModal?: (message: string) => void;
  onShowResultScreen?: (left: number, operator: string, right: number) => void;
  inputManager?: {
    // 최소 인터페이스만 명시
    getSelectedOperator?: () => string | undefined;
  };
}

export default class CalculationManager {
  private config: CalculationManagerConfig;

  constructor(config: CalculationManagerConfig = {}) {
    this.config = config;
  }

  /**
   * 계산 실행
   */
  public calculate(leftNumber: number, rightNumber: number, operator: string): CalculationResult {
    // 입력값 검증
    const validation = this.validateInput(leftNumber, rightNumber, operator);
    if (!validation.isValid) {
      return validation;
    }

    let result: number;
    let operationText: string;

    switch (operator) {
      case "+":
        result = leftNumber + rightNumber;
        operationText = "덧셈";
        break;
      case "-":
        result = leftNumber - rightNumber;
        operationText = "뺄셈";
        break;
      default:
        result = leftNumber + rightNumber;
        operationText = "덧셈";
    }

    return {
      result,
      operationText,
      isValid: true,
    };
  }

  /**
   * 입력값 검증
   */
  private validateInput(leftNumber: number, rightNumber: number, operator: string): CalculationResult {
    const leftEmpty = this.isNumberEmpty(leftNumber);
    const rightEmpty = this.isNumberEmpty(rightNumber);
    const operatorSelected = !!operator;

    // 1. 아무것도 입력 안 한 경우
    if (leftEmpty && rightEmpty && !operatorSelected) {
      return {
        result: 0,
        operationText: "",
        isValid: false,
        errorMessage: "문제를 입력하세요",
      };
    }

    // 2. 한쪽이라도 숫자 입력했는데 연산자 미선택
    if ((!leftEmpty || !rightEmpty) && !operatorSelected) {
      return {
        result: 0,
        operationText: "",
        isValid: false,
        errorMessage: "연산자를 선택하세요",
      };
    }

    // 3. 연산자만 선택하고 숫자 입력 없을 때
    if (leftEmpty && rightEmpty && operatorSelected) {
      return {
        result: 0,
        operationText: "",
        isValid: false,
        errorMessage: "숫자를 입력하세요",
      };
    }

    // 4. 빼기 연산에서 빼는 수가 더 큰 경우 (실제 입력된 숫자만으로 검증)
    if (operator === "-") {
      const actualLeftNumber = this.getActualInputNumber("left");
      const actualRightNumber = this.getActualInputNumber("right");

      if (actualLeftNumber < actualRightNumber) {
        return {
          result: 0,
          operationText: "",
          isValid: false,
          errorMessage: "빼는 수가 더 작아야 합니다",
        };
      }
    }

    return {
      result: 0,
      operationText: "",
      isValid: true,
    };
  }

  /**
   * 숫자가 비어있는지 확인
   */
  private isNumberEmpty(number: number): boolean {
    return number === 0;
  }

  /**
   * 실제 입력된 숫자만 추출 (선택된 숫자만)
   */
  private getActualInputNumber(side: "left" | "right"): number {
    if (!this.config.inputManager) {
      return 0;
    }

    const hundreds = document.querySelector(`[data-place="hundreds-${side}"]`)?.textContent || "0";
    const tens = document.querySelector(`[data-place="tens-${side}"]`)?.textContent || "0";
    const ones = document.querySelector(`[data-place="ones-${side}"]`)?.textContent || "0";

    // 실제로 선택된 숫자만 추출 (selected 클래스가 있는 것만)
    const hundredsSelected = document.querySelector(`[data-place="hundreds-${side}"]`)?.classList.contains("selected");
    const tensSelected = document.querySelector(`[data-place="tens-${side}"]`)?.classList.contains("selected");
    const onesSelected = document.querySelector(`[data-place="ones-${side}"]`)?.classList.contains("selected");

    const actualHundreds = hundredsSelected ? parseInt(hundreds) : 0;
    const actualTens = tensSelected ? parseInt(tens) : 0;
    const actualOnes = onesSelected ? parseInt(ones) : 0;

    return actualHundreds * 100 + actualTens * 10 + actualOnes;
  }

  /**
   * 계산 결과 가져오기
   */
  public getCalculationResult(leftNumber: number, rightNumber: number, operator: string): number {
    switch (operator) {
      case "+":
        return leftNumber + rightNumber;
      case "-":
        return leftNumber - rightNumber;
      default:
        return leftNumber + rightNumber;
    }
  }

  /**
   * 계산이 필요한 최대 자리를 미리 계산 (결과 화면 기준)
   */
  public getMaxCalculationPlace(leftNumber: number, rightNumber: number, operator?: string): Place {
    // 각 자리별로 실제 계산이 필요한지 확인
    let maxPlace: Place = "ones";

    // 일의자리 계산 필요 여부
    const leftOnes = leftNumber % 10;
    const rightOnes = rightNumber % 10;
    if (leftOnes > 0 || rightOnes > 0) {
      maxPlace = "ones";
    }

    // 십의자리 계산 필요 여부
    const leftTens = Math.floor((leftNumber % 100) / 10);
    const rightTens = Math.floor((rightNumber % 100) / 10);
    if (leftTens > 0 || rightTens > 0) {
      maxPlace = "tens";
    }

    // 백의자리 계산 필요 여부
    const leftHundreds = Math.floor(leftNumber / 100);
    const rightHundreds = Math.floor(rightNumber / 100);
    if (leftHundreds > 0 || rightHundreds > 0) {
      maxPlace = "hundreds";
    }

    // 천의자리까지 계산이 필요한 경우
    // 1. 더하기: 백의자리에서 자리올림이 발생하는 경우
    // 2. 빼기: 천의자리가 있는 경우 (예: 1000 - 1)
    const leftThousands = Math.floor(leftNumber / 1000);
    const rightThousands = Math.floor(rightNumber / 1000);
    if (leftThousands > 0 || rightThousands > 0 || (leftHundreds > 0 && rightHundreds > 0 && leftHundreds + rightHundreds >= 10)) {
      maxPlace = "thousands";
    }

    // 연산자에 따라 다른 최대 자리 적용
    if (operator === "-") {
      // 빼기 연산에서는 천의자리까지 계산할 필요가 없음 (백의자리까지만 충분)
      if (maxPlace === "thousands") {
        maxPlace = "hundreds";
      }
    }
    // 더하기 연산에서는 기존 로직 유지 (천의자리까지 계산)

    // debug logs removed

    return maxPlace;
  }

  /**
   * 자리별 숫자 분리
   */
  public splitNumberByPlaces(number: number): { hundreds: number; tens: number; ones: number } {
    return splitNumberByPlaces(number);
  }

  /**
   * 자리올림 계산
   */
  public calculateCarry(
    leftValue: number,
    rightValue: number,
    carryIn: number = 0
  ): {
    result: number;
    carryOut: number;
  } {
    const total = leftValue + rightValue + carryIn;
    const result = total % 10;
    const carryOut = Math.floor(total / 10);

    return { result, carryOut };
  }

  /**
   * 자리내림 계산 (뺄셈용)
   */
  public calculateBorrow(
    leftValue: number,
    rightValue: number,
    borrowIn: number = 0
  ): {
    result: number;
    borrowOut: number;
  } {
    let total = leftValue - rightValue - borrowIn;
    let borrowOut = 0;

    if (total < 0) {
      total += 10;
      borrowOut = 1;
    }

    return { result: total, borrowOut };
  }
}
