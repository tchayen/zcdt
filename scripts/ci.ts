import fs from "node:fs";
import path from "node:path";
import core from "@actions/core";
import toolCache from "@actions/tool-cache";
import exec from "@actions/exec";

const zigVersion = "0.14.0";
const extension = "tar.xz";
const fileName = `zig-linux-x86_64-${zigVersion}`;
const downloadUrl = `https://ziglang.org/download/${zigVersion}/${fileName}.${extension}`;

async function installFromCacheOrDownloadZig() {
  try {
    let zigPath = toolCache.find("zig", zigVersion);
    if (!zigPath) {
      core.info("Zig not found in cache. Downloading…");
      core.info("Fetching zig-linux-x86_64-0.14.0.");
      const file = await fetch(downloadUrl);
      const buffer = await file.arrayBuffer();
      fs.writeFileSync(fileName, Buffer.from(buffer));

      core.info(`Extracting ${fileName}`);
      const extract = await toolCache.extractTar(fileName, undefined, "xJ");
      core.info(`Extracted ${extract}`);

      zigPath = await toolCache.cacheDir(
        path.join(extract, fileName),
        "zig",
        zigVersion,
      );
    } else {
      core.info("Zig found in cache.");
    }

    core.addPath(zigPath);
    // Direct Zig to use the global cache as every local cache, so that we get maximum benefit from the caching below.
    core.exportVariable("ZIG_LOCAL_CACHE_DIR", await getZigCachePath());

    core.info(`Zig path: ${zigPath}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getZigCachePath() {
  let env_output = "";
  await exec.exec("zig", ["env"], {
    listeners: {
      stdout: (data) => {
        env_output += data.toString();
      },
    },
  });
  return JSON.parse(env_output)["global_cache_dir"];
}

await installFromCacheOrDownloadZig();
await exec.exec("zig", ["build", "install", "wasm", "--prefix", "web"]);

const size = fs.statSync("web/bin/lib.wasm").size;
core.info(`Size of web/bin/lib.wasm: ${size} bytes`);
