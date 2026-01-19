import { PLACES, Place, getDigitAtPlace } from "./PlaceUtils";

export type BorrowCounts = Partial<Record<Place, number>>;

export function getBorrowToPlace(borrowFromPlace: Place): Place | null {
  const places: Place[] = ["ones", "tens", "hundreds"];
  const borrowFromIndex = places.indexOf(borrowFromPlace);
  if (borrowFromIndex > 0) {
    return places[borrowFromIndex - 1];
  }
  return null;
}

export function getActualAvailableCount(leftNumber: number, place: Place, borrowed: BorrowCounts): number {
  const originalDigit = getDigitAtPlace(leftNumber, place);
  const borrowedCount = borrowed[place] ?? 0;
  return originalDigit + borrowedCount;
}

export function needsBorrow(leftNumber: number, rightNumber: number, place: Place, borrowed: BorrowCounts, borrowedPlaces?: Set<Place>): boolean {
  const rightDigit = getDigitAtPlace(rightNumber, place);
  let actualLeftDigit = getActualAvailableCount(leftNumber, place, borrowed);
  // 하위 자리에서 이미 빌림이 발생한 경우, 현재 자리의 실제 가능한 수는 1 감소
  if (borrowedPlaces) {
    const order: Place[] = ["ones", "tens", "hundreds"];
    const idx = order.indexOf(place);
    if (idx > 0) {
      const lower = order[idx - 1];
      if (borrowedPlaces.has(lower)) {
        actualLeftDigit = Math.max(0, actualLeftDigit - 1);
      }
    }
  }
  return actualLeftDigit < rightDigit;
}

export function findBorrowablePlace(leftNumber: number, currentPlace: Place, borrowed: BorrowCounts): Place | null {
  const places: Place[] = ["ones", "tens", "hundreds"];
  const currentIndex = places.indexOf(currentPlace);
  for (let i = currentIndex + 1; i < places.length; i++) {
    const place = places[i];
    const actualCount = getActualAvailableCount(leftNumber, place, borrowed);
    if (actualCount > 0) {
      return place;
    }
  }
  return null;
}

export function findNearestBorrowablePlace(leftNumber: number, currentPlace: Place, borrowed: BorrowCounts): Place | null {
  // 동일한 로직: 가장 가까운 상위 자리에서 가능한 곳 반환
  return findBorrowablePlace(leftNumber, currentPlace, borrowed);
}

export function applyBorrow(borrowed: BorrowCounts, from: Place): { updatedBorrowedCounts: BorrowCounts; to: Place | null } {
  const to = getBorrowToPlace(from);
  if (!to) return { updatedBorrowedCounts: { ...borrowed }, to: null };
  const next: BorrowCounts = { ...borrowed };
  next[to] = (next[to] ?? 0) + 10;
  // 빌려준 자리의 감소는 별도 상태(예: borrowedPlaces)로 처리되므로 여기서는 변경하지 않음
  return { updatedBorrowedCounts: next, to };
}

export function adjustLeftDigitForLowerBorrow(place: Place, leftDigits: { ones: number; tens: number; hundreds: number }, borrowedPlaces: Set<Place>): number {
  // 현재 자리의 왼쪽 숫자
  let adjusted = 0;
  if (place === "ones") adjusted = leftDigits.ones;
  else if (place === "tens") adjusted = leftDigits.tens;
  else adjusted = leftDigits.hundreds;

  const order: Place[] = ["ones", "tens", "hundreds"];
  const index = order.indexOf(place);
  if (index > 0) {
    const lowerPlace = order[index - 1];
    if (borrowedPlaces.has(lowerPlace)) {
      adjusted = Math.max(0, adjusted - 1);
    }
  }
  return adjusted;
}

export function hasRemainingCalculation(currentPlace: Place, leftNumber: number, rightNumber: number, borrowedPlaces: Set<Place>): boolean {
  // 최대 계산 자리 산출 (천의자리는 뺄셈에서는 사용하지 않음)
  const places: Place[] = ["ones", "tens", "hundreds"];
  const leftHundreds = Math.floor(leftNumber / 100);
  const leftTens = Math.floor((leftNumber % 100) / 10);
  const leftOnes = leftNumber % 10;
  const rightHundreds = Math.floor(rightNumber / 100);
  const rightTens = Math.floor((rightNumber % 100) / 10);
  const rightOnes = rightNumber % 10;
  let maxPlace: Place = "ones";
  if (leftTens > 0 || rightTens > 0) maxPlace = "tens";
  if (leftHundreds > 0 || rightHundreds > 0) maxPlace = "hundreds";

  const maxIndex = places.indexOf(maxPlace);
  const currentIndex = places.indexOf(currentPlace);
  for (let i = currentIndex; i <= maxIndex; i++) {
    const place = places[i];
    const rightDigit = getDigitAtPlace(rightNumber, place);
    // 남은 자리에서 실제로 뺄셈 동작이 필요한 경우(오른쪽 숫자가 0이 아닌 경우)에만 계속 진행
    // 오른쪽 숫자가 0이면 추가 클릭 없이 자동 종료 가능하므로 남은 계산이 없다고 간주
    if (rightDigit > 0) return true;
  }
  return false;
}

/**
 * 빼기에서 특정 자리의 최종 수(중간 단계 포함)를 계산
 */
export function computeSubtractionDigitForPlace(
  leftNumber: number,
  rightNumber: number,
  place: Place,
  borrowed: BorrowCounts,
  borrowedPlaces: Set<Place>
): number {
  const leftDigit = getDigitAtPlace(leftNumber, place);
  const rightDigit = getDigitAtPlace(rightNumber, place);

  // 상위 자리에서 빌려온 값(예: 백→십, 십→일)을 먼저 더한다
  let adjustedLeftDigit = leftDigit + (borrowed[place] ?? 0);

  // 하위 자리에서 빌림이 발생했다면 현재 자리의 실제 가능한 수는 1 감소한다
  if (place !== "ones") {
    const order: Place[] = ["ones", "tens", "hundreds"];
    const currentIndex = order.indexOf(place);
    if (currentIndex > 0) {
      const lowerPlace = order[currentIndex - 1];
      if (borrowedPlaces.has(lowerPlace)) {
        adjustedLeftDigit = Math.max(0, adjustedLeftDigit - 1);
      }
    }
  }

  return Math.max(0, adjustedLeftDigit - rightDigit);
}
