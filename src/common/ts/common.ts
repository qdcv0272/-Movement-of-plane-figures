import SoundManager from "@module/audio/sound_manager";
import { sendMessage, setScale, log, setHover } from "@module/utilities/util";
import type Page from "@ts/page";

import "sanitize.css"; // !!주의!! npm sanitize.css 최신 css 문법 사용으로 밀크티 뷰어1에서 작동 안 함.
import "@css/reset.css";
import "@css/font.css";
import "@css/common.css";

import audio_button from "@assets/audio/global/button.mp3";

window.bound = {
  x: 0,
  y: 0,
  scale: 1,
};

window.globalVolume = 1;

window.getZoomRate = () => {
  return window.bound.scale;
};

type CommonProps = {
  resize?: boolean;
};

export default class Common {
  private props: CommonProps;
  private resize: boolean;

  private root: HTMLElement;

  private pages: Page[] = [];

  private initPage: () => Page[];

  private tioShow: NodeJS.Timeout;

  private isNoDelay = false;

  private messageHandler: EventListener;

  constructor(props?: CommonProps) {
    this.props = props ?? {};
    this.resize = this.props.resize ?? true;

    // 개발 환경에서만 배경색 변경
    /*
    if (process.env.NODE_ENV === "development") {
      document.body.style.backgroundColor = "powderblue";
    }
    */

    // long press - context 메뉴 출력시 호출되는 event handler
    window.oncontextmenu = (e) => {
      e.preventDefault(); // 기본 태그 기능 막기
      e.stopPropagation(); // 이벤트 전달 막기
      return false;
    };

    this.root = document.querySelector("#wrap") as HTMLElement;

    const imgs = document.querySelectorAll("img");
    for (const img of Array.from(imgs)) {
      img.draggable = false;
    }

    window.addEventListener("load", () => {
      console.log("load complete");
      this.pages = this.initPage();
      this.init();
    });

    this.messageHandler = this.hnMessage.bind(this);
    window.addEventListener("MESSAGE", this.messageHandler);
  }

  public setupInit(init: () => Page[]) {
    this.initPage = init;
  }

  public noDelay() {
    this.isNoDelay = true;
  }

  private init() {
    this.initButtonHover();
    this.initScale();

    // // 공통 사운드 등록
    SoundManager.add([
      { id: "button", src: audio_button, ignoreStop: true },
      // { id: "button", src: `./audio/global/button.mp3`, ignoreStop: true },
      // { id: "correct", src: `./audio/global/correct.mp3`, ignoreStop: true },
      // { id: "incorrect", src: `./audio/global/incorrect.mp3`, ignoreStop: true },
    ]);

    // 보험
    if (!this.isNoDelay) {
      this.tioShow = setTimeout(() => {
        this.showContent();
      }, 1000);
    } else {
      this.showContent();
    }
  }

  private initButtonHover() {
    const btnList = Array.from(document.querySelectorAll('*[class*="btn"]:not([class*="btns"])')) as HTMLElement[];
    const buttonList = Array.from(document.querySelectorAll("button")) as HTMLElement[];
    const btns = Array.from(new Set([...btnList, ...buttonList]));
    setHover(btns);
  }

  private showContent() {
    if (this.root) {
      this.root.classList.remove("hidden");
    }
    if (this.tioShow) {
      clearTimeout(this.tioShow);
    }

    if (this.pages.length === 1) {
      const page = this.pages[0];
      page.init();
      page.activate();
    } else {
      for (const page of this.pages) {
        page.init();
      }
    }

    sendMessage(window, {
      message: "CONTENT_READY",
    });
  }

  private hnMessage(e: Event): void {
    const event = e as CustomEvent;
    const data = event.detail;
    log("hnMessage :: ", data.message);
    switch (data.message) {
    }
  }
  private initScale() {
    if (!this.resize) return;
    this.setScale();
    window.addEventListener("resize", () => {
      this.setScale();
    });
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        this.setScale();
      }, 1000);
    });
  }

  private setScale() {
    if (!this.root) return;
    window.bound = setScale(this.root, 1280, 720);
    sendMessage(window, {
      message: "CONTENT_RESIZE",
    });
  }
}

