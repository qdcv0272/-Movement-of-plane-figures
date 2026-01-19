import type { GraphData } from "./types";
import { ImageSelector } from "./imageSelect";

export class DataCollector {
  private imageSelector: ImageSelector;

  constructor(imageSelector: ImageSelector) {
    this.imageSelector = imageSelector;
  }

  public collectGraphData(pictureGrapgChoice: boolean, barColGraphChoice: boolean, barRowGraphChoice: boolean): GraphData {
    // 1. 그래프 제목 수집
    const titleInput = document.querySelector(".input-graph-title") as HTMLInputElement;
    const title = titleInput.value.trim();

    // 2. 서브 타이틀 수집
    const subTitleTopInput = document.querySelector(".sub-title-top") as HTMLInputElement;
    const subTitleBottomInput = document.querySelector(".sub-title-bottom") as HTMLInputElement;
    const subTitles = {
      top: subTitleTopInput.value.trim(),
      bottom: subTitleBottomInput.value.trim(),
    };

    // 3. 단위 값 수집
    const unitTopValue = document.querySelector(".unitDropbox-top-value") as HTMLSpanElement;
    const unitBottomValue = document.querySelector(".unitDropbox-bottom-value") as HTMLSpanElement;
    const unitValues = {
      top: unitTopValue?.textContent || "", // 꺾은선 그래프에서는 빈 문자열로 처리
      bottom: unitBottomValue?.textContent || "",
    };

    // 4. 데이터 아이템 수집
    const dataItems: Array<{ label: string; value: number }> = [];
    const numDataBoxItems = document.querySelectorAll(".num-data-box-item");

    numDataBoxItems.forEach((item) => {
      const labelInput = item.querySelector(".num-data-top") as HTMLInputElement;
      const valueInput = item.querySelector(".num-data-bottom") as HTMLInputElement;

      const label = labelInput.value.trim();
      const value = parseInt(valueInput.value) || 0;

      dataItems.push({
        label: label,
        value: value,
      });
    });

    // 5. 총합 값 수집
    const totalBoxValue = document.querySelector(".total-box-value") as HTMLDivElement;
    const totalValue = parseInt(totalBoxValue.textContent || "0") || 0;

    // 6. 그림그래프 데이터 수집 (pictureGrapgChoice가 true일 때만)
    let pictureGraphData: GraphData["pictureGraphData"] | undefined;

    if (pictureGrapgChoice) {
      // 선택된 이미지 인덱스 수집
      const selectedImageIndex = this.imageSelector.getSelectedImageIndex();

      // 이미지 단위 값들 수집
      const imageUnitValues: Array<{ size: string; value: string }> = [];
      const imageDropdownButtons = document.querySelectorAll(".image-dropdown-btn");

      imageDropdownButtons.forEach((button, index) => {
        const buttonElement = button as HTMLButtonElement;
        const buttonText = buttonElement.textContent || "";

        const size = index === 0 ? "small" : index === 1 ? "medium" : "large";
        imageUnitValues.push({
          size,
          value: buttonText,
        });
      });

      pictureGraphData = {
        selectedImageIndex,
        imageUnitValues,
      };
    }

    // 7. 눈금 데이터 수집 (barColGraphChoice 또는 barRowGraphChoice가 true일 때만)
    let gradationData: GraphData["gradationData"] | undefined;

    if (barColGraphChoice || barRowGraphChoice) {
      const gradationDropdownBtn = document.querySelector(".gradation-dropdown-btn") as HTMLButtonElement;
      const selectedValue = gradationDropdownBtn.textContent || "";

      gradationData = {
        selectedValue,
      };
    }

    return {
      title,
      subTitles,
      unitValues,
      dataItems,
      totalValue,
      pictureGraphData,
      gradationData,
    };
  }
}

