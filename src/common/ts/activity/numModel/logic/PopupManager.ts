export default class PopupManager {
  showCalculationResultPopup(calculationFormula: string): void {
    const popupHTML = `
      <div class="calculation-result-popup">
        <div class="calculation-result-backdrop"></div>
        <div class="calculation-result-content">
          <div class="calculation-result-formula">${calculationFormula}</div>
        </div>
      </div>
    `;

    const wrapEl = document.querySelector("#wrap");
    (wrapEl || document.body).insertAdjacentHTML("beforeend", popupHTML);

    const popup = document.querySelector(".calculation-result-popup") as HTMLElement;
    if (!popup) return;
    popup.style.display = "flex";
    popup.style.opacity = "0";
    setTimeout(() => {
      if (popup) popup.style.opacity = "1";
    }, 10);

    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeCalculationResultPopup();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  closeCalculationResultPopup(): void {
    const popup = document.querySelector(".calculation-result-popup") as HTMLElement;
    if (!popup) return;
    popup.style.opacity = "0";
    setTimeout(() => {
      if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    }, 300);
  }
}
