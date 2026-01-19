import type { Place } from "./PlaceUtils";

export interface BorrowUIConfig {
  onBorrowImageClick: (borrowFromPlace: Place, clickedImage: HTMLImageElement) => void;
}

export default class BorrowUIManager {
  private config: BorrowUIConfig;

  constructor(config: BorrowUIConfig) {
    this.config = config;
  }

  public showBorrowUI(borrowFromPlace: Place): void {
    // 일의자리는 빌림 불가
    if (borrowFromPlace === "ones") return;

    const numBox = document.querySelector(`.num-box[data-place="${borrowFromPlace}-result"]`);
    if (!numBox) return;

    // 기존 borrowable 정리 및 리스너 제거(클론 교체)
    const existingBorrowableImages = numBox.querySelectorAll(".borrowable");
    existingBorrowableImages.forEach((img: Element) => {
      img.classList.remove("borrowable");
      const clone = img.cloneNode(true) as HTMLImageElement;
      img.parentNode?.replaceChild(clone, img);
    });

    // 우선 left 그룹, 없으면 right 그룹에서 이미지 탐색 (안전 가드)
    let images: NodeListOf<Element> | null = null;
    let group: Element | null = numBox.querySelector(`.num-model-group.group-left`);
    if (group) {
      const list = group.querySelectorAll(".num-model-img");
      if (list && list.length > 0) images = list;
    }
    if (!images) {
      group = numBox.querySelector(`.num-model-group.group-right`);
      if (group) {
        const list = group.querySelectorAll(".num-model-img");
        if (list && list.length > 0) images = list;
      }
    }
    if (!images || images.length === 0) return;

    const firstImage = images[0] as HTMLImageElement | undefined;
    if (!firstImage || !firstImage.parentNode) return;
    // 동일 이미지 중복 바인드 방지: 클론에 borrowable 클래스를 부여하여 교체
    const clone = firstImage.cloneNode(true) as HTMLImageElement;
    clone.classList.add("borrowable");
    firstImage.parentNode?.replaceChild(clone, firstImage);
    const target = clone;
    // 시각적 강조를 확실히 보이게 하기 위해 짧은 깜빡임 효과 추가
    clone.classList.add("borrowable-highlight");
    // 강조 표시는 조금 더 길게 유지
    setTimeout(() => clone.classList.remove("borrowable-highlight"), 1000);
    // 클릭 리스너: 한 번만 동작하도록 설정
    target.addEventListener("click", () => this.config.onBorrowImageClick(borrowFromPlace, target), { once: true });
  }
}

