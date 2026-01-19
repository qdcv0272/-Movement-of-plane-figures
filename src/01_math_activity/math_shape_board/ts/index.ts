import Common from "@ts/common";
import shapeBoard from "@common/ts/activity/math_shape_board/shape_board_main";

import "@common/css/01_math_activity.css";

import "overlayscrollbars/overlayscrollbars.css";

import "../css/font.css";
import "../css/index.css";

const common = new Common();

common.noDelay();
common.setupInit(initPage);

function initPage() {
  const pages = [
    new shapeBoard({
      root: ".root",
      // cc: {
      //   node: ".animate-cc",
      //   src: "./cc/animation.js",
      //   manifestSrc: "./cc/",
      //   stageContent: "animation",
      //   canvasSize: {
      //     w: 1280,
      //     h: 720,
      //   },
      //   autoplay: false,
      // },
      sounds: {
        list: [
          // {
          //   id: "bgm_intro",
          //   src: "./audio/bgm_intro.mp3",
          //   loop: true,
          //   ignoreStop: true,
          // },
          // {
          //   id: "bgm_game",
          //   src: "./audio/bgm_game.mp3",
          //   loop: true,
          //   ignoreStop: true,
          // },
          // {
          //   id: "bgm_outro",
          //   src: "./audio/bgm_outro.mp3",
          //   loop: true,
          //   ignoreStop: true,
          // },
          // {
          //   id: "sample_audio_01",
          //   src: "./audio/sample_audio_01.mp3",
          // },
        ],
      },
      // startStepIndex: 1, // 시작 스텝 인덱스
    }),
  ];

  return pages;
}
