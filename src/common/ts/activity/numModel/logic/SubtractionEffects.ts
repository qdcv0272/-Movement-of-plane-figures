import { type Place, shouldHideZeroForPlace as shouldHideZeroForPlaceUtil } from "./PlaceUtils";

export function changeToRedImage(imgElement: HTMLImageElement, place: Place): void {
  const currentSrc = imgElement.src;
  if (currentSrc.includes("one.png")) {
    imgElement.src = currentSrc.replace("one.png", "one_r.png");
  } else if (currentSrc.includes("ten.png")) {
    imgElement.src = currentSrc.replace("ten.png", "ten_r.png");
  } else if (currentSrc.includes("hun.png")) {
    imgElement.src = currentSrc.replace("hun.png", "hun_r.png");
  } else if (currentSrc.includes("thousand.png")) {
    imgElement.src = currentSrc.replace("thousand.png", "thousand_r.png");
  }
}

export function changeToOriginalImage(imgElement: HTMLImageElement, place: Place): void {
  const currentSrc = imgElement.src;
  if (currentSrc.includes("one_r.png")) {
    imgElement.src = currentSrc.replace("one_r.png", "one.png");
  } else if (currentSrc.includes("ten_r.png")) {
    imgElement.src = currentSrc.replace("ten_r.png", "ten.png");
  } else if (currentSrc.includes("hun_r.png")) {
    imgElement.src = currentSrc.replace("hun_r.png", "hun.png");
  } else if (currentSrc.includes("thousand_r.png")) {
    imgElement.src = currentSrc.replace("thousand_r.png", "thousand.png");
  }
}

export function runSubtractionHighlightAndFade(numBox: Element, place: Place, rightNumber: number, isAutoCalculating: boolean): Promise<void> {
  // 수집
  const allGroups = numBox.querySelectorAll(".num-model-group");
  const images: HTMLImageElement[] = [];
  allGroups.forEach((group) => {
    group.querySelectorAll("img").forEach((img) => {
      if (img instanceof HTMLImageElement) images.push(img);
    });
  });

  // 선택 규칙
  const redImages: HTMLImageElement[] = [];
  const totalImages = images.length;
  // tens: 오른쪽 끝부터, ones(결과화면 상단부터 보이게 반전)도 끝에서부터 선택
  // hundreds: 백의자리도 뒤쪽(마지막)부터 선택하도록 변경
  const selectFromEnd = place === "tens" || place === "ones" || place === "hundreds";
  for (let i = 0; i < rightNumber; i++) {
    const index = selectFromEnd ? totalImages - 1 - i : i;
    const img = images[index];
    if (img) {
      changeToRedImage(img, place);
      redImages.push(img);
    }
  }

  // 페이드 아웃
  // 자동계산 중에는 tens 단계의 체감 시간을 더 짧게 조정
  let fadeOutDelay = isAutoCalculating ? 600 : 1000;
  let fadeOutDuration = isAutoCalculating ? 0.8 : 1.2;
  if (isAutoCalculating && place === "tens") {
    fadeOutDelay = 350;
    fadeOutDuration = 0.6;
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      redImages.forEach((img) => {
        img.style.transition = `opacity ${fadeOutDuration}s ease-out`;
        img.style.opacity = "0";
      });
      setTimeout(resolve, fadeOutDuration * 1000);
    }, fadeOutDelay);
  });
}

export function hideZeroIfLeading(numBox: Element, place: Place, result: number): void {
  const zeroNode = numBox.querySelector(".num-model-count") as HTMLElement | null;
  if (!zeroNode) return;
  if (zeroNode.textContent?.trim() !== "0") return;
  if (shouldHideZeroForPlaceUtil(result, place)) zeroNode.remove();
}

