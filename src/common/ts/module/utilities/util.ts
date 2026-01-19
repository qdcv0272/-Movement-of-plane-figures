import { UAParser } from "my-ua-parser";

export function sendMessage<T>(t: Window | HTMLElement, data: T) {
  const customEvent = new CustomEvent("MESSAGE", {
    detail: data,
  });
  t.dispatchEvent(customEvent);
}

export function setScale(el: HTMLElement, baseW: number, baseH: number): { x: number; y: number; scale: number } {
  const ratioX = window.innerWidth / baseW;
  const ratioY = window.innerHeight / baseH;
  const ratio = Math.min(ratioX, ratioY);
  const scaledWidth = baseW * ratio;
  const scaledHeight = baseH * ratio;
  const x = (window.innerWidth - scaledWidth) / 2;
  const y = (window.innerHeight - scaledHeight) / 2;
  el.style.transformOrigin = "top left";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = `scale(${ratio})`;
  return {
    x: x,
    y: y,
    scale: ratio,
  };
}

export function fixRatio(options: {
  root: HTMLElement;
  stageSize: { width: number; height: number };
  cb?: (params: { zoom: number; x: number; y: number; scale: number }) => void;
}): { zoom: number; x: number; y: number; scale: number } {
  const { root, stageSize, cb } = options;

  const ratioX = window.innerWidth / stageSize.width;
  const ratioY = window.innerHeight / stageSize.height;
  const ratio = Math.min(ratioX, ratioY);
  const scaledWidth = stageSize.width * ratio;
  const scaledHeight = stageSize.height * ratio;
  const x = (window.innerWidth - scaledWidth) / 2;
  const y = (window.innerHeight - scaledHeight) / 2;

  root.style.transformOrigin = "top left";
  root.style.left = `${x}px`;
  root.style.top = `${y}px`;
  root.style.transform = `scale(${ratio})`;

  const params = {
    zoom: ratio,
    x: x,
    y: y,
    scale: ratio,
  };

  if (cb) {
    cb(params);
  }

  return params;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getStyle(element: Element, style: string): string {
  const cs = getComputedStyle(element);
  return cs.getPropertyValue(style);
}

export function getFontSize(element: Element): number {
  const fontSize = Number.parseInt(getStyle(element, "font-size").replace("px", ""));
  return fontSize;
}

export function getOffset(element: Element, container?: Element): { x: number; y: number } {
  const el = element as HTMLElement;
  let currentEl: HTMLElement | null = el;
  let x = 0;
  let y = 0;

  while (currentEl && currentEl !== (container as HTMLElement)) {
    const style = window.getComputedStyle(currentEl);
    const transform = style.transform;

    if (transform && transform !== "none") {
      const matrix = new DOMMatrix(transform);
      x += matrix.m41; // X축 이동값 (translateX)
      y += matrix.m42; // Y축 이동값 (translateY)
    }

    x += currentEl.offsetLeft;
    y += currentEl.offsetTop;
    currentEl = currentEl.parentElement;
  }

  return { x, y };
}

export function removeClassByPrefix(node: HTMLElement, prefix: string): void {
  // const regx = new RegExp("\\b" + prefix + "[^ ]*[ ]?\\b", "g");
  // 단어 경계 \b 사용시 abc-prefix인 경우도 삭제되는 문제 발생
  const regx = new RegExp(`(^|\\s)${prefix}\\S+`, "g");
  node.className = node.className.replace(regx, "");
}

export function hitTest(a: HTMLElement, b: HTMLElement): boolean {
  const rect0 = a.getBoundingClientRect();
  const rect1 = b.getBoundingClientRect();

  const ax1 = rect0.left;
  const ay1 = rect0.top;
  const ax2 = rect0.right;
  // const ay2 = ay1;
  // const ax3 = ax1;
  const ay3 = rect0.bottom;
  // const ax4 = ax2;
  // const ay4 = ay3;

  const bx1 = rect1.left;
  const by1 = rect1.top;
  const bx2 = rect1.right;
  // const by2 = by1;
  // const bx3 = bx1;
  const by3 = rect1.bottom;
  // const bx4 = bx2;
  // const by4 = by3;

  let hOverlap = true;
  if (ax1 < bx1 && ax2 < bx1) hOverlap = false;
  if (ax1 > bx2 && ax2 > bx2) hOverlap = false;

  let vOverlap = true;
  if (ay1 < by1 && ay3 < by1) vOverlap = false;
  if (ay1 > by3 && ay3 > by3) vOverlap = false;

  return hOverlap && vOverlap;
}

export function isCoordinateInElement(element: HTMLElement, x: number, y: number): boolean {
  if (!element || typeof element.getBoundingClientRect !== "function") {
    console.error("유효한 엘리먼트가 아닙니다.");
    return false;
  }
  const rect = element.getBoundingClientRect();

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export async function loadScripts(srcs: string[]): Promise<void> {
  for (let i = 0; i < srcs.length; ++i) {
    await loadScript(srcs[i]);
    console.log(`${i}번째 스크립트 로드 완료`);
  }
  return new Promise((resolve) => {
    resolve();
  });
}

export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    document.body.appendChild(script);
    script.addEventListener("load", () => {
      resolve();
    });
    script.addEventListener("error", () => {
      reject(new Error(`${src} 스크립트 로드 실패`));
    });
  });
}

export async function loadStyles(srcs: string[]): Promise<void> {
  for (let i = 0; i < srcs.length; ++i) {
    await loadStyle(srcs[i]);
    console.log(`${i}번째 CSS 로드 완료`);
  }
  return new Promise((resolve) => {
    resolve();
  });
}

export function loadStyle(src: string): Promise<void> {
  return new Promise((resolve) => {
    const head = document.getElementsByTagName("head")[0];
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = src;
    head.appendChild(link);
    link.addEventListener("load", () => {
      resolve();
    });
  });
}

export function consoleStyle(str: string, styles: string[] | null = null): void {
  let style: string;
  if (styles) {
    style = styles.join(";");
  } else {
    style = [
      "padding : 30px 20px",
      "margin : 20px 0",
      "background : linear-gradient(#0099FF, #FFFFFF)",
      "font-size : 25px",
      "font-weight : bold",
      "text-align : center",
      "color : #ffffff",
    ].join(";");
  }
  console.log(`%c ${str}`, style);
}

export function log(...arg: any[]): void {
  let obj = typeof arg === "string" ? [arg] : arg;

  let style = [
    "padding : 2px 2px",
    "background : #666",
    "border-radius : 3px",
    // "font-size : 14px",
    "font-weight : bold",
    "text-align : center",
    "color : #ffffff",
  ].join(";");

  console.log(`%c[AmtLog]`, style, ...obj);
}

export function lockChild(el: HTMLElement): void {
  for (const child of Array.from(el.children)) {
    (child as HTMLElement).style.pointerEvents = "none";
  }
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; --i) {
    const rand = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[rand];
    array[rand] = temp;
  }
  return array;
}

export function isMobile(): boolean {
  const parser = new UAParser();
  const device = parser.getDevice();
  if (device.type === "mobile" || device.type === "tablet") {
    return true;
  }
  return false;
}

export function isMobileIOS(): boolean {
  const parser = new UAParser();
  // console.log(parser); // {}
  // let parserResults = parser.getResult();
  // console.log(parserResults);
  const device = parser.getDevice();
  // alert(`${device.type}, ${device.model}, ${device.vendor}`);
  if ((device.type === "mobile" || device.type === "tablet") && (device.model === "iPhone" || device.model === "iPad")) {
    return true;
  }
  return false;
}

export function setHover(elems: HTMLElement[] | HTMLElement): void {
  const btns = Array.isArray(elems) ? elems : [elems];
  btns.forEach((btn: HTMLElement) => {
    btn = btn as HTMLElement;
    btn.addEventListener("pointerenter", (e) => {
      let pointerType = e.pointerType || "touch";
      if (pointerType === "touch") return;
      btn.classList.add("hover");
    });
    btn.addEventListener("pointerleave", (e) => {
      let pointerType = e.pointerType || "touch";
      if (pointerType === "touch") return;
      btn.classList.remove("hover");
    });
  });
}

