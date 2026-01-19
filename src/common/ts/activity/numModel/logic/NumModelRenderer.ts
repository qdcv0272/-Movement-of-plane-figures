import type { Place } from "./PlaceUtils";

type Side = "left" | "right";

export default class NumModelRenderer {
  private numBoxCache: Map<Place, HTMLElement> = new Map();
  numBoxFor(place: Place): HTMLElement | null {
    const cached = this.numBoxCache.get(place);
    if (cached && document.contains(cached)) return cached;
    const el = document.querySelector(`.num-box[data-place="${place}-result"]`) as HTMLElement | null;
    if (el) this.numBoxCache.set(place, el);
    return el;
  }

  ensureGroup(numBox: HTMLElement, side: Side, place: Place): HTMLElement {
    let group = numBox.querySelector(`.num-model-group.group-${side}`) as HTMLElement | null;
    if (!group) {
      group = document.createElement("div");
      group.className = `num-model-group group-${side}`;
      group.setAttribute("data-place", `${place}-${side}`);
      numBox.appendChild(group);
    }
    return group;
  }

  appendImagesToGroup(group: HTMLElement, imageName: string, count: number, startIndex: number, altLabel: string): void {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = `./images/${imageName}`;
      img.alt = `${altLabel} image ${startIndex + i + 1}`;
      img.className = "num-model-img";
      fragment.appendChild(img);
    }
    group.appendChild(fragment);
  }

  splitGroupsAndDistribute(
    numBox: HTMLElement,
    existingImages: NodeListOf<Element>,
    place: Place,
    imageName: string,
    startIndex: number,
    newCount: number,
    altLabel: string
  ): void {
    numBox.querySelectorAll(".num-model-group").forEach((g) => {
      if (g.classList.contains("group-left")) {
        g.remove();
      }
    });

    const groupLeft = document.createElement("div");
    groupLeft.className = "num-model-group group-left";
    groupLeft.setAttribute("data-place", `${place}-left`);

    const groupRight = document.createElement("div");
    groupRight.className = "num-model-group group-right";
    groupRight.setAttribute("data-place", `${place}-right`);

    for (let i = 0; i < Math.min(startIndex, 10); i++) {
      const existingImg = existingImages[i] as HTMLImageElement;
      groupLeft.appendChild(existingImg.cloneNode(true));
    }
    for (let i = 10; i < startIndex; i++) {
      const existingImg = existingImages[i] as HTMLImageElement;
      groupRight.appendChild(existingImg.cloneNode(true));
    }

    this.appendImagesToGroup(groupRight, imageName, newCount, startIndex, altLabel);

    numBox.appendChild(groupLeft);
    numBox.appendChild(groupRight);
  }

  toggleHasBothGroups(numBox: Element): void {
    const hasLeft = !!numBox.querySelector(".group-left");
    const hasRight = !!numBox.querySelector(".group-right");
    (numBox as HTMLElement).classList.toggle("has-both-groups", hasLeft && hasRight);
  }

  // Count text helpers
  updateNumModelCount(numBox: Element, count: number): void {
    const existing = numBox.querySelector(".num-model-count");
    if (existing) existing.remove();
    if (count === 0) return; // 0은 표시 안 하는 기존 케이스를 호출부에서 컨트롤
    const countText = document.createElement("div");
    countText.className = "num-model-count";
    countText.textContent = String(count);
    numBox.appendChild(countText);
  }

  updateNumModelCountZero(numBox: Element): void {
    const existing = numBox.querySelector(".num-model-count");
    if (existing) existing.remove();
    const countText = document.createElement("div");
    countText.className = "num-model-count";
    countText.textContent = "0";
    numBox.appendChild(countText);
  }

  updateSubtractionCount(numBox: Element, place: Place, remainingCount: number, shouldHideZero: (p: Place) => boolean): void {
    const existing = numBox.querySelector(".num-model-count");
    const willHideZero = remainingCount === 0 && shouldHideZero(place);
    if (willHideZero) {
      // 숨겨야 하는 0이면, 기존 텍스트도 지우지 말고 그대로 둔다(플리커 방지)
      return;
    }
    if (existing) existing.remove();
    if (remainingCount === 0) {
      const zero = document.createElement("div");
      zero.className = "num-model-count";
      zero.textContent = "0";
      numBox.appendChild(zero);
      return;
    }
    this.updateNumModelCount(numBox, remainingCount);
  }

  private imageNameForPlace(place: Place): string {
    if (place === "ones") return "one.png";
    if (place === "tens") return "ten.png";
    if (place === "hundreds") return "hun.png";
    return "thousand.png";
  }

  placeLeftGroupWithValue(numBox: HTMLElement, place: Place, value: number): void {
    const group = this.ensureGroup(numBox, "left", place);
    group.innerHTML = "";
    const imageName = this.imageNameForPlace(place);
    this.appendImagesToGroup(group, imageName, value, 0, "Number");
  }

  appendMerged(numBox: Element, place: Place, count: number): void {
    const merged = this.clearAndEnsureMergedGroup(numBox);
    const imageName = this.imageNameForPlace(place);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = `./images/${imageName}`;
      img.className = "num-model-img";
      fragment.appendChild(img);
    }
    merged.appendChild(fragment);
    // 백의자리만 중앙 겹치기 배치 (일/십 자리는 기존 CSS 레이아웃 유지)
    if (place === "hundreds") {
      this.stackGroupImagesCentered(merged);
    }
  }

  appendMergedOnes(numBox: Element, count: number): void {
    const merged = this.clearAndEnsureMergedGroup(numBox);
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = `./images/one.png`;
      img.className = "num-model-img";
      merged.appendChild(img);
    }
  }

  ensureSideGroupWithValue(numBox: Element, side: "left" | "right", place: Place, value: number): void {
    let group = numBox.querySelector(`.num-model-group.group-${side}`) as HTMLElement | null;
    if (group) group.remove();
    group = this.ensureGroup(numBox as HTMLElement, side as "left" | "right", place);
    const imageName = this.imageNameForPlace(place);
    this.appendImagesToGroup(group, imageName, value, 0, "Number");
  }

  placeLeftGroupForSubtraction(numBox: Element, place: Place, value: number): void {
    // 기존 left 그룹 제거
    const existingGroup = numBox.querySelector(`.num-model-group.group-left`);
    if (existingGroup) existingGroup.remove();

    const group = document.createElement("div");
    group.className = "num-model-group group-left";
    group.setAttribute("data-place", `${place}-left`);

    const imageName = this.imageNameForPlace(place);
    for (let i = 0; i < value; i++) {
      const img = document.createElement("img");
      img.src = `./images/${imageName}`;
      img.alt = `Number ${value} image ${i + 1}`;
      img.className = "num-model-img";
      group.appendChild(img);
    }
    (numBox as HTMLElement).appendChild(group);
  }

  rebuildBorrowFromBox(borrowNumBox: Element, borrowFromPlace: Place, remainingCount: number): void {
    // 기존 그룹/이미지/카운트 정리
    borrowNumBox.querySelectorAll(".num-model-group").forEach((g) => g.remove());
    borrowNumBox.querySelectorAll(".num-model-img").forEach((img) => img.remove());
    const existingCount = borrowNumBox.querySelector(".num-model-count");
    if (existingCount) existingCount.remove();

    if (remainingCount > 0) {
      const groupLeft = document.createElement("div");
      groupLeft.className = "num-model-group group-left";
      groupLeft.setAttribute("data-place", `${borrowFromPlace}-left`);
      const imageName = borrowFromPlace === "tens" ? "ten.png" : "hun.png";
      for (let i = 0; i < remainingCount; i++) {
        const img = document.createElement("img");
        img.src = `./images/${imageName}`;
        img.className = "num-model-img";
        groupLeft.appendChild(img);
      }
      borrowNumBox.appendChild(groupLeft);
      this.updateNumModelCount(borrowNumBox, remainingCount);
    } else {
      this.updateNumModelCountZero(borrowNumBox);
    }
  }

  removeEmptyGroups(numBox: Element): void {
    numBox.querySelectorAll(".num-model-group").forEach((group) => {
      if (group.querySelectorAll("img.num-model-img").length === 0) {
        group.remove();
      }
    });
  }

  clearAllGroupsAndImages(numBox: Element): void {
    numBox.querySelectorAll("img.num-model-img").forEach((img) => img.remove());
    this.removeEmptyGroups(numBox);
  }

  stackGroupImagesCentered(group: Element, xGap: number = 5, yGap: number = 8): void {
    const images = group.querySelectorAll("img");
    const totalImages = images.length;
    const centerOffset = (totalImages - 1) / 2;
    images.forEach((img, index) => {
      (img as HTMLElement).style.zIndex = String(totalImages - index);
      (img as HTMLElement).style.transform = `translate(-50%, -50%) translate(${(index - centerOffset) * xGap}px, ${(index - centerOffset) * -yGap}px)`;
    });
  }

  getGroup(numBox: Element, which: "left" | "right" | "merged"): HTMLElement | null {
    const cls = which === "merged" ? ".group-merged" : `.group-${which}`;
    return numBox.querySelector(cls) as HTMLElement | null;
  }

  countImagesIn(group: Element | null): number {
    if (!group) return 0;
    return group.querySelectorAll("img").length;
  }

  removeGroup(group: Element | null): void {
    if (group && group.parentElement) {
      group.parentElement.removeChild(group);
    }
  }

  setMergedOnly(numBox: Element, enable: boolean): void {
    (numBox as HTMLElement).classList.toggle("merged-only", enable);
  }

  removeMergedOnly(numBox: Element): void {
    (numBox as HTMLElement).classList.remove("merged-only");
  }

  resetNumBox(numBox: Element): void {
    (numBox as HTMLElement).innerHTML = "";
    (numBox as HTMLElement).classList.remove("merged-only", "has-both-groups", "active");
  }

  clearAndEnsureMergedGroup(numBox: Element): HTMLElement {
    let merged = this.getGroup(numBox, "merged");
    if (!merged) {
      merged = document.createElement("div");
      merged.className = "num-model-group group-merged";
      numBox.appendChild(merged);
    }
    merged.innerHTML = "";
    return merged;
  }

  countCarryInMerged(numBox: Element, suffix: "ten.png" | "hun.png"): number {
    const merged = this.getGroup(numBox, "merged");
    if (!merged) return 0;
    return merged.querySelectorAll(`img[src$="${suffix}"]`).length;
  }

  prepareMergedFromVisible(numBox: Element): HTMLElement {
    const merged = this.clearAndEnsureMergedGroup(numBox);
    const groups = numBox.querySelectorAll(".num-model-group");
    groups.forEach((group) => {
      // skip the merged group itself
      if (group.classList.contains("group-merged")) return;
      const images = group.querySelectorAll("img");
      images.forEach((imgEl) => {
        const img = imgEl as HTMLImageElement;
        if (img.style.opacity !== "0") {
          merged.appendChild(img);
          img.style.opacity = "1";
          img.style.transition = "none";
        }
      });
      group.remove();
    });
    return merged;
  }

  prepareMergedAndAppend(targetNumBox: Element, images: NodeListOf<Element>): void {
    (targetNumBox as HTMLElement).innerHTML = "";
    const merged = document.createElement("div");
    merged.className = "num-model-group group-merged";
    targetNumBox.appendChild(merged);
    images.forEach((img) => merged.appendChild(img));
  }

  removeAllCarryGroups(): void {
    document.querySelectorAll(".ten-carry-group, .hun-carry-group, .thou-carry-group").forEach((group) => group.remove());
  }

  createCarryGroupLeft(numBox: Element, carryKey: "ten" | "hun" | "thou", imageName: string, count: number): HTMLElement {
    const group = document.createElement("div");
    group.className = `num-model-group group-left ${carryKey}-carry-group`;
    (numBox as HTMLElement).insertBefore(group, (numBox as HTMLElement).firstChild);
    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.src = `./images/${imageName}`;
      img.className = `num-model-img ${carryKey}-carry`;
      group.appendChild(img);
    }
    return group;
  }
}

