import Page from "@ts/page";
import Step from "@ts/step";
import SoundManager from "@module/audio/sound_manager";
import { log, sendMessage } from "@ts/module/utilities/util";
import Intro from "./intro";
import Game from "./game";
// import Outro from "./outro";

type Props = PageProps & {
  // 필요한 파라미터 타입 추가
  sounds: {
    list: AudioOption[];
  };
  startStepIndex?: number;
};

// preloader
class ImagePreloader {
  private imageList: string[] = [
    // 게임 보드 이미지들
    "./images/game_board/board.png",
    "./images/game_board/board_cm.png",

    // 컨트롤 이미지들
    "./images/game_board/board_control/arrow.png",
    "./images/game_board/board_control/control_arrow_0001.png",
    "./images/game_board/board_control/control_arrow_0002.png",
    "./images/game_board/board_control/control_flip0001.png",
    "./images/game_board/board_control/control_flip0002.png",
    "./images/game_board/board_control/control_swing_l_01_0001.png",
    "./images/game_board/board_control/control_swing_l_01_0002.png",
    "./images/game_board/board_control/control_swing_l_02_0001.png",
    "./images/game_board/board_control/control_swing_l_02_0002.png",
    "./images/game_board/board_control/control_swing_l_03_0001.png",
    "./images/game_board/board_control/control_swing_l_03_0002.png",
    "./images/game_board/board_control/control_swing_l_04_0001.png",
    "./images/game_board/board_control/control_swing_l_04_0002.png",
    "./images/game_board/board_control/control_swing_r_01_0001.png",
    "./images/game_board/board_control/control_swing_r_01_0002.png",
    "./images/game_board/board_control/control_swing_r_02_0001.png",
    "./images/game_board/board_control/control_swing_r_02_0002.png",
    "./images/game_board/board_control/control_swing_r_03_0001.png",
    "./images/game_board/board_control/control_swing_r_03_0002.png",
    "./images/game_board/board_control/control_swing_r_04_0001.png",
    "./images/game_board/board_control/control_swing_r_04_0002.png",

    // 게임 아이콘들
    "./images/game_icon/dim_0001.png",
    "./images/game_icon/dim_0002.png",
    "./images/game_icon/dim_0003.png",
    "./images/game_icon/onoff_0001.png",
    "./images/game_icon/onoff_0002.png",
    "./images/game_icon/play.png",
    "./images/game_icon/play_dim.png",
    "./images/game_icon/reset.png",
    "./images/game_icon/reset_dim.png",
    "./images/game_icon/stop.png",
    "./images/game_icon/on-off_0001.png",
    "./images/game_icon/on-off_0002.png",
    "./images/game_icon/plus_0001.png",
    "./images/game_icon/plus_0002.png",

    // 인트로 보드 이미지들
    "./images/intro_board/board.png",
    "./images/intro_board/board_on.png",
    "./images/intro_board/check_icon.png",
    "./images/intro_board/check_icon_dim.png",

    // 한글 아이콘들
    "./images/intro_board/k_icon/k_icon_01.png",
    "./images/intro_board/k_icon/k_icon_02.png",
    "./images/intro_board/k_icon/k_icon_03.png",
    "./images/intro_board/k_icon/k_icon_04.png",
    "./images/intro_board/k_icon/k_icon_05.png",
    "./images/intro_board/k_icon/k_icon_06.png",
    "./images/intro_board/k_icon/k_icon_07.png",
    "./images/intro_board/k_icon/k_icon_08.png",
    "./images/intro_board/k_icon/k_icon_09.png",
    "./images/intro_board/k_icon/k_icon_10.png",

    // 숫자 아이콘들
    "./images/intro_board/num_icon/num_icon_01.png",
    "./images/intro_board/num_icon/num_icon_02.png",
    "./images/intro_board/num_icon/num_icon_03.png",
    "./images/intro_board/num_icon/num_icon_04.png",
    "./images/intro_board/num_icon/num_icon_05.png",
    "./images/intro_board/num_icon/num_icon_06.png",
    "./images/intro_board/num_icon/num_icon_07.png",
    "./images/intro_board/num_icon/num_icon_08.png",
    "./images/intro_board/num_icon/num_icon_09.png",
    "./images/intro_board/num_icon/num_icon_10.png",

    // 도형 아이콘들
    "./images/intro_board/shape_icon/shape_icon_01.png",
    "./images/intro_board/shape_icon/shape_icon_02.png",
    "./images/intro_board/shape_icon/shape_icon_03.png",
    "./images/intro_board/shape_icon/shape_icon_04.png",
    "./images/intro_board/shape_icon/shape_icon_05.png",
    "./images/intro_board/shape_icon/shape_icon_06.png",
    "./images/intro_board/shape_icon/shape_icon_07.png",
    "./images/intro_board/shape_icon/shape_icon_08.png",
    "./images/intro_board/shape_icon/shape_icon_09.png",
    "./images/intro_board/shape_icon/shape_icon_10.png",

    // 커스텀 플레이 이미지들
    "./images/intro_board/custom_play/board.png",
    "./images/intro_board/custom_play/check_icon.png",
    "./images/intro_board/custom_play/cm.png",
    "./images/intro_board/custom_play/line_icon.png",
    "./images/intro_board/custom_play/line_icon_active.png",
    "./images/intro_board/custom_play/paint_icon_active.png",
    "./images/intro_board/custom_play/paint_icon.png",
    "./images/intro_board/custom_play/rect_icon.png",
    "./images/intro_board/custom_play/rect_icon_active.png",

    // 인트로 타이틀 아이콘들
    "./images/intro_title_icon/icon_cus.png",
    "./images/intro_title_icon/icon_cus_on.png",
    "./images/intro_title_icon/icon_k.png",
    "./images/intro_title_icon/icon_k_on.png",
    "./images/intro_title_icon/icon_num.png",
    "./images/intro_title_icon/icon_num_on.png",
    "./images/intro_title_icon/icon_shape.png",
    "./images/intro_title_icon/icon_shape_on.png",
    "./images/intro_title_icon/home_0001.png",
    "./images/intro_title_icon/home_0002.png",
    "./images/intro_title_icon/header.png",
    "./images/intro_title_icon/arrow.png",

    // 게임 보드 원본 도형들
    "./images/game_board/shape_origin/k_icon/k_icon_01.png",
    "./images/game_board/shape_origin/k_icon/k_icon_02.png",
    "./images/game_board/shape_origin/k_icon/k_icon_03.png",
    "./images/game_board/shape_origin/k_icon/k_icon_04.png",
    "./images/game_board/shape_origin/k_icon/k_icon_05.png",
    "./images/game_board/shape_origin/k_icon/k_icon_06.png",
    "./images/game_board/shape_origin/k_icon/k_icon_07.png",
    "./images/game_board/shape_origin/k_icon/k_icon_08.png",
    "./images/game_board/shape_origin/k_icon/k_icon_09.png",
    "./images/game_board/shape_origin/k_icon/k_icon_10.png",

    "./images/game_board/shape_origin/num_icon/num_icon_01.png",
    "./images/game_board/shape_origin/num_icon/num_icon_02.png",
    "./images/game_board/shape_origin/num_icon/num_icon_03.png",
    "./images/game_board/shape_origin/num_icon/num_icon_04.png",
    "./images/game_board/shape_origin/num_icon/num_icon_05.png",
    "./images/game_board/shape_origin/num_icon/num_icon_06.png",
    "./images/game_board/shape_origin/num_icon/num_icon_07.png",
    "./images/game_board/shape_origin/num_icon/num_icon_08.png",
    "./images/game_board/shape_origin/num_icon/num_icon_09.png",
    "./images/game_board/shape_origin/num_icon/num_icon_10.png",

    "./images/game_board/shape_origin/shape_icon/shape_icon_01.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_02.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_03.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_04.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_05.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_06.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_07.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_08.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_09.png",
    "./images/game_board/shape_origin/shape_icon/shape_icon_10.png",
  ];

  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loadPromises: Promise<void>[] = [];

  constructor() {
    this.preloadImages();
  }

  private preloadImages(): void {
    this.imageList.forEach((src) => {
      const promise = this.loadImage(src);
      this.loadPromises.push(promise);
    });
  }

  private loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(src, img);
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`이미지 로드 실패: ${src}`));
      };
      img.src = src;
    });
  }

  public async waitForAllImages(): Promise<void> {
    try {
      await Promise.all(this.loadPromises);
      log("모든 이미지가 로드되었습니다.");
    } catch (error) {}
  }
}

export default class ShapeBoardMain extends Page {
  static GO_INTRO = "GO_INTRO";
  static GO_GAME = "GO_GAME";
  // static GO_OUTRO = "GO_OUTRO";

  private sampleProps: Props;
  private imagePreloader: ImagePreloader;

  private introCont: HTMLElement;
  private gameCont: HTMLElement;
  // private outroCont: HTMLElement;

  private step: Intro | Game;
  private steps: (Intro | Game)[];
  protected stepIndex: number;

  constructor(props: Props) {
    super(props);

    this.sampleProps = props;
    this.imagePreloader = new ImagePreloader();
  }

  public override init(): void {
    super.init();
    // 이미지 로드 완료 후 시작
    this.imagePreloader
      .waitForAllImages()
      .then(() => {
        this.start();
      })
      .catch(() => {
        // 이미지 로드 실패해도 시작
        this.start();
      });

    // 초기화 작업
    this.introCont = this.root.querySelector(".intro-cont") as HTMLElement;
    this.gameCont = this.root.querySelector(".game-cont") as HTMLElement;
    // this.outroCont = this.root.querySelector(".outro-cont") as HTMLElement;

    // sounds
    const list = this.sampleProps.sounds.list || [];
    list.forEach((data: any, i: number) => {
      SoundManager.add(data);
    });
  }

  public override initCC(): void {
    super.initCC();
    // 초기화 작업
  }

  protected override hnMessage(e: Event): void {
    super.hnMessage(e);
    const event = e as CustomEvent;
    const data = event.detail;
    switch (data.message) {
      case ShapeBoardMain.GO_INTRO:
        this.setStep(0);
        break;
      case ShapeBoardMain.GO_GAME:
        // 항상 새로운 Game을 생성 (beforeBgW, beforeBgH 포함)
        const newGame = new Game({
          root: ".game-cont",
          itemUrl: data.itemUrl,
          beforeBgW: data.beforeBgW,
          beforeBgH: data.beforeBgH,
        });
        this.steps[1] = newGame;
        if (this.cc) {
          newGame.init(this.cc);
        } else {
          newGame.init();
        }
        this.setStep(1);
        break;
      // case ShapeBoardMain.GO_OUTRO:
      //   this.setStep(2);
      //   break;
      case "CONTENT_RESIZE":
        // log(window.bound);
        break;
    }
  }

  public addSteps(steps: (Intro | Game)[]): void {
    this.steps = steps;
  }

  protected start() {
    this.addSteps([
      new Intro({
        root: ".intro-cont",
        // linkName: "Step_Intro",
      }),
      new Game({
        root: ".game-cont",
        // linkName: "Step_Game",
      }),
      // new Outro({
      //   root: ".outro-cont",
      //   // linkName: "Step_Outro",
      // }),
    ]);

    this.steps.forEach((step) => {
      if (this.cc) {
        step.init(this.cc);
      } else {
        step.init();
      }
    });

    if (this.sampleProps.startStepIndex) {
      this.setStep(this.sampleProps.startStepIndex);
    } else {
      this.setStep(0);
    }
  }

  protected setStep(index: number): void {
    if (index < 0 || index > this.steps.length - 1) return;

    SoundManager.stopAll();

    this.stepIndex = index;

    if (this.step) {
      this.step.clear();
    }

    this.step = this.steps[index];
    this.step.start();
  }
}

