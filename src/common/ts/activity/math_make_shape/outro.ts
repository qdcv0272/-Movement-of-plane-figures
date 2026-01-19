// #region Imports
import Step from "@ts/step";
import SoundManager from "@module/audio/sound_manager";
import { log, sendMessage } from "@module/utilities/util";
import MakeShape from "./make_shape";
import MakeShapeStep from "./math_make_shape_step";
// #endregion

// #region Types
type Props = StepProps & {
  //
};
// #endregion

export default class Outro extends Step implements MakeShapeStep {
  // #region 생성자
  constructor(props: Props) {
    super(props);
  }
  // #endregion

  // #region Life Cycle
  public override init(): void {
    super.init();
  }

  public override start(): void {
    super.start();

    this.show();
  }

  public override clear(): void {
    super.clear();
  }
  // #endregion

  // #region 표시
  public hide(): void {
    this.root.classList.add("hide");
  }

  public show(): void {
    this.root.classList.remove("hide");
  }
  // #endregion
}
