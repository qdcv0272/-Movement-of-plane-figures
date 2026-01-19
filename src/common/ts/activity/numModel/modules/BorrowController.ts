import type { Place } from "../logic/PlaceUtils";

export interface BorrowControllerDeps {
  state: {
    startBorrowProcess: (from: Place) => void;
    endBorrowProcess: () => void;
    isInBorrowProcess: boolean;
    isWaitingForBorrow: boolean;
  };
  uiManager: {
    setClickedState: (place: Place, side: "left" | "right", clicked: boolean) => void;
  };
  borrowUI: {
    showBorrowUI: (borrowFromPlace: Place) => void;
  };
  renderer: {
    rebuildBorrowFromBox: (borrowNumBox: HTMLElement, borrowFromPlace: Place, remainingCount: number) => void;
  };
  helpers: {
    numBoxFor: (place: Place | null) => HTMLElement | null;
    ensureGroup: (numBox: HTMLElement, side: "left" | "right", place: Place) => HTMLElement;
    splitGroupsAndDistribute: (
      numBox: Element,
      existingImages: NodeListOf<Element>,
      place: Place,
      imageName: string,
      startIndex: number,
      newCount: number,
      altLabel: string
    ) => void;
    appendImagesToGroup: (group: HTMLElement, imageName: string, count: number, startIndex: number, altLabel: string) => void;
  };
  logic: {
    applyBorrow: (borrowed: Record<Place, number>, from: Place) => { updatedBorrowedCounts: Partial<Record<Place, number>>; to: Place | null };
    findBorrowablePlace: (leftNumber: number, currentPlace: Place, borrowed: Record<Place, number>) => Place | null;
    needsBorrow?: (leftNumber: number, rightNumber: number, place: Place, borrowed: Record<Place, number>) => boolean;
  };
  accessors: {
    getLeftNumber: () => number;
    getRightNumber: () => number;
    getBorrowedCountsRecord: () => Record<Place, number>;
    setBorrowCount: (place: Place, value: number) => void;
    isBorrowedPlace: (place: Place) => boolean;
  };
}

export default class BorrowController {
  constructor(private deps: BorrowControllerDeps) {}

  showBorrowUI(from: Place): void {
    if (from === "ones") return;
    // 이미 하위 자리로 빌림이 진행된 후라면, 같은 자리에서 다시 빌림 UI를 띄우지 않음
    const order: Place[] = ["ones", "tens", "hundreds"] as any;
    const idx = order.indexOf(from as any);
    if (idx > 0) {
      const lower = order[idx - 1];
      if (this.deps.accessors.isBorrowedPlace(lower)) {
        // 이미 하위 자리로 빌림이 완료된 경우, 잔존 빌림 프로세스를 즉시 종료하여
        // 클릭 흐름이 막히는 것을 방지한다.
        this.deps.state.endBorrowProcess();
        return;
      }
    }
    this.deps.state.startBorrowProcess(from);
    this.deps.borrowUI.showBorrowUI(from);
  }

  async handleBorrowClick(from: Place, clickedImage: HTMLImageElement): Promise<{ to: Place; totalImages: number; wasBorrowedPlace: boolean } | null> {
    // 이미 하위 자리로 빌림이 내려간 상태면 다시 수행하지 않음
    const order: Place[] = ["ones", "tens", "hundreds"] as any;
    const idx = order.indexOf(from as any);
    if (idx > 0) {
      const lower = order[idx - 1];
      if (this.deps.accessors.isBorrowedPlace(lower)) return null;
    }
    clickedImage.classList.remove("borrowable");
    // 내부 상태 플래그 정리(호출부가 별도로 처리하는 경우 유지)
    const { updatedBorrowedCounts, to } = this.deps.logic.applyBorrow(this.deps.accessors.getBorrowedCountsRecord(), from);
    const borrowToPlace = to;
    if (!borrowToPlace) return null;

    Object.keys(updatedBorrowedCounts).forEach((p) => {
      this.deps.accessors.setBorrowCount(p as Place, updatedBorrowedCounts[p as Place] ?? 0);
    });

    // 클릭된 이미지 제거
    clickedImage.remove();

    // 빌림받을 자리 그룹 준비
    const targetNumBox = this.deps.helpers.numBoxFor(borrowToPlace);
    if (!targetNumBox) return null;
    const targetGroup = this.deps.helpers.ensureGroup(targetNumBox, "left", borrowToPlace);

    const imageName = borrowToPlace === "ones" ? "one.png" : "ten.png";
    const imageAlt = borrowToPlace === "ones" ? "Number 1" : "Number 10";
    const existingImages = targetGroup.querySelectorAll(".num-model-img");
    const startIndex = existingImages.length;
    const totalImages = startIndex + 10;

    if (totalImages > 10) {
      this.deps.helpers.splitGroupsAndDistribute(targetNumBox, existingImages, borrowToPlace, imageName, startIndex, 10, imageAlt);
    } else {
      this.deps.helpers.appendImagesToGroup(targetGroup as HTMLElement, imageName, 10, startIndex, imageAlt);
    }

    // 빌림 완료 후 상태 갱신
    this.deps.state.endBorrowProcess();

    // 연속 빌림(두 단계): hundreds -> tens 직후, 일의자리 빌림이 여전히 필요하면
    // tens 빌림 UI를 자동 노출하여 사용자의 진행을 자연스럽게 이어준다.
    // 다른 케이스에는 영향이 없도록 from=hundreds → to=tens인 경우에만 한정 적용.
    if (from === "hundreds" && borrowToPlace === "tens" && this.deps.logic.needsBorrow) {
      const leftNumber = this.deps.accessors.getLeftNumber();
      const rightNumber = this.deps.accessors.getRightNumber ? this.deps.accessors.getRightNumber() : 0;
      const counts = this.deps.accessors.getBorrowedCountsRecord();
      const needsOnesBorrow = this.deps.logic.needsBorrow(leftNumber, rightNumber, "ones", counts);
      if (needsOnesBorrow) {
        setTimeout(() => this.deps.borrowUI.showBorrowUI("tens"), 200);
      }
    }

    // 호출부에서 카운트 텍스트 업데이트/원본 자리 업데이트 수행
    const wasBorrowedPlace = this.deps.accessors.isBorrowedPlace(from);
    return { to: borrowToPlace, totalImages, wasBorrowedPlace };
  }
}
