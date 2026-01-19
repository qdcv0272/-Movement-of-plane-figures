// #region Imports
import Page from "@ts/page";
import Step from "@ts/step";
import SoundManager from "@module/audio/sound_manager";
import { log } from "@module/utilities/util";
// import { gsap } from "gsap";
// #endregion

// #region Step Imports
import Intro from "./intro";
import ShapeFillGame from "./shape_fill_game";
import TangramGame from "./tangram_game";
import Outro from "./outro";
// #endregion

// #region Types
type Props = PageProps & {
  sounds: {
    list: AudioOption[];
  };
  startStepIndex?: number;
};

interface StepDefinition {
  class: new (props: StepProps) => MakeShapeStep;
  selector: string;
}

interface MakeShapeStep extends Step {
  hide(): void;
  show(): void;
}
// #endregion

export default class MakeShape extends Page {
  // #region 정적 메시지
  static readonly GO_INTRO = "GO_INTRO";
  static readonly GO_SHAPE_FILL = "GO_SHAPE_FILL";
  static readonly GO_TANGRAM = "GO_TANGRAM";
  static readonly GO_OUTRO = "GO_OUTRO";
  // #endregion

  // #region 단계 구성
  private readonly stepDefinitions: StepDefinition[] = [
    { class: Intro, selector: ".intro__component" },
    { class: ShapeFillGame, selector: ".shape_fill__component" },
    { class: TangramGame, selector: ".tangram__component" },
    { class: Outro, selector: ".outro__component" },
  ];

  private readonly stepMessageMap: Record<string, number> = {
    [MakeShape.GO_INTRO]: 0,
    [MakeShape.GO_SHAPE_FILL]: 1,
    [MakeShape.GO_TANGRAM]: 2,
    [MakeShape.GO_OUTRO]: 3,
  };
  // #endregion

  // #region 필드
  private makeShapeProps: Props;

  private step: MakeShapeStep;
  private steps: MakeShapeStep[];
  protected stepIndex: number = -1;
  // #endregion

  // #region 생성자
  constructor(props: Props) {
    super(props);
    this.makeShapeProps = props;
  }
  // #endregion

  // #region Life Cycle
  public override init(): void {
    super.init();
    this.createSteps();
    this.initSounds();
    this.initSteps();
    this.start();
  }
  // #endregion

  // #region 초기화 헬퍼
  private createSteps(): void {
    this.steps = this.stepDefinitions.map((def) => new def.class({ root: def.selector }));
  }

  private initSounds(): void {
    const list = this.makeShapeProps.sounds.list || [];
    list.forEach((data: AudioOption) => {
      SoundManager.add(data);
    });
  }

  private initSteps(): void {
    this.steps.forEach((step) => {
      step.init();
      // step.clear();
    });
  }
  // #endregion

  // #region CC
  public override initCC(): void {
    super.initCC();
    // CC 초기화
  }
  // #endregion

  // #region 메시지 처리
  protected override hnMessage(e: Event): void {
    super.hnMessage(e);
    const event = e as CustomEvent;
    const { message } = event.detail;

    const stepIndex = this.stepMessageMap[message];

    if (stepIndex !== undefined) {
      this.changeStep(stepIndex);
    } else if (message === "CONTENT_RESIZE") {
      // log(window.bound);
    }
  }
  // #endregion

  // #region 단계 전환 흐름
  protected start() {
    this.changeStep(this.makeShapeProps.startStepIndex ?? 0);
  }

  protected changeStep(index: number): void {
    if (index < 0 || index >= this.steps.length || this.stepIndex === index) {
      return;
    }

    SoundManager.stopAll();

    if (this.step) {
      this.step.clear();
      this.step.hide();
    }

    this.stepIndex = index;
    this.step = this.steps[this.stepIndex];
    this.step.start();

    log(`🚀 STEP : ${this.step.constructor.name}`);
  }

  protected stepKill(): void {
    if (this.step) {
      this.step.clear();
      this.step.hide();
    }
  }
  // #endregion
}
