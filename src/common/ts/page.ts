import AnimateCC from "@ts/animate/animate_cc";
import SoundManager from "@ts/module/audio/sound_manager";

export default class Page {
  private props: PageProps;

  protected root: HTMLElement;

  protected cc: AnimateCC;

  private isActive = true;

  protected messageHandler: EventListener;

  constructor(props: PageProps) {
    const { root } = props;
    this.props = props;

    this.root = document.querySelector(root) as HTMLElement;
  }

  public init(): void {
    this.setupCC();
    this.setupEvent();
  }

  public reset(): void {}

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  protected hnMessage(e: Event): void {
    if (!this.isActive) return;
    const event = e as CustomEvent;
    const data = event.detail;
    switch (data.message) {
      case AnimateCC.READY_COMPLETE:
        this.initCC();
        break;
    }
  }

  private setupEvent(): void {
    this.messageHandler = this.hnMessage.bind(this);
    window.addEventListener("MESSAGE", this.messageHandler);
  }

  private setupCC(): void {
    if (this.props.cc) {
      this.cc = new AnimateCC(this.props.cc);
    }
  }

  protected initCC(): void {
    if (!this.cc) return;
    this.cc.start();
  }

  protected playButtonAudio(): void {
    SoundManager.play("button");
  }
}

