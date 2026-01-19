import AnimateCC from "@ts/animate/animate_cc";
import SoundManager from "@ts/module/audio/sound_manager";
import { sendMessage } from "@module/utilities/util";
import Step from "@ts/step";

import Sample from "./sample";

type Props = StepProps & {
  // 필요한 파라미터 타입 추가
};

export default class Game extends Step {
  private btnOk: IButton;
  private bindClick: EventListener;

  constructor(props: Props) {
    super(props);
  }

  public override init(cc?: AnimateCC): void {
    super.init(cc);

    this.bindClick = this.hnClick.bind(this);

    this.btnOk = this.root.querySelector(".btn-ok") as IButton;
    this.btnOk.btnType = "btn-ok";
    this.btnOk.addEventListener("click", this.bindClick);
  }

  public override clear() {
    super.clear();
    this.hideRoot();

    SoundManager.stop("bgm_game");
  }

  public override start() {
    super.start();

    this.cc.play(this.mc, 0, "end", [["end", () => {}]]);

    this.showRoot();

    SoundManager.play("bgm_game");

    // 임시 오디오 재생
    SoundManager.play("sample_audio_01");
  }

  private showRoot() {
    this.root.classList.remove("d-none");
  }

  private hideRoot() {
    this.root.classList.add("d-none");
  }

  private hnClick(event: Event): void {
    const e = event as PointerEvent;
    const target = e.target as HTMLElement;
    const btn = e.target as IButton;
    const btnType = btn.btnType;

    switch (btnType) {
      case "btn-ok":
        sendMessage(window, {
          message: Sample.GO_OUTRO,
          self: this,
        });
        SoundManager.play("button");
        break;
    }
  }
}
