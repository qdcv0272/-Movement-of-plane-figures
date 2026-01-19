import AnimateCC from "@ts/animate/animate_cc";
// import SoundManager from "@module/audio/sound_manager";
// import { sendMessage } from "@module/utilities/util";

export default class Step {
  protected props: StepProps;

  protected root: HTMLElement;

  protected cc: AnimateCC;

  protected rootMc: MovieClip;

  protected lib: any;

  protected mc: MovieClip;

  protected rootEl: HTMLElement;

  constructor(props: StepProps) {
    this.props = props;
  }

  public init(cc?: AnimateCC): void {
    console.log("init StepBase");
    if (cc && this.props.linkName) {
      this.cc = cc;
      this.rootMc = this.cc.getRoot();
      this.lib = this.cc.getLib();
      this.mc = new this.lib[this.props.linkName]();
    }
    if (this.props.root) {
      this.root = document.querySelector(this.props.root) as HTMLElement;
    }
  }

  public start(): void {
    console.log("start StepBase");
    if (this.cc) {
      this.rootMc.addChild(this.mc);
    }
  }

  public clear(): void {
    if (this.cc) {
      this.rootMc.removeChild(this.mc);
    }
  }

  public initCC(): void {
    console.log("initCC StepBase");
  }
}

