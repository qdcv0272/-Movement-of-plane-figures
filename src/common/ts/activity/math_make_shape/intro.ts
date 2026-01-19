// #region Imports
import { log, sendMessage } from "@module/utilities/util";
import Step from "@ts/step";
import MakeShapeStep from "./make_shape_step";
import MakeShape from "./make_shape";
// #endregion

// #region Types
type Props = StepProps & {
  //
};
// #endregion

export default class Intro extends Step implements MakeShapeStep {
  // #region 필드
  private introProps: Props;

  private items: HTMLDivElement[] = [];

  // 이벤트
  private boundHanldeItem: (index: number) => void;
  // #endregion

  // #region 생성자
  constructor(props: Props) {
    super(props);

    this.introProps = props;

    if (!this.props.root) {
      console.error("root is undefined");
      return;
    }

    this.root = document.querySelector(this.props.root) as HTMLElement;

    this.items = Array.from(this.root.querySelectorAll(".select__box .item"));

    this.boundHanldeItem = this.handleItem.bind(this);
  }
  // #endregion

  // #region Life Cycle
  public override init(): void {
    super.init();
  }

  public override start(): void {
    super.start();

    this.show();

    // 이벤트
    this.registerEvent();
  }

  public override clear(): void {
    super.clear();

    // 이벤트
    this.unregisterEvent();
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

  // #region 핸들러
  private handleItem(index: number): void {
    if (index === 0) {
      sendMessage(window, {
        message: MakeShape.GO_SHAPE_FILL,
      });
    } else if (index === 1) {
      sendMessage(window, {
        message: MakeShape.GO_TANGRAM,
      });
    }
  }
  // #endregion

  // #region 이벤트
  private registerEvent(): void {
    this.items.forEach((item, index) => {
      item.addEventListener("click", () => {
        this.boundHanldeItem(index);
      });
    });
  }

  private unregisterEvent(): void {
    this.items.forEach((item, index) => {
      item.removeEventListener("click", () => {
        this.boundHanldeItem(index);
      });
    });
  }
  // #endregion
}
