export class DropdownManager {
  private unitDropboxTop: HTMLButtonElement;
  private unitDropboxBottom: HTMLButtonElement;
  private dropdownTop: HTMLDivElement;
  private dropdownBottom: HTMLDivElement;
  private unitDropboxValue: HTMLDivElement[];

  constructor() {
    this.unitDropboxTop = document.querySelector(".unitDropbox-top") as HTMLButtonElement;
    this.unitDropboxBottom = document.querySelector(".unitDropbox-bottom") as HTMLButtonElement;
    this.dropdownTop = document.querySelector(".dropdown-top") as HTMLDivElement;
    this.dropdownBottom = document.querySelector(".dropdown-bottom") as HTMLDivElement;
    this.unitDropboxValue = Array.from(document.querySelectorAll(".unitDropboxValue"));

    this.initialize();
  }

  private initialize(): void {
    this.setupDropdowns();
    this.setupEventListeners();
  }

  private setupDropdowns(): void {
    // 상단 드롭다운 항목들
    const topItems = [
      "°C",
      "mm",
      "cm",
      "m",
      "km",
      "g",
      "kg",
      "t",
      "mL",
      "L",
      "명",
      "개",
      "번",
      "회",
      "원",
      "일",
      "월",
      "주",
      "마리",
      "권",
      "만 명",
      "천 명",
      "초",
      "상자",
      "판",
      "가구",
      "대",
      "시간",
      "년",
      "시",
      "요일",
      "분",
      "건",
      "세",
      "점",
    ];

    // 하단 드롭다운 항목들
    const bottomItems = [
      "°C",
      "mm",
      "cm",
      "m",
      "km",
      "g",
      "kg",
      "t",
      "mL",
      "L",
      "명",
      "개",
      "번",
      "회",
      "원",
      "일",
      "월",
      "주",
      "마리",
      "권",
      "만 명",
      "천 명",
      "초",
      "상자",
      "판",
      "가구",
      "대",
      "시간",
      "년",
      "시",
      "요일",
      "분",
      "건",
      "세",
      "점",
    ];

    this.createDropdownItems(this.dropdownTop, topItems);
    this.createDropdownItems(this.dropdownBottom, bottomItems);
  }

  private setupEventListeners(): void {
    // 드롭다운 토글 이벤트
    this.unitDropboxTop.addEventListener("click", () => {
      this.toggleDropdown(this.dropdownTop, this.dropdownBottom);
    });

    this.unitDropboxBottom.addEventListener("click", () => {
      this.toggleDropdown(this.dropdownBottom, this.dropdownTop);
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener("click", (e) => {
      if (!this.unitDropboxTop.contains(e.target as Node) && !this.dropdownTop.contains(e.target as Node)) {
        this.dropdownTop.style.display = "none";
      }
      if (!this.unitDropboxBottom.contains(e.target as Node) && !this.dropdownBottom.contains(e.target as Node)) {
        this.dropdownBottom.style.display = "none";
      }
    });
  }

  private createDropdownItems(dropdown: HTMLDivElement, items: string[]): void {
    if (!dropdown) return;

    items.forEach((item) => {
      const dropdownItem = document.createElement("div");
      dropdownItem.className = "dropdown-item";
      dropdownItem.textContent = item;
      dropdownItem.addEventListener("click", () => {
        this.selectDropdownItem(dropdown, item);
      });
      dropdown.appendChild(dropdownItem);
    });
  }

  private toggleDropdown(targetDropdown: HTMLDivElement, otherDropdown: HTMLDivElement | null): void {
    if (!targetDropdown) return;

    // 다른 드롭다운 닫기 (null이 아닐 때만)
    if (otherDropdown) {
      otherDropdown.style.display = "none";
    }

    // 현재 드롭다운 토글
    if (targetDropdown.style.display === "none" || targetDropdown.style.display === "") {
      targetDropdown.style.display = "flex";
    } else {
      targetDropdown.style.display = "none";
    }
  }

  private selectDropdownItem(dropdown: HTMLDivElement, selectedValue: string): void {
    if (!dropdown) return;

    // 드롭다운 닫기
    dropdown.style.display = "none";

    // 해당 드롭다운의 모든 아이템에서 on 클래스 제거
    const allItems = dropdown.querySelectorAll(".dropdown-item");
    allItems.forEach((item) => {
      item.classList.remove("on");
    });

    // 선택된 아이템에 on 클래스 추가
    const selectedItem = Array.from(allItems).find((item) => item.textContent === selectedValue);
    if (selectedItem) {
      selectedItem.classList.add("on");
    }

    // 해당하는 span 업데이트
    if (dropdown.classList.contains("dropdown-top")) {
      const span = document.querySelector(".unitDropbox-top-value") as HTMLSpanElement;
      if (span) {
        span.classList.add("active");
        span.textContent = selectedValue;
      }
    } else if (dropdown.classList.contains("dropdown-bottom")) {
      const span = document.querySelector(".unitDropbox-bottom-value") as HTMLSpanElement;
      if (span) {
        span.classList.add("active");
        span.textContent = selectedValue;
      }
    }
  }

  // 드롭다운 초기화
  public resetDropdowns(): void {
    this.unitDropboxValue.forEach((text) => {
      text.classList.remove("active");
      text.textContent = "";
    });

    // 동적으로 생성된 dropdown-item들의 on 클래스 제거
    const allDropdownItems = document.querySelectorAll(".dropdown-item");
    allDropdownItems.forEach((item) => {
      item.classList.remove("on");
    });
  }

  // 상단 드롭다운 숨기기
  public hideDropdowns(): void {
    this.unitDropboxTop.classList.add("remove");
    this.dropdownTop.classList.add("remove");
  }

  // 상단 드롭다운 보이기
  public showDropdowns(): void {
    this.unitDropboxTop.classList.remove("remove");
    this.dropdownTop.classList.remove("remove");
  }
}
