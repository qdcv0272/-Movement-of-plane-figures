declare global {
  interface Window {
    bound: {
      x: number;
      y: number;
      scale: number;
    };

    globalVolume: number;

    [callback: string]: (result: string) => void;

    createjs: import("createjs-ts").CreateJS;
    AdobeAn: {
      compositions: Record<string, AdobeComposition>;
    };
    playSound: (id: string, loop: boolean, offset: number) => void;
  }

  interface IButton extends HTMLElement {
    btnType: string;
    idx: number;
  }

  interface AudioOption {
    id: string;
    src: string;
    preload?: "auto" | "metadata" | "none";
    autoplay?: boolean;
    loop?: boolean;
    volume?: number;
    muted?: boolean;
    tag?: string;
    ignoreStop?: boolean;
  }

  type Point = {
    x: number;
    y: number;
  };
}

export {};

