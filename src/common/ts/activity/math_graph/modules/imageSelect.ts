export class ImageSelector {
  private selectedImageIndex: number = 0; // 기본값: 첫 번째 이미지 (0번 인덱스)
  private imageInputs: NodeListOf<HTMLInputElement>;
  private selectShowImg: HTMLDivElement;
  private imageValues: Map<number, string> = new Map(); // 이미지별 값 저장
  private dropdownStates: Map<number, string> = new Map(); // 드롭다운 선택 상태 저장 (0: 첫번째, 1: 두번째, 2: 세번째)

  constructor() {
    this.imageInputs = document.querySelectorAll('input[name="img-choice"]');
    this.selectShowImg = document.querySelector(".select-show-img") as HTMLDivElement;

    this.initialize();
  }

  private initialize(): void {
    this.setupEventListeners();
    this.setupDropdownEventListeners();

    // 초기 드롭다운 상태 설정
    this.resetDropdownStates();
  }

  private setupEventListeners(): void {
    // 라디오 버튼 변경 이벤트
    this.imageInputs.forEach((input, index) => {
      input.addEventListener("change", () => {
        if (input.checked) {
          this.selectedImageIndex = index;
          this.updateImageSources();
        }
      });
    });
  }

  private setupDropdownEventListeners(): void {
    // 드롭다운 버튼들에 이벤트 리스너 추가
    const dropdownButtons = this.selectShowImg.querySelectorAll(".image-dropdown-btn");
    const dropdownMenus = this.selectShowImg.querySelectorAll(".image-dropdown-menu");

    dropdownButtons.forEach((button, index) => {
      const dropdownButton = button as HTMLButtonElement;
      const dropdownMenu = dropdownMenus[index] as HTMLDivElement;

      // 드롭다운 토글 이벤트
      dropdownButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDropdown(dropdownMenu);
      });
    });

    // 드롭다운 아이템들에 클릭 이벤트 추가
    dropdownMenus.forEach((menu, menuIndex) => {
      const dropdownMenu = menu as HTMLDivElement;
      const dropdownButton = dropdownButtons[menuIndex] as HTMLButtonElement;
      const menuItems = dropdownMenu.querySelectorAll(".image-dropdown-item");

      menuItems.forEach((item) => {
        const dropdownItem = item as HTMLDivElement;

        dropdownItem.addEventListener("click", () => {
          this.selectDropdownItem(dropdownButton, dropdownMenu, dropdownItem.textContent || "", menuIndex);
        });
      });
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener("click", () => {
      const allDropdownMenus = document.querySelectorAll(".image-dropdown-menu");
      allDropdownMenus.forEach((menu) => {
        (menu as HTMLDivElement).style.display = "none";
      });
    });
  }

  private updateImageSources(): void {
    // 기존 이미지들의 src만 업데이트 (각각 big, medium, small로 다르게)
    const images = this.selectShowImg.querySelectorAll(".show-image-item img");
    const typeArr = ["small", "medium", "big"];
    images.forEach((img, idx) => {
      (img as HTMLImageElement).src = `./images/choice_img_${typeArr[idx]}_${this.selectedImageIndex}.png`;
    });
  }

  private toggleDropdown(dropdownMenu: HTMLDivElement): void {
    // 다른 드롭다운들 닫기
    const allDropdownMenus = document.querySelectorAll(".image-dropdown-menu");
    allDropdownMenus.forEach((menu) => {
      if (menu !== dropdownMenu) {
        (menu as HTMLDivElement).style.display = "none";
      }
    });

    // 현재 드롭다운 토글
    if (dropdownMenu.style.display === "none" || dropdownMenu.style.display === "") {
      dropdownMenu.style.display = "flex";
      dropdownMenu.style.justifyContent = "center";
      dropdownMenu.style.alignItems = "center";
      dropdownMenu.style.gap = "5px";
    } else {
      dropdownMenu.style.display = "none";
    }
  }

  private selectDropdownItem(button: HTMLButtonElement, menu: HTMLDivElement, selectedValue: string, sizeIndex: number): void {
    console.log(`selectDropdownItem 호출: sizeIndex=${sizeIndex}, selectedValue=${selectedValue}`);

    if (button) {
      button.textContent = selectedValue;
      button.classList.add("active");
    }
    menu.style.display = "none";

    // 드롭다운 상태 저장
    this.dropdownStates.set(sizeIndex, selectedValue);
    console.log(`dropdownStates 업데이트:`, this.dropdownStates);

    // 값 저장 (이미지 인덱스와 사이즈 인덱스를 조합한 키 사용)
    const key = this.selectedImageIndex * 3 + sizeIndex;
    this.imageValues.set(key, selectedValue);

    // 첫 번째 드롭다운 값이 변경되면 하위 드롭다운들 초기화
    if (sizeIndex === 0) {
      console.log("첫 번째 드롭다운 선택됨 - 하위 드롭다운들 초기화");
      this.resetLowerDropdowns();
    }

    // 드롭다운 상태 변경 시 다른 드롭다운들의 disabled 상태 업데이트
    this.updateDropdownStates();
  }

  private resetLowerDropdowns(): void {
    // 두 번째, 세 번째 드롭다운을 "단위 선택"으로 초기화
    const dropdownButtons = this.selectShowImg.querySelectorAll(".image-dropdown-btn");

    // 두 번째 드롭다운 (index 1)
    if (dropdownButtons[1]) {
      (dropdownButtons[1] as HTMLButtonElement).textContent = "";
      (dropdownButtons[1] as HTMLButtonElement).classList.remove("active");
      this.dropdownStates.delete(1);
    }

    // 세 번째 드롭다운 (index 2)
    if (dropdownButtons[2]) {
      (dropdownButtons[2] as HTMLButtonElement).textContent = "";
      (dropdownButtons[2] as HTMLButtonElement).classList.remove("active");
      this.dropdownStates.delete(2);
    }
  }

  private updateDropdownStates(): void {
    // 각 드롭다운의 아이템들의 disabled 상태를 업데이트하는 로직
    const dropdownMenus = this.selectShowImg.querySelectorAll(".image-dropdown-menu");

    // 첫 번째 드롭다운 (index 0) - 항상 0, 50, 100은 disabled
    this.updateFirstDropdown(dropdownMenus[0] as HTMLDivElement);

    // 두 번째 드롭다운 (index 1) - 첫 번째 값에 따라 제약 조건 적용
    this.updateSecondDropdown(dropdownMenus[1] as HTMLDivElement);

    // 세 번째 드롭다운 (index 2) - 두 번째 값에 따라 제약 조건 적용
    this.updateThirdDropdown(dropdownMenus[2] as HTMLDivElement);
  }

  private updateFirstDropdown(menu: HTMLDivElement): void {
    const items = menu.querySelectorAll(".image-dropdown-item");

    items.forEach((item) => {
      const itemElement = item as HTMLDivElement;
      const itemValue = itemElement.textContent || "";

      // 0, 50, 100은 항상 disabled
      if (itemValue === "0" || itemValue === "50" || itemValue === "100") {
        itemElement.classList.add("disabled");
      } else {
        itemElement.classList.remove("disabled");
      }
    });
  }

  private updateSecondDropdown(menu: HTMLDivElement): void {
    const items = menu.querySelectorAll(".image-dropdown-item");
    const firstValueStr = this.dropdownStates.get(0);
    const thirdValueStr = this.dropdownStates.get(2);
    const firstValue = firstValueStr ? Number(firstValueStr) : 0;
    const thirdValue = thirdValueStr ? Number(thirdValueStr) : 0;

    items.forEach((item) => {
      const value = Number(item.textContent);
      let enabled = true;

      if (!firstValueStr) {
        enabled = value !== 1;
      } else {
        enabled = value > firstValue;
      }

      if (thirdValueStr) {
        if (thirdValue === 0) {
          // 세 번째가 0이면 두 번째는 첫 번째보다 큰 값들만 선택 가능
          enabled = value > firstValue;
        } else {
          enabled = value > firstValue && value < thirdValue;
          if (![1, 5, 10, 50, 100].some((v) => v > firstValue && v < thirdValue)) {
            enabled = value === 0;
          }
        }
      }

      // 0은 항상 선택 가능하도록
      if (value === 0) {
        enabled = true;
      }

      item.classList.toggle("disabled", !enabled);
    });
  }

  private updateThirdDropdown(menu: HTMLDivElement): void {
    const items = menu.querySelectorAll(".image-dropdown-item");
    const firstValueStr = this.dropdownStates.get(0);
    const secondValueStr = this.dropdownStates.get(1);
    const firstValue = firstValueStr ? Number(firstValueStr) : 0;
    const secondValue = secondValueStr ? Number(secondValueStr) : 0;

    items.forEach((item) => {
      const value = Number(item.textContent);
      let enabled = true;

      if (!firstValueStr) {
        enabled = value !== 1;
      } else {
        enabled = value > firstValue;
      }

      if (secondValueStr) {
        if (secondValue === 100) {
          enabled = value === 0;
        } else if (secondValue === 0) {
          // 두 번째가 0이면 세 번째는 첫 번째보다 큰 값들만 선택 가능
          enabled = value > firstValue;
        } else {
          enabled = value > secondValue;
        }
      }

      // 0은 항상 선택 가능하도록
      if (value === 0) {
        enabled = true;
      }

      item.classList.toggle("disabled", !enabled);
    });
  }

  // 선택된 이미지 인덱스 반환
  public getSelectedImageIndex(): number {
    return this.selectedImageIndex;
  }

  // 이미지 값들 반환
  public getImageValues(): Map<number, string> {
    return this.imageValues;
  }

  // 초기화
  public reset(): void {
    this.imageValues.clear();
    this.dropdownStates.clear();

    // 첫 번째 인풋(라디오 버튼) 체크로 초기화
    if (this.imageInputs.length > 0) {
      (this.imageInputs[0] as HTMLInputElement).checked = true;
      this.selectedImageIndex = 0;
      // 이미지도 첫 번째로 변경
      const images = this.selectShowImg.querySelectorAll("img");
      const typeArr = ["small", "medium", "big"];
      images.forEach((img, idx) => {
        (img as HTMLImageElement).src = `./images/choice_img_${typeArr[idx]}_0.png`;
      });
    }

    // 드롭다운 버튼 텍스트를 "단위 선택"으로 설정
    const dropdownButtons = this.selectShowImg.querySelectorAll(".image-dropdown-btn");
    dropdownButtons.forEach((button) => {
      (button as HTMLButtonElement).textContent = "";
      (button as HTMLButtonElement).classList.remove("active");
    });

    // 모든 드롭다운 아이템의 disabled 상태 초기화
    this.resetDropdownStates();
  }

  private resetDropdownStates(): void {
    // 모든 드롭다운 아이템의 disabled 상태를 초기화
    const dropdownItems = this.selectShowImg.querySelectorAll(".image-dropdown-item");
    dropdownItems.forEach((item) => {
      (item as HTMLDivElement).classList.remove("disabled");
    });

    // 초기화 후 올바른 disabled 상태로 설정
    this.updateDropdownStates();
  }
}
