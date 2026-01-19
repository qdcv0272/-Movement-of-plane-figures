import Sound, { type EventCallback } from "./sound";

type SoundData = {
  sound: Sound;
  id: string;
  src: string;
  preload?: "auto" | "metadata" | "none";
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  muted?: boolean;
  tag?: string;
  ignoreStop?: boolean;
};

class SndManager {
  private sounds = new Map<string, SoundData>();

  private pauseSounds: Sound[] = [];

  constructor() {
    this.sounds = new Map();

    this.pauseSounds = [];
  }

  public add(ops: AudioOption | AudioOption[]): void {
    if (Array.isArray(ops)) {
      for (const ob of ops) {
        this._add(ob);
      }
    } else {
      this._add(ops);
    }
  }

  private _add(ops: AudioOption): void {
    if (this.isContain(ops.id)) {
      console.log(`${ops.id} 오디오 아이디는 이미 가지고 있음`);
      return;
    }

    const defaultOps = {
      volume: 1,
      loop: false,
      ignoreStop: false,
      tag: "default",
    };

    const mergedOps = Object.assign(defaultOps, ops);

    // call by reference 문제로 defaultOps를 매번 새로운 객체 사용
    const sound = new Sound(mergedOps);
    this.sounds.set(ops.id, {
      sound: sound,
      ...mergedOps,
    });
  }

  public get(id: string): Sound | null {
    return this.sounds.get(id)?.sound ?? null;
  }

  public on(id: string, event: string, fn: EventCallback, once = false): void {
    const sound = this.get(id);
    if (sound) {
      sound.on(event, fn, once);
    }
  }

  public off(id: string, event: string, fn?: EventCallback): void {
    const sound = this.get(id);
    if (sound) {
      sound.off(event, fn);
    }
  }

  public play(id: string, ended?: EventCallback): void {
    const sound = this.get(id);
    if (!sound) return;
    if (ended) {
      this.off(id, "ended");
      this.on(id, "ended", ended, true);
    }
    sound.play();
  }

  public resume(id: string): void {
    const sound = this.get(id);
    if (!sound) return;
    sound.resume();
  }

  public pause(id: string): void {
    const sound = this.get(id);
    if (!sound) return;
    sound.pause();
  }

  public stop(id: string): void {
    const sound = this.get(id);
    if (!sound) return;
    sound.stop();
  }

  public seek(id: string, msec: number): void {
    const sound = this.get(id);
    if (!sound) return;
    sound.seek(msec);
  }

  public stopAll(): void {
    for (const ob of this.sounds.values()) {
      if (ob.ignoreStop || ob.tag === "bgm") continue;
      ob.sound.stop();
    }
  }

  public resumeAll(): void {
    for (const sound of this.pauseSounds) {
      sound.resume();
    }
    this.pauseSounds = [];
  }

  public pauseAll(): void {
    for (const ob of this.sounds.values()) {
      if (!ob.sound.paused) {
        ob.sound.pause();
        this.pauseSounds.push(ob.sound);
      }
    }
  }

  public getPaused(id: string): boolean {
    const sound = this.get(id);
    if (!sound) return false;
    return sound.paused;
  }

  public getDuration(id: string): number {
    let sec = -1;
    const sound = this.get(id);
    if (!sound) return sec;
    sec = sound.duration;
    return sec;
  }

  public getCurrentTime(id: string): number {
    let sec = -1;
    const sound = this.get(id);
    if (!sound) return sec;
    sec = sound.currentTime;
    return sec;
  }

  public setVolume(volume: number, id?: string): void {
    if (id) {
      const sound = this.get(id);
      if (!sound) return;
      sound.volume = volume;
    } else {
      for (const ob of this.sounds.values()) {
        ob.sound.volume = volume;
      }
    }
  }

  public loadAll(): void {
    for (const ob of this.sounds.values()) {
      ob.sound.load();
    }
  }

  private isContain(id: string): boolean {
    let bool = false;
    for (const key of this.sounds.keys()) {
      if (id === key) {
        bool = true;
        break;
      }
    }
    return bool;
  }
}

const SoundManager = new SndManager();

export default SoundManager;
