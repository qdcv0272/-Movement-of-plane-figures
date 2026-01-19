import SoundManager from "@module/audio/sound_manager";
import { isMobile, isMobileIOS, loadScript, sendMessage } from "@module/utilities/util";
import createjs from "createjs-ts";
import FrameCall, { type FrameCallKey, type FrameCallType, type FrameCallValue } from "./frame_call";

window.createjs = createjs;

export default class AnimateCC {
  static START = "ccstart";
  static READY_COMPLETE = "ccreadycomplete";

  static SCALE_UP = true;

  private readonly args: AnimateCCProps;

  private doc = document;

  private container: HTMLElement;

  private canvas: HTMLCanvasElement;

  private exportRoot!: MovieClip;

  public stage: Stage;

  public lib!: Lib;

  private frameCallMap = new Map<MovieClip, FrameCall>();

  constructor(args: AnimateCCProps) {
    this.args = args;

    const container = this.doc.querySelector(this.args.node);
    if (!container) {
      throw new Error(`Container not found: ${this.args.node}`);
    }

    this.container = container as HTMLElement;
    this.container.style.width = `${this.args.canvasSize.w}px`;
    this.container.style.height = `${this.args.canvasSize.h}px`;

    this.canvas = this.doc.createElement("canvas");
    this.canvas.style.position = "absolute";
    this.canvas.width = this.args.canvasSize.w;
    this.canvas.height = this.args.canvasSize.h;

    this.container.appendChild(this.canvas);

    loadScript(this.args.src).then(() => {
      console.log(`animate cc :: ${this.args.src}`);
      this.init();
    });

    window.addEventListener("MESSAGE", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.message === "FRAME_CALL_END") {
        const mc: MovieClip = detail.mc;
        for (const [key] of this.frameCallMap) {
          if (key === mc) {
            this.frameCallMap.delete(key);
          }
        }
      }
    });
  }

  public getContainer(): HTMLElement {
    if (!this.container) {
      throw new Error("Container not initialized");
    }
    return this.container;
  }

  private init(): void {
    const key = Object.keys(window.AdobeAn.compositions)[0];
    // const comp = window.AdobeAn.getComposition(key);
    const comp = window.AdobeAn.compositions[key];
    const loader = new createjs.LoadQueue(false);
    loader.installPlugin(createjs.Sound);
    loader.addEventListener("fileload", (evt: unknown) => {
      this.handleFileLoad(evt as FileLoadEvent, comp);
    });
    loader.addEventListener("complete", (evt: unknown) => {
      this.handleComplete(evt as { target: LoadQueue }, comp);
    });
    // loader.addEventListener("progress", (evt: unknown) => {
    //   this.handleProgress(evt as ProgressEvent, this.progress);
    // });

    const lib: Lib = comp.getLibrary();
    createjs.MotionGuidePlugin.install();
    const manifest = lib.properties.manifest;

    if (isMobileIOS()) {
      manifest.map((list) => {
        if (this.args.manifestSrc) {
          list.src = this.args.manifestSrc.concat("/", list.src);
        }
      });
      if (manifest.length > 0) {
        loader.loadManifest(manifest);
      } else {
        this.setupComplete(lib);
      }
    } else {
      const imgManifest: { src: string; id: string }[] = [];
      manifest.map((list: { src: string; id: string }) => {
        if (this.args.manifestSrc) {
          list.src = this.args.manifestSrc.concat("/", list.src);
        }
        if (list.src.indexOf(".mp3") === -1) {
          imgManifest.push(list);
        } else {
          // 사운드 등록
          SoundManager.add({
            id: list.id,
            src: list.src,
            tag: this.args.stageContent,
          });
        }
      });
      if (imgManifest.length > 0) {
        loader.loadManifest(imgManifest);
      } else {
        this.setupComplete(lib);
      }
    }
  }

  private handleFileLoad(evt: FileLoadEvent, comp: AdobeComposition): void {
    const images = comp.getImages();
    if (evt?.item.type === "image") {
      images[evt.item.id] = evt.result;
    }
  }

  private handleComplete(evt: { target: LoadQueue }, comp: AdobeComposition): void {
    const lib: Lib = comp.getLibrary();
    const ss = comp.getSpriteSheet() as Record<string, createjs.SpriteSheet>;
    const queue = evt.target;
    const ssMetadata = lib.ssMetadata;
    for (let i = 0; i < ssMetadata.length; i++) {
      ss[ssMetadata[i].name] = new createjs.SpriteSheet({
        images: [queue.getResult(ssMetadata[i].name)],
        frames: ssMetadata[i].frames,
      });
    }
    this.setupComplete(lib);
  }

  // private handleProgress(
  //   evt: ProgressEvent,
  //   callback: (progress: number) => void,
  // ): void {
  //   if (callback) {
  //     callback(evt.progress);
  //   }
  // }

  // private progress(p: number): void {
  //   console.log(`loading animate --> ${p * 100}%`);
  // }

  private setupComplete(lib: Lib): void {
    this.lib = lib;
    this.exportRoot = new lib[this.args.stageContent]();
    this.exportRoot.name = `exportRoot_${this.args.stageContent}`;
    this.stage = new lib.Stage(this.canvas);
    createjs.Touch.enable(this.stage, true, false); // 모바일에서 click 이벤트를 잡아 먹는다
    this.stage.enableMouseOver();
    this.addGlobal();

    if (this.canvas && AnimateCC.SCALE_UP && !isMobile()) {
      const scale = 2;
      const w = this.args.canvasSize.w;
      const h = this.args.canvasSize.h;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
      this.canvas.width = w * scale;
      this.canvas.height = h * scale;
      this.stage.scaleX = scale;
      this.stage.scaleY = scale;
    }

    createjs.Ticker.framerate = lib.properties.fps;
    // createjs.Ticker.timingMode = createjs.Ticker.RAF;
    // createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.timingMode = createjs.Ticker.TIMEOUT;
    createjs.Ticker.interval = 30;
    createjs.Ticker.addEventListener("tick", this.stage);

    this.stage.addChild(this.exportRoot);
    this.stage.tickEnabled = false;

    sendMessage(window, {
      message: AnimateCC.READY_COMPLETE,
      self: this,
    });

    if (this.args.autoplay) {
      this.start();
    }
  }

  public start(): void {
    this.stage.tickEnabled = true;
    sendMessage(window, {
      message: AnimateCC.START,
      self: this,
    });
  }

  public pause(): void {
    if (this.stage) {
      this.stage.tickEnabled = false;
    }
  }

  public resume(): void {
    if (this.stage) {
      this.stage.tickEnabled = true;
    }
  }

  private addGlobal(): void {
    window.playSound = this.playSound.bind(this);
  }

  public playSound(id: string, loop: boolean, offset: number): void {
    if (isMobileIOS()) {
      createjs.Sound.play(id, {
        interrupt: createjs.Sound.INTERRUPT_EARLY,
        loop: loop,
        offset: offset,
      });
    } else {
      SoundManager.play(id);
    }
  }

  public play(mc: MovieClip, s: string | number, e: string | number, list?: FrameCallType[]): void {
    const endFrame = e === "end" ? mc.totalFrames - 1 : e;
    const queue = new Map<FrameCallKey, FrameCallValue>(list);
    let frameCall: FrameCall | undefined;
    if (this.frameCallMap.has(mc)) {
      frameCall = this.frameCallMap.get(mc);
      if (frameCall) {
        frameCall.dispose();
        frameCall = new FrameCall(mc, s, endFrame, queue);
        this.frameCallMap.set(mc, frameCall);
        frameCall.start();
      }
    } else {
      frameCall = new FrameCall(mc, s, endFrame, queue);
      this.frameCallMap.set(mc, frameCall);
      frameCall.start();
    }
  }

  public stopPlayQueue(mc: MovieClip): void {
    for (const [key, value] of this.frameCallMap) {
      if (key === mc) {
        value.dispose();
        this.frameCallMap.delete(key);
      }
    }
  }

  public stopAllPlayQueue(): void {
    for (const [key, value] of this.frameCallMap) {
      value.dispose();
      this.frameCallMap.delete(key);
    }
  }

  public playOnce(mc: MovieClip): Promise<void> {
    return new Promise((resolve) => {
      this.play(mc, 0, "end", [
        [
          "end",
          () => {
            resolve();
          },
        ],
      ]);
    });
  }

  public playOnceLabelMC(mc: MovieClip, label: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.hasLabel(mc, label)) {
        mc.gotoAndStop(label);
        const ani = this.getChildAt(mc, 0);
        this.play(ani, 0, "end", [
          [
            "end",
            () => {
              resolve();
            },
          ],
        ]);
      } else {
        console.log(`무비클립에 ${label}라벨이 없음`);
        resolve();
      }
    });
  }

  /**
   * cc 유저 입력 차단
   */
  public lock(): void {
    console.log("lock cc");
    this.exportRoot.mouseEnabled = false;
  }

  /**
   * cc 유저 입력 차단 해제
   */
  public unlock(): void {
    console.log("unlock cc");
    this.exportRoot.mouseEnabled = true;
  }

  public getRoot() {
    return this.exportRoot;
  }

  public getLib(): Lib {
    return this.lib;
  }

  public getStage(): Stage {
    return this.stage;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 무비클립 컨테이너나 root에서 무비클립을 찾는다
   */
  public get(name: string, container: MovieClip | null = null): MovieClip | undefined {
    if (container) {
      return container.getChildByName(name) as MovieClip;
    }
    return this.exportRoot.getChildByName(name) as MovieClip;
  }

  /**
   * 무비클립 컨테이너 또는 root의 모든 자식 무비클립으로부터 무비클립을 찾는다
   */
  public find(name: string, container: MovieClip | null = null): MovieClip | undefined {
    let mc: MovieClip;
    if (container) {
      mc = container;
    } else {
      mc = this.exportRoot;
    }
    const target = mc.getChildByName(name) as MovieClip;
    if (!target) {
      const children = mc.children;
      for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        if (child instanceof createjs.MovieClip) {
          const t: MovieClip | undefined = this.find(name, child);
          if (t) {
            return t;
          }
        }
      }
    } else {
      return target;
    }
  }

  public setHitArea(mc: MovieClip): void {
    const bounds = (mc as CCMovieClip).nominalBounds;
    const shape = new createjs.Shape();
    shape.graphics.beginFill("#ff0000").drawRect(bounds.x, bounds.y, bounds.width, bounds.height);
    mc.hitArea = shape;
    // mc.addChildAt(shape, 0);
    // // mc.addChild(shape);
    // shape.alpha = 0.3;
  }

  /**
   * cc display object의 Rectangle객체를 리턴
   * @param {MovieClip} item
   * @returns {Rectangle} Rectangle 객체
   */
  public getBound(item: MovieClip): Rectangle {
    const mc = item as CCMovieClip;
    let bounds = mc.getBounds();
    if (!bounds) bounds = mc.nominalBounds;
    return bounds;
  }

  public getNominalBound(item: MovieClip): Rectangle {
    const mc = item as CCMovieClip;
    return mc.nominalBounds;
  }

  /**
   * target의 bound안에 x, y 좌표가 포함되는지 여부로 hit 체크
   * target visible false 이거나 mouseEnabled false 이면 no hit
   * @param {MovieClip} target
   * @param {number} x
   * @param {number} y
   * @returns {boolean} is hitted
   */
  public hitTest(target: MovieClip, x: number, y: number): boolean {
    if (!target.visible || !target.mouseEnabled) return false;
    const pt = target.globalToLocal(x, y);
    const bound = this.getBound(target);
    if (pt.x >= 0 && pt.x <= bound.width && pt.y >= 0 && pt.y <= bound.height) {
      return true;
    }
    return false;
  }

  /**
   * 두 display object가 겹치는지
   * @param {MovieClip} item0
   * @param {MovieClip} item1
   * @returns {boolean} is overlaped
   */
  public overlap(item0: MovieClip, item1: MovieClip): boolean {
    const points0 = this.setupPoint(item0);
    const points1 = this.setupPoint(item1);
    if (points0.tr.y > points1.bl.y || points0.bl.y < points1.tr.y) {
      return false;
    }
    if (points0.tr.x < points1.bl.x || points0.bl.x > points1.tr.x) {
      return false;
    }
    return true;
  }

  private setupPoint(item: MovieClip): {
    tr: {
      x: number;
      y: number;
    };
    bl: {
      x: number;
      y: number;
    };
  } {
    const bounds = this.getBound(item);
    const ltPos = {
      x: item.x - item.regX,
      y: item.y - item.regY,
    };
    const pt = item.parent.localToGlobal(ltPos.x, ltPos.y);
    const points = {
      tr: {
        x: pt.x + bounds.width,
        y: pt.y,
      },
      bl: {
        x: pt.x,
        y: pt.y + bounds.height,
      },
    };
    return points;
  }

  public disableButton(mc: MovieClip): void {
    mc.alpha = 0.5;
    mc.mouseEnabled = false;
  }

  public enableButton(mc: MovieClip): void {
    mc.alpha = 1;
    mc.mouseEnabled = true;
  }

  public isClicked(target: DisplayObject, name: string): boolean {
    if (target.name === name) return true;

    let current = target.parent;
    while (current) {
      if (current.name === name) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * y좌표로 정렬한 후에 x좌표로 정렬하여 순서대로 arr의 인자들을 정렬
   * */
  public alignInY(list: DisplayObject[]) {
    let tx1 = 0;
    let tx2 = 0;
    let ty1 = 0;
    let ty2 = 0;

    for (let i = 0; i < list.length; ++i) {
      for (let j = i + 1; j < list.length; ++j) {
        tx1 = Math.floor(list[i].x);
        ty1 = Math.floor(list[i].y);
        tx2 = Math.floor(list[j].x);
        ty2 = Math.floor(list[j].y);
        if (ty1 > ty2) {
          const temp = list[i];
          list[i] = list[j];
          list[j] = temp;
        } else if (Math.abs(ty1 - ty2) < 5) {
          if (tx1 > tx2) {
            const temp = list[i];
            list[i] = list[j];
            list[j] = temp;
          }
        }
      }
    }
  }

  /**
   * x좌표로 정렬한 후에 순서대로 arr의 인자들을 정렬
   * */
  public alignInX(list: DisplayObject[]) {
    let tx1 = 0;
    let tx2 = 0;
    let ty1 = 0;
    let ty2 = 0;

    for (let i = 0; i < list.length; ++i) {
      for (let j = i + 1; j < list.length; ++j) {
        tx1 = Math.floor(list[i].x);
        ty1 = Math.floor(list[i].y);
        tx2 = Math.floor(list[j].x);
        ty2 = Math.floor(list[j].y);
        if (tx1 > tx2) {
          const temp = list[i];
          list[i] = list[j];
          list[j] = temp;
        } else if (Math.abs(tx1 - tx2) < 5) {
          if (ty1 > ty2) {
            const temp = list[i];
            list[i] = list[j];
            list[j] = temp;
          }
        }
      }
    }
  }

  public getMovieClipsByName(name: string, target?: MovieClip): MovieClip[] {
    const arr: MovieClip[] = [];
    let i = 0;

    while (true) {
      const mc = this.find(`${name}_${i}`, target);
      if (!mc) break;
      arr.push(mc);
      i++;
    }

    if (arr.length === 0) {
      console.warn(`${name} 무비클립을 찾을수 없음`);
    }
    return arr;
  }

  public getChildAt(mc: MovieClip, index: number): MovieClip {
    return mc.getChildAt(index) as MovieClip;
  }

  public hasLabel(mc: CCMovieClip, label: string): boolean {
    const labels = mc.labels;
    const bool = labels.some((o: MovieClipLabel) => o.label === label);
    return bool;
  }
}

