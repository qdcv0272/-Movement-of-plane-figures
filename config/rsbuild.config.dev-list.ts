import { defineConfig } from "@rsbuild/core";
import path from "path";
import fs from "fs-extra";
import { sync as globSync } from "glob";
import serveIndex from "serve-index";
import { activities } from "./dev-list";

// 상위 폴더 아래의 activity 폴더 자동 탐색
function getActivityFolders(baseDir: string): string[] {
  // src/01_math_activity/*/ts/*.ts 형태의 파일을 모두 찾음
  const matches = globSync(`src/${baseDir}/*/ts/*.ts`);
  // matches: ['src/01_math_activity/_sample_01/ts/index.ts', ...]
  // activity 폴더 경로 추출: src/01_math_activity/_sample_01
  const folders = new Set(matches.map((file) => file.replace(/\\/g, "/").split("/ts/")[0]));
  // src/01_math_activity/_sample_01 → 01_math_activity/_sample_01
  return Array.from(folders).map((f) => f.replace(/^src\//, "").replace(/^src\//, ""));
}

const allActivityFolders = activities.flatMap(getActivityFolders);

function getTsEntries(activityPath: string) {
  const tsDir = path.resolve(__dirname, `../src/${activityPath}/ts`);
  if (!fs.existsSync(tsDir)) return [];
  return fs
    .readdirSync(tsDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => {
      const baseName = file.replace(/\.ts$/, "");
      return {
        entryName: `${activityPath}/${baseName}`,
        entryPath: path.join(tsDir, file),
        htmlPath: path.resolve(__dirname, `../src/${activityPath}/${baseName}.html`),
        fontcssPath: path.resolve(__dirname, `../src/${activityPath}/css/font.css`),
        activityPath,
      };
    });
}

const entries: Record<string, string> = {};
const templateMap: Record<string, string> = {};
const copyList: any[] = [];

allActivityFolders.forEach((activity) => {
  const tsEntries = getTsEntries(activity);
  tsEntries.forEach(({ entryName, entryPath, htmlPath, activityPath, fontcssPath }) => {
    entries[entryName] = entryPath;
    templateMap[entryName] = htmlPath;
    // 각 activity별 cc, images, audio 폴더 복사
    const srcRoot = path.resolve(__dirname, `../src/${activityPath}`);
    copyList.push(
      {
        from: path.join(srcRoot, "cc"),
        to: `${activityPath}/cc`,
        noErrorOnMissing: true,
        globOptions: { ignore: ["*.fla", "*.html"] },
      },
      {
        from: path.join(srcRoot, "images"),
        to: `${activityPath}/images`,
        noErrorOnMissing: true,
      },
      {
        from: path.join(srcRoot, "audio"),
        to: `${activityPath}/audio`,
        noErrorOnMissing: true,
      },
      {
        from: path.join(srcRoot, "font"),
        to: `${activityPath}/font`,
        noErrorOnMissing: true,
      },
      {
        from: path.join(srcRoot, "scenes"),
        to: `${activityPath}/scenes`,
        noErrorOnMissing: true,
      },
      {
        from: path.join(srcRoot, "js/lib"),
        to: `${activityPath}/js/lib`,
        noErrorOnMissing: true,
      }
    );
  });
});

// console.log(copyList);
// console.log(entries);

export default defineConfig(() => ({
  source: {
    entry: entries,
  },
  html: {
    template({ entryName }: { entryName: string }) {
      return templateMap[entryName];
    },
    inject: "body",
    templateParameters: {
      title: "content",
    },
  },
  output: {
    dataUriLimit: 0,
    distPath: {
      root: path.resolve(__dirname, "../dist"),
      js: "js",
      css: "css",
      image: "image",
      media: "audio",
    },
    filename: {
      js: "[name].js",
      css: "[name].css",
    },
    copy: copyList,
  },
  server: {
    port: 3001,
  },
  sourceMap: {
    js: true,
    css: true,
  },
  tools: {
    lightningcssLoader: false,
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
    bundlerChain: (chain: any) => {
      chain.optimization.splitChunks({
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      });
      chain.module
        .rule("assets")
        .oneOf("image")
        .type("asset/resource")
        .test(/\.(png|jpe?g|gif|svg|webp)$/i)
        .set("generator", {
          filename: (pathData: { filename: string }) => {
            // 1. dev, build 용
            // const cleanedPath = `images/` + pathData.filename.split("images/")[1];
            // return `${cleanedPath}`;
            //
            // 2. dev.list 용
            // activity가 같은 assets 경로를 사용할때 오류남. activity 경로를 포함한 고유한 경로 생성
            const activityPath = pathData.filename.split("/")[2]; // activity 폴더(ex : num_model) 추출
            return `images/${activityPath}/${pathData.filename.split("images/")[1]}`;
          },
        });
      chain.module
        .rule("assets")
        .oneOf("audio")
        .type("asset/resource")
        .test(/\.(mp3|wav|ogg)$/)
        .set("generator", {
          filename: (pathData: { filename: string }) => {
            // 1. dev, build 용
            // const cleanedPath = `audio/` + pathData.filename.split("audio/")[1];
            // return `${cleanedPath}`;
            //
            //
            // 2. dev.list 용
            // activity가 같은 assets 경로를 사용할때 오류남. activity 경로를 포함한 고유한 경로 생성
            const activityPath = pathData.filename.split("/")[2]; // activity 폴더(ex : num_model) 추출
            return `audio/${activityPath}/${pathData.filename.split("audio/")[1]}`;
          },
        });
      // 폰트 파일이 없어도 오류가 나지 않도록 하려면?
      chain.module
        .rule("asset")
        .oneOf("font")
        .test(/\.(woff2?|otf|ttf|eot)$/)
        .type("asset/resource")
        .set("generator", {
          // filename: "font/[name][ext]",
          filename: (pathData: { filename: string }) => {
            const cleanedPath = `font/` + pathData.filename.split("font/")[1];
            return `${cleanedPath}`;
          },
        });
    },
  },
  performance: {
    removeConsole: true,
    printFileSize: false,
  },
}));
