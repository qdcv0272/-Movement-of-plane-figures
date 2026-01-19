import Game from "../game";

export class GameBtnManager {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  public initAllButtons(): void {
    this.setBtn();
    this.setArrowBox();
    this.setCentimeterBox();
    this.setPopupLeft();
    this.setFlipBox();
    this.setSwingBox();
    this.setAddBtn();
    this.setPlayBtn();
    this.setResetBtn();
    this.setonOffBtn();
    this.setshapeHomeBtn();
    this.setWarnPopBtn();
    this.setHomeReset();
  }

  private setBtn() {
    this.setupButtonGroup(".option-pop-left .option-box .option", "option-box", this.game.optionBtnList);
    this.game.selectedActionModes = {
      push: true,
      flip: false,
      swing: false,
      playState: true,
    };
  }

  private setArrowBox() {
    this.setupButtonGroup(".option-pop-left .option-control .arrow-box .arrow", "arrow", this.game.arrowBtnList);
  }

  private setCentimeterBox() {
    this.setupButtonGroup(".option-pop-left .option-control .centimeter-box .cm", "cm", this.game.cmBtnList);
  }

  private setPopupLeft() {
    this.game.openPopBtn = this.game.rootElement.querySelector(".open-pop-btn") as IButton;
    this.game.openPopBtn.btnType = "popup";
    this.game.openPopBtn.addEventListener("click", this.game.bindClick);
  }

  private setFlipBox() {
    const directions = ["left", "right", "up", "down"];
    this.game.rootElement.querySelectorAll(".option-pop-left .option-control .flip-box .flip").forEach((flip: Element, i: number) => {
      const flipBtn = flip as IButton;
      flipBtn.btnType = "flip";
      flipBtn.idx = i;
      flipBtn.setAttribute("data-direction", directions[i] || "right");
      flipBtn.addEventListener("click", this.game.bindClick);
      this.game.flipBtnList.push(flipBtn);
    });
  }

  private setSwingBox() {
    // 시계방향(r)
    const swingRBtns = this.game.rootElement.querySelectorAll(".option-pop-left .option-control .swing-box.type-r .swing-r");
    [90, 180, 270, 360].forEach((angle, i) => {
      const btn = swingRBtns[i] as IButton;
      if (btn) {
        btn.btnType = "swing";
        btn.idx = i;
        btn.setAttribute("data-angle", angle.toString());
        btn.addEventListener("click", this.game.bindClick);
        this.game.swingBtnList.push(btn);
      }
    });
    // 반시계방향(l)
    const swingLBtns = this.game.rootElement.querySelectorAll(".option-pop-left .option-control .swing-box.type-l .swing-l");
    [90, 180, 270, 360].forEach((angle, i) => {
      const btn = swingLBtns[i] as IButton;
      if (btn) {
        btn.btnType = "swing";
        btn.idx = i;
        btn.setAttribute("data-angle", angle.toString());
        btn.addEventListener("click", this.game.bindClick);
        this.game.swingBtnList.push(btn);
      }
    });
  }

  private setAddBtn() {
    this.game.addBtn = this.game.rootElement.querySelector(".option-pop-left .add-btn") as IButton;
    this.game.addBtn.btnType = "add-btn";
    this.game.addBtn.addEventListener("click", this.game.bindClick);
  }

  private setPlayBtn() {
    this.game.playBtn = this.game.rootElement.querySelector(".option-pop-right .play") as IButton;
    this.game.playBtn.btnType = "play";
    this.game.playBtn.addEventListener("click", this.game.bindClick);
  }

  private setResetBtn() {
    this.game.resetBtn = this.game.rootElement.querySelector(".option-pop-right .reset") as IButton;
    this.game.resetBtn.btnType = "reset";
    this.game.resetBtn.addEventListener("click", this.game.bindClick);
  }

  private setonOffBtn() {
    this.game.onOffBtn = this.game.rootElement.querySelector(".option-pop-right .on-off-btn") as IButton;
    this.game.onOffBtn.btnType = "all-on-off";
    this.game.onOffBtn.addEventListener("click", this.game.bindClick);
  }

  private setshapeHomeBtn() {
    this.game.shapeHomeBtn = this.game.rootElement.querySelector(".shape-home") as IButton;
    this.game.shapeHomeBtn.btnType = "shape-home";
    this.game.shapeHomeBtn.addEventListener("click", this.game.bindClick);
  }

  private setWarnPopBtn() {
    this.game.warnPopBtn = this.game.rootElement.querySelector(".warn-pop .colse-btn") as IButton;
    this.game.warnPopBtn.btnType = "warn-pop";
    this.game.warnPopBtn.addEventListener("click", this.game.bindClick);

    this.game.warnCountPopBtn = this.game.rootElement.querySelector(".warn-pop-count .colse-btn") as IButton;
    this.game.warnCountPopBtn.btnType = "warn-count-pop";
    this.game.warnCountPopBtn.addEventListener("click", this.game.bindClick);
  }

  private setHomeReset() {
    this.game.home = document.querySelector(".home") as IButton;
    this.game.home.btnType = "home";
    this.game.home.addEventListener("click", this.game.bindClick);
  }

  private setupButtonGroup(selector: string, btnType: string, buttonList: any[]): void {
    this.game.rootElement.querySelectorAll(selector).forEach((element: Element, i: number) => {
      const btn = element as IButton;
      btn.btnType = btnType;
      btn.idx = i;
      btn.addEventListener("click", this.game.bindClick);
      buttonList.push(btn);
    });
  }
}

