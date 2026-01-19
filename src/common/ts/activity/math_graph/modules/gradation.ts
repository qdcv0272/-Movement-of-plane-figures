export class GradationManager {
  private gradationDropdownBtn: HTMLButtonElement;
  private gradationDropdownMenu: HTMLDivElement;
  private currentGridSize: number | string | null = null; // 기본값: 빈 값

  constructor() {
    this.gradationDropdownBtn = document.querySelector(".gradation-dropdown-btn") as HTMLButtonElement;
    this.gradationDropdownMenu = document.querySelector(".gradation-dropdown-menu") as HTMLDivElement;

    this.initialize();
  }

  private initialize(): void {
    this.setupEventListeners();
    this.setInitialSelection();
  }

  private setupEventListeners(): void {
    // 드롭다운 버튼 클릭 이벤트
    this.gradationDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // 드롭다운 아이템들에 클릭 이벤트 추가
    const dropdownItems = this.gradationDropdownMenu.querySelectorAll(".gradation-dropdown-item");
    dropdownItems.forEach((item) => {
      const dropdownItem = item as HTMLDivElement;
      dropdownItem.addEventListener("click", () => {
        this.selectDropdownItem(dropdownItem);
      });
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener("click", () => {
      this.gradationDropdownMenu.style.display = "none";
    });
  }

  private toggleDropdown(): void {
    if (this.gradationDropdownMenu.style.display === "none" || this.gradationDropdownMenu.style.display === "") {
      this.gradationDropdownMenu.style.display = "flex";
      this.gradationDropdownMenu.style.justifyContent = "center";
      this.gradationDropdownMenu.style.alignItems = "center";
      this.gradationDropdownMenu.style.gap = "3px";
    } else {
      this.gradationDropdownMenu.style.display = "none";
    }
  }

  private selectDropdownItem(selectedItem: HTMLDivElement): void {
    const selectedValue = selectedItem.textContent || "자동 계산";

    // 버튼 텍스트 업데이트
    this.gradationDropdownBtn.textContent = selectedValue;

    // 드롭다운 닫기
    this.gradationDropdownMenu.style.display = "none";

    // 모든 아이템에서 on 클래스 제거
    const allItems = this.gradationDropdownMenu.querySelectorAll(".gradation-dropdown-item");
    allItems.forEach((item) => {
      item.classList.remove("on");
    });

    // 선택된 아이템에 on 클래스 추가
    selectedItem.classList.add("on");

    // 버튼에 active 클래스 추가
    this.gradationDropdownBtn.classList.add("active");

    // 값 저장 (자동 계산은 "자동 계산" 문자열로 처리)
    if (selectedValue === "자동 계산") {
      this.currentGridSize = "자동 계산";
    } else {
      this.currentGridSize = parseInt(selectedValue) || 1;
    }
  }

  // 현재 눈금 크기 반환
  public getCurrentGridSize(): number | string | null {
    return this.currentGridSize;
  }

  // 눈금 크기 설정
  public setGridSize(size: number | string | null): void {
    this.currentGridSize = size;

    // 버튼 텍스트 업데이트
    if (size === null) {
      this.gradationDropdownBtn.textContent = "";
    } else if (size === "자동 계산") {
      this.gradationDropdownBtn.textContent = "자동 계산";
    } else {
      this.gradationDropdownBtn.textContent = size.toString();
    }
  }

  // 초기 선택 설정
  private setInitialSelection(): void {
    // 초기에는 아무것도 선택하지 않음 (빈 값)
    this.gradationDropdownBtn.textContent = "";
    this.gradationDropdownBtn.classList.remove("active");
  }

  // 초기화
  public reset(): void {
    this.currentGridSize = null; // 빈 값으로 초기화
    this.gradationDropdownBtn.textContent = ""; // 빈 값으로 초기화

    // active 클래스 제거
    this.gradationDropdownBtn.classList.remove("active");

    // 모든 아이템에서 on 클래스 제거
    const allItems = this.gradationDropdownMenu.querySelectorAll(".gradation-dropdown-item");
    allItems.forEach((item) => {
      item.classList.remove("on");
    });
  }
}

