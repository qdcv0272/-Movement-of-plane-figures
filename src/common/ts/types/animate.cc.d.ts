type AnimateCCProps = {
  node: string;
  src: string;
  stageContent: string;
  canvasSize: CanvasSize;
  autoplay: boolean;
  manifestSrc?: string;
};

type Lib = {
  Stage: import("createjs-ts").Stage;
  properties: {
    id: string;
    width: number;
    height: number;
    fps: number;
    color: string;
    opacity: number;
    manifest: { src: string; id: string }[];
  };
  ssMetadata: { name: string; frames: number[][] }[];
  [key: string]: typeof MovieClip;
  // | Lib["Stage"]
  // | Lib["properties"]
  // | Lib["ssMetadata"];
};

type CanvasSize = {
  w: number;
  h: number;
};

type Stage = window.createjs.Stage;

type DisplayObject = window.createjs.DisplayObject;

type Rectangle = window.createjs.Rectangle;

type Shape = window.createjs.Shape;

type MovieClip = window.createjs.MovieClip;

interface MovieClipLabel {
  label: string;
  position: number;
}

type CCMovieClip = MovieClip & {
  nominalBounds: Rectangle;
  labels: MovieClipLabel[];
};

interface CreateJSEvent {
  type: string;
  target: LoadQueue;
}

interface FileLoadEvent extends CreateJSEvent {
  item: {
    id: string;
    type: string;
    src?: string;
  };
  result: unknown;
}

interface LoadQueue extends EventTarget {
  loadManifest: (manifest: { src: string; id: string }[]) => void;
  installPlugin: (plugin: unknown) => void;
  addEventListener: (type: string, handler: (evt: CreateJSEvent) => void) => void;
  getResult: (name: string) => unknown;
}

interface ProgressEvent {
  progress: number;
  target: LoadQueue;
}

interface AdobeComposition {
  getStage: () => Stage;
  getLibrary: () => Lib;
  getImages: () => Record<string, unknown>;
  getSpriteSheet: () => Record<string, createjs.SpriteSheet>;
}
