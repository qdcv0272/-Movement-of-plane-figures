import path from "node:path";
import fs from "fs-extra";
import { fileURLToPath } from "node:url";
import { createRsbuild } from "@rsbuild/core";
import { glob } from "glob";
import { rimraf } from "rimraf";
import { type Props, createConfig } from "./rsbuild.config.build-list";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// 환경 또는 인자에서 모듈 타입 가져오기
const moduleName = process.argv[2] || "list.ts";

console.log("module name :: ", moduleName);

async function buildAll() {
  try {
    const modulePath = `./${moduleName}`;
    console.log("importing module from:", modulePath);

    const module = await import(modulePath);
    const list = module.default || module.list || module;

    for (const item of list) {
      console.log(`Building ${item}...`);
      const root = path.resolve(__dirname, `../src/${item}`);
      const urls = await glob(`${root}/**/ts`);

      console.log(urls);
      console.log("***************************************************");
      console.log(`\n activity ${urls.length}개 \n`);
      console.log("***************************************************");

      for (let i = 0, len = urls.length; i < len; i++) {
        console.log("i :: ", i);
        if (i === 0) {
          const output = path.resolve(__dirname, `../dist/${item}`);
          console.log("삭제 :: ", output);
          await rimraf(`${output}/*`, {
            glob: true,
          });

          /*
          // 1. 파일 1개 복사
          await fs
            .copy(path.join(__dirname, `../src/${item}/${item}.json`), path.join(__dirname, `../dist/${item}/${item}.json`), {
            })
            .then(() => {
              console.log("복사 완료!");
            })
            .catch((err) => {
              console.log("EEEEEEEEEEEEEEEEE");
              console.error(err);
            });
          */

          // 2. glob 활용 전체 복사
          // const jsonUrls = await glob(`${root}/**/${item}.json`);
          const jsonUrls = await glob(`${root}/**/*.json`);
          for (const url of jsonUrls) {
            const distUrl = url.replace("src", "dist");
            await fs
              .copy(path.join(__dirname, `../${url}`), path.join(__dirname, `../${distUrl}`), {})
              .then(() => {
                console.log("복사 :: ", distUrl);
              })
              .catch((err) => {});
          }
        }

        const props: Props = {
          root: "",
          target: "",
          fileName: "",
          envMode: "",
          entry: {},
          template: {},
        };

        const url = urls[i];
        const entries = await glob(`${url}/*.ts`);
        console.log("entries :: ", entries);

        for (const entry of entries) {
          const splits = entry.replace(/\\/g, "/").split("/");
          const file = splits[splits.length - 1];
          // const fileName = file.split(".")[0];
          // if (file && file?.indexOf(".ts") > -1) splits.pop();
          props.root = splits.slice(0, splits.length - 2).join("/");

          const srcIndex = splits.lastIndexOf("src");
          if (srcIndex > -1) {
            props.target = splits.slice(srcIndex + 1, splits.length - 2).join("/");
          } else {
            props.target = splits.slice(1, splits.length - 2).join("/");
          }
          // const fileName = props.target.split("/").pop() || "index";
          const fileName = !file ? "index" : file.split(".")[0];
          props.fileName = fileName;
          props.envMode = "opr";
          props.entry[fileName] = splits.join("/");
          props.template[fileName] = `${splits.slice(0, splits.length - 2).join("/")}/${fileName}.html`;
        }
        console.log("props :: ", props);

        const config = createConfig(props);
        const rsbuild = await createRsbuild({
          cwd: process.cwd(),
          rsbuildConfig: config,
        });

        try {
          await rsbuild.build();
          console.log(`Successfully built ${props.target}`);
        } catch (error) {
          console.error(`Failed to build ${props.target}:`, error);
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Build process failed:", error);
    process.exit(1);
  }
}

buildAll().catch((err) => {
  console.error("Build process failed:", err);
  process.exit(1);
});
