import path from "node:path";
import fs from "fs-extra";
import { fileURLToPath } from "node:url";
import type { RsbuildConfig } from "@rsbuild/core";

export type Props = {
  root: string;
  target: string;
  fileName: string;
  envMode: string;
  entry: { [name: string]: string };
  template: { [name: string]: string };
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const createConfig = (props: Props): RsbuildConfig => {
  const { root, target, fileName, entry, template } = props;

  const dPath = `../dist/${target}`;
  const rootDist = path.resolve(__dirname, dPath);

  return {
    source: {
      entry,
    },
    html: {
      template({ entryName }) {
        return template[entryName];
      },
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
      cleanDistPath: false,
      assetPrefix: "auto",
      dataUriLimit: 0,
      distPath: {
        root: rootDist,
        js: "js",
        css: "css",
        image: "common/image",
        media: "common/audio",
      },
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
          globOptions: {
            ignore: ["*.blend", "*.blend1"],
          },
        },
        {
          from: `${root}/js/lib`,
          to: "js/lib",
          noErrorOnMissing: true,
        },
      ],
    },
    tools: {
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
              if (!exists) console.log(`📁 File check: ${exists ? "✅ EXISTS" : "❌ NOT FOUND"} - ${url} - ${fullPath}`);
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
              /*
              if (pathData.filename.includes("common/")) {
                const cleanedPath = relPath.replace(/^src[\\/]/, "");
                // console.log(relPath);
                // console.log(cleanedPath);
                return `${cleanedPath}`;
              }
              */
              const cleanedPath = `images/` + pathData.filename.split("images/")[1];
              // console.log(relPath);
              // console.log(cleanedPath);
              return `${cleanedPath}`;
            },
          });

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

        // chain.module
        //   .rule("asset")
        //   .oneOf("video")
        //   .test(/\.(mp4|webm)$/)
        //   .type("asset/resource")
        //   .set("generator", {
        //     filename: (pathData: { filename: string }) => {
        //       // 원본 폴더 구조를 유지하면서 dist 폴더로 복사
        //       const srcPath = pathData.filename.split("video/")[1];
        //       return `media/video/${srcPath}` || "media/video/[name][ext]";
        //     },
        //   });

        chain.module
          .rule("asset")
          .oneOf("font")
          .test(/\.(woff2?|otf|ttf|eot)$/)
          .type("asset/resource")
          .set("generator", {
            filename: "font/[name][ext]",
          });
      },
    },
    performance: {
      removeConsole: true,
      printFileSize: false,
      // chunkSplit: {
      //   strategy: "single-vendor",
      // },
    },
  };
};

export { createConfig };

