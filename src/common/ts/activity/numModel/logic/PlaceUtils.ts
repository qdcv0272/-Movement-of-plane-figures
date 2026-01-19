export const PLACES = ["ones", "tens", "hundreds", "thousands"] as const;
export type Place = (typeof PLACES)[number];

/**
 * 주어진 정수에서 특정 자리의 숫자를 반환합니다.
 * - ones: 0~9
 * - tens: 0~9
 * - hundreds: 0~9 (입력 범위가 0~999라고 가정)
 * - thousands: 0 이상 (필요 시 사용)
 */
export function getDigitAtPlace(number: number, place: Place): number {
  switch (place) {
    case "ones":
      return Math.floor(Math.abs(number)) % 10;
    case "tens":
      return Math.floor((Math.abs(number) % 100) / 10);
    case "hundreds":
      // 4자리 이상 결과에서도 백의자리 숫자(0~9)만 반환되도록 보정
      return Math.floor((Math.abs(number) % 1000) / 100);
    case "thousands":
      return Math.floor(Math.abs(number) / 1000);
    default:
      return 0;
  }
}

/**
 * 자리 순서 인덱스 (숨김 규칙 판단용)
 * ones: 2, tens: 1, hundreds: 0, thousands: 0
 */
export function getPlaceIndex(place: Place): number {
  switch (place) {
    case "ones":
      return 2;
    case "tens":
      return 1;
    case "hundreds":
    case "thousands":
      return 0;
    default:
      return 0;
  }
}

/**
 * 가장 큰 자릿수(0이 아닌) 반환
 */
export function mostSignificantNonZeroPlace(result: number): Place {
  const safe = Math.max(0, result);
  // 천의자리도 고려하여 최상위 비영(非0) 자리를 정확히 판정
  if (getDigitAtPlace(safe, "thousands") > 0) return "thousands";
  if (getDigitAtPlace(safe, "hundreds") > 0) return "hundreds";
  if (getDigitAtPlace(safe, "tens") > 0) return "tens";
  return "ones";
}

/**
 * 결과값 기준으로 선행 0을 숨겨야 하는지 여부
 */
export function shouldHideZeroForPlace(result: number, place: Place): boolean {
  const safe = Math.max(0, result);
  const digit = getDigitAtPlace(safe, place);
  if (digit !== 0) return false;
  const msp = mostSignificantNonZeroPlace(safe);
  // 선행 0 숨김: msp보다 더 높은 자리(왼쪽)의 0은 숨김
  return getPlaceIndex(place) < getPlaceIndex(msp);
}

/**
 * 숫자를 자리별로 분리
 */
export function splitNumberByPlaces(number: number): { hundreds: number; tens: number; ones: number } {
  const hundreds = Math.floor(number / 100);
  const tens = Math.floor((number % 100) / 10);
  const ones = number % 10;
  return { hundreds, tens, ones };
}

