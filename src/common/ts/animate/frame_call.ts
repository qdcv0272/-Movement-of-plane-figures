import { sendMessage } from "@module/utilities/util";
// import { MovieClip } from "createjs-ts";

export type FrameCallKey = string | number;
export type FrameCallValue = () => void;
export type FrameCallType = [FrameCallKey, FrameCallValue];

export default class FrameCall {
  private bindTick: () => void;

  constructor(private mc: MovieClip, private s: string | number, private e: string | number, private queue: Map<FrameCallKey, () => void> | null) {
    if (!this.queue) {
      this.queue = new Map();
    }
    this.bindTick = this.hnTick.bind(this);
  }

  public start(): void {
    this.resume();
  }

  private end() {
    sendMessage(window, {
      message: "FRAME_CALL_END",
      mc: this.mc,
    });
    this.dispose();
  }

  public dispose() {
    if (!this.mc) return;
    this.pause();
    // this.mc = null;
    // this.s = null;
    // this.e = null;
    this.queue = null;
  }

  public resume() {
    if (!this.mc) return;
    this.mc.addEventListener("tick", this.bindTick);
    this.mc.visible = true;
    this.mc.gotoAndPlay(this.s);
  }

  public pause() {
    if (!this.mc) return;
    this.mc.removeEventListener("tick", this.bindTick);
    this.mc.stop();
  }

  private hnTick() {
    if (!this.queue) return;
    let currentKey: string | number | undefined;
    let currentCallback: FrameCallValue | undefined;
    for (const [key, callback] of this.queue) {
      if (typeof key === "string") {
        if (key === "end" && this.mc.currentFrame === this.mc.totalFrames - 1) {
          currentKey = key;
          currentCallback = callback;
          break;
        }
        if (this.mc.currentLabel === key) {
          currentKey = key;
          currentCallback = callback;
          break;
        }
      }
      if (this.mc.currentFrame === key) {
        currentKey = key;
        currentCallback = callback;
        break;
      }
    }

    if (typeof this.e === "string") {
      if (this.mc.currentLabel === this.e) {
        this.end();
      }
    } else {
      if (this.mc.currentFrame === this.e) {
        this.end();
      }
    }

    if (currentKey && currentCallback) {
      this.executeQueue(currentKey, currentCallback);
    }
  }

  private executeQueue(key: FrameCallKey, callback: FrameCallValue) {
    callback();
    if (this.queue) {
      this.queue.delete(key);
    }
  }
}
