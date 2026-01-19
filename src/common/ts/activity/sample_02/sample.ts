import Page from "@ts/page";
import Step from "@ts/step";
import SoundManager from "@module/audio/sound_manager";
// import { consoleStyle, sendMessage } from "@module/utilities/util";
// import { gsap } from "gsap";

import Intro from "./intro";
import Game from "./game";
import Outro from "./outro";
import { log } from "@common/ts/module/utilities/util";

type Props = PageProps & {
  // 필요한 파라미터 타입 추가
  sounds: {
    list: AudioOption[];
  };
  startStepIndex?: number;
};

export default class Sample extends Page {
  static GO_INTRO = "GO_INTRO";
  static GO_GAME = "GO_GAME";
  static GO_OUTRO = "GO_OUTRO";

  private sampleProps: Props;

  private introCont: HTMLElement;
  private gameCont: HTMLElement;
  private outroCont: HTMLElement;

  private step: Intro | Game | Outro;
  private steps: (Intro | Game | Outro)[];
  protected stepIndex: number;

  constructor(props: Props) {
    super(props);

    this.sampleProps = props;
  }

  public override init(): void {
    super.init();
    // 초기화 작업

    this.introCont = this.root.querySelector(".intro-cont") as HTMLElement;
    this.gameCont = this.root.querySelector(".game-cont") as HTMLElement;
    this.outroCont = this.root.querySelector(".outro-cont") as HTMLElement;

    // sounds
    const list = this.sampleProps.sounds.list || [];
    list.forEach((data: any, i: number) => {
      SoundManager.add(data);
    });

    this.start();
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
      case Sample.GO_INTRO:
        this.setStep(0);
        break;
      case Sample.GO_GAME:
        this.setStep(1);
        break;
      case Sample.GO_OUTRO:
        this.setStep(2);
        break;
      case "CONTENT_RESIZE":
        // log(window.bound);
        break;
    }
  }

  public addSteps(steps: (Intro | Game | Outro)[]): void {
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
      new Outro({
        root: ".outro-cont",
        // linkName: "Step_Outro",
      }),
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
