import path from "path";
import fs from "fs-extra";
import { defineConfig } from "@rsbuild/core";

import { target } from "./dev";

const splits = target.split("/");
const file = [...splits].pop();
const fileName = !file ? "index" : file.split(".")[0];
if (file && file?.indexOf(".ts") > -1) splits.pop();
const sPath = `../src/${splits.join("/")}`;
const dPath = `../dist/${splits.join("/")}`;
const root = path.resolve(__dirname, sPath);
const rootDist = path.resolve(__dirname, dPath);
console.log("splits:", splits);
console.log("file:", file);
console.log("fileName:", fileName);
console.log("root:", root);
console.log("rootDist:", rootDist);

export default defineConfig(({ env, command, envMode }) => {
  console.log("env :: ", env);
  console.log("command :: ", command);
  console.log("envMode :: ", envMode);

  const lesson = process.env.LESSON;
  console.log("lesson:", lesson);

  return {
    source: {
      entry: {
        [fileName]: `${root}/ts/${fileName}.ts`,
      },
    },
    html: {
      template: `${root}/${fileName}.html`,
      inject: "body",
      templateParameters: {
        title: "content",
      },
      // meta: {
      //   charset: {
      //     charset: "UTF-8",
      //   },
      //   viewport: "width=device-width, initial-scale=0",
      // },
    },
    output: {
      // cleanDistPath: false,
      dataUriLimit: 0,
      distPath: {
        // root: `./dist/test/`,
        root: rootDist,
        js: "js",
        css: "css",
        image: "common/image",
        media: "common/audio",
      },
      // enableAssetFallback: false, // asset 파일 이름에도 해시 제거
      // filenameHash: false, // 해시 전면 비활성화 (핵심)
      //
      // assetPrefix: "auto",
      // filename: {
      //   media: "[path][name].[hash:8][ext]", // dist/assets/media/원본_하위경로/파일이름.해시.mp3
      // },
      filename: {
        js: "[name].js",
        css: "[name].css",
      },
      copy: [
        {
          from: `${root}/cc`,
          to: `cc`,
          noErrorOnMissing: true,
          globOptions: {
            ignore: ["*.fla", "*.html"],
          },
        },
        {
          from: `${root}/images`,
          to: "images",
          noErrorOnMissing: true,
        },
        {
          from: `${root}/image`,
          to: "image",
          noErrorOnMissing: true,
        },
        {
          from: `${root}/audio`,
          to: `audio`,
          noErrorOnMissing: true,
        },
        {
          from: `${root}/font`,
          to: `font`,
          noErrorOnMissing: true,
        },
        {
          from: `${root}/scenes`,
          to: "scenes",
          noErrorOnMissing: true,
        },
        {
          from: `${root}/js/lib`,
          to: "js/lib",
          noErrorOnMissing: true,
        },
      ],
    },

    server: {
      // publicDir: {
      //   name: path.join(__dirname, dPath),
      // },
      port: 3001,
      // open: "/NURI_1_16_01.html",
      // open: "/",
    },
    sourceMap: {
      js: env === "development" ? "cheap-module-source-map" : false,
      css: true,
    },
    tools: {
      lightningcssLoader: false, // 개발 모드에서는 비활성화, 브라우저 데브툴에서 css속성 순서가 바껴서 작업 하기 불편함
      /**
       * CSS에서 url()로 참조되는 파일 경로의 존재 여부를 확인하여, 실제 파일이 존재할 때만 번들에 포함시킴
       */
      cssLoader: {
        url: {
          filter: (url, resourcePath) => {
            if (process.env.NODE_ENV === "development") {
              console.log("🔍 CSS URL Filter:", url);
            }

            let fullPath = "";
            let returnValue = false;

            if (url.startsWith("../") || url.startsWith("./")) {
              // 1. 상대 경로인 경우, resourcePath를 기준으로 파일 경로를 찾음
              fullPath = path.resolve(resourcePath, "../", url);
            } else if (url.startsWith("@assets")) {
              // 2. @assets 경로인 경우, src/common/assets 폴더에서 파일을 찾음
              fullPath = path.resolve(__dirname, "../src/common/assets", url.replace("@assets/", ""));
            } else if (url.startsWith("@font")) {
              // 3. @font 경로인 경우, src/common/font 폴더에서 파일을 찾음
              fullPath = path.resolve(__dirname, "../src/common/font", url.replace("@font/", ""));
            }

            try {
              const exists = fs.existsSync(fullPath);
              if (!exists) {
                console.log(`📁 File check: ${exists ? "✅ EXISTS" : "❌ NOT FOUND"} - ${url} - ${fullPath}`);
              }
              returnValue = exists;
            } catch (error) {
              console.log(`❌ Error checking file: ${url}`, error);
              returnValue = false;
            }

            return returnValue;
          },
        },
      },
      /**
       * 번들링 체인 :: 번들링 규칙 설정
       * - 모든 이미지, 오디오 파일을 images, media 폴더에 복사
       * - 파일 이름은 원본 파일 이름과 동일하게 복사
       * - 하위 경로 유지
       *
       * @param chain
       */
      bundlerChain: (chain) => {
        // Split chunks configuration
        chain.optimization.splitChunks({
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendor",
              chunks: "all",
            },
          },
        });

        // image
        chain.module
          .rule("assets")
          .oneOf("image")
          .type("asset/resource")
          .test(/\.(png|jpe?g|gif|svg|webp)$/i)
          .set("generator", {
            // filename: "common/image/[path][name][ext]", // 하위 경로 유지
            filename: (pathData: { filename: string }) => {
              const relPath = pathData.filename ?? "";
              if (pathData.filename.includes("common/")) {
                const cleanedPath = relPath.replace(/^src[\\/]/, "");
                // console.log(relPath);
                // console.log(cleanedPath);
                return `${cleanedPath}`;
              }
              if (pathData.filename.includes("image/")) {
                const cleanedPath = `image/` + pathData.filename.split("image/")[1];
                return `${cleanedPath}`;
              }
              const cleanedPath = `images/` + pathData.filename.split("images/")[1];
              // console.log(relPath);
              // console.log(cleanedPath);
              return `${cleanedPath}`;
            },
          });

        // audio
        chain.module
          .rule("assets")
          .oneOf("audio")
          .type("asset/resource")
          .test(/\.(mp3|wav|ogg)$/)
          .set("generator", {
            // filename: "common/image/[path][name][ext]", // 하위 경로 유지
            filename: (pathData: { filename: string }) => {
              const relPath = pathData.filename ?? "";
              /*
              if (pathData.filename.includes("common/")) {
                const cleanedPath = relPath.replace(/^src[\\/]/, "");
                // console.log(relPath);
                // console.log(cleanedPath);
                return `${cleanedPath}`;
              }
              */
              const cleanedPath = `audio/` + pathData.filename.split("audio/")[1];
              // console.log(relPath);
              // console.log(cleanedPath);
              return `${cleanedPath}`;
            },
          });
      },
    },
    performance: {
      removeConsole: true,
      printFileSize: false,
    },
  };
});
