type SoundEventMap = {
  [type: string]: EventOption[];
};

type EventOption = {
  fn: EventCallback;
  once: boolean;
};

export type EventCallback = () => void;

export default class Sound {
  public audio: HTMLAudioElement;

  private eventMap: SoundEventMap;

  private audioOption: AudioOption;

  private bindPlay: (e: Event) => void;
  private bindPause: (e: Event) => void;
  private bindEnded: (e: Event) => void;

  constructor(ops: AudioOption) {
    this.audioOption = ops;
    this.audio = new Audio();
    this.audio.preload = "none";
    this.audio.src = ops.src;

    if (ops.loop) {
      this.audio.loop = ops.loop;
    }

    if (ops.volume) {
      this.audio.volume = ops.volume;
    }

    if (ops.autoplay) {
      this.play();
    }

    this.eventMap = {
      play: [],
      pause: [],
      ended: [],
    };

    this.bindPlay = this.hnPlay.bind(this);
    this.bindPause = this.hnPause.bind(this);
    this.bindEnded = this.hnEnded.bind(this);

    this.audio.addEventListener("play", this.bindPlay);
    this.audio.addEventListener("pause", this.bindPause);
    this.audio.addEventListener("ended", this.bindEnded);

    // this.audio.addEventListener("canplay", () => {
    //   console.log(ops.src);
    // });
  }

  public on(event: string, fn: EventCallback, once = false) {
    this.eventMap[event].push({
      fn: fn,
      once: once,
    });
  }

  public off(event: string, fn?: EventCallback) {
    const events = this.eventMap[event];
    if (!fn) {
      this.eventMap[event] = [];
    } else {
      for (let i = 0; i < events.length; ++i) {
        if (fn === events[i].fn) {
          events.splice(i, 1);
          break;
        }
      }
    }
  }

  public offAll(): void {
    for (const key of Object.keys(this.eventMap)) {
      this.eventMap[key] = [];
    }
  }

  public emit(event: string) {
    const events = this.eventMap[event];
    for (let i = events.length - 1; i >= 0; --i) {
      const ob = events[i];
      ob.fn();
      if (ob.once) {
        this.off(event, ob.fn);
      }
    }
  }

  private hnPlay(): void {
    this.emit("play");
  }

  private hnPause(): void {
    this.emit("pause");
  }

  private hnEnded(): void {
    this.stop();
    this.emit("ended");
  }

  public load(): void {
    this.audio.load();
  }

  public play(): void {
    this.stop();
    this.audio.play().catch((e) => {
      console.log("@@ :: ", e);
    });
  }

  public resume(): void {
    this.audio.play();
  }

  public pause(): void {
    this.audio.pause();
  }

  public stop(): void {
    if (this.audio.readyState > 0) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  public seek(msec: number): void {
    this.audio.currentTime = msec / 1000;
  }

  public get paused(): boolean {
    let bool = false;
    if (this.audio.paused && this.audio.currentTime !== 0) {
      bool = true;
    }
    return bool;
  }

  public get currentTime(): number {
    return this.audio.currentTime;
  }

  public get duration(): number {
    return this.audio.duration;
  }

  public set volume(number: number) {
    if (number < 0 || number > 1) return;
    this.audio.volume = number;
  }
}
