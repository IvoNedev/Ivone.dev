import { build } from "esbuild";
import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = path.join(root, "dist", "browser");
const publicDirectory = path.resolve(root, "..", "Ivone.dev", "wwwroot", "animation-parser");
await rm(path.join(root, "dist"), { recursive: true, force: true });
await mkdir(browser, { recursive: true });

await build({
  entryPoints: [path.join(root, "src", "index.ts")],
  outfile: path.join(browser, "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: true
});
await build({
  entryPoints: [path.join(root, "src", "worker.ts")],
  outfile: path.join(browser, "worker.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: true
});
await build({
  entryPoints: [path.join(root, "src", "index.ts")],
  outfile: path.join(root, "dist", "node.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node20"],
  sourcemap: true
});

for (const directory of ["models", "schema"]) {
  await cp(path.join(root, directory), path.join(browser, directory), { recursive: true });
}
const ortDist = path.join(root, "node_modules", "onnxruntime-web", "dist");
for (const filename of [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm"
]) {
  await copyFile(path.join(ortDist, filename), path.join(browser, filename));
}
await copyFile(path.join(root, "semantic-defaults.json"), path.join(browser, "semantic-defaults.json"));
const cacheVersion = "ivone-animation-parser-1.0.2";
const cachedAssets = [
  "./index.js", "./worker.js", "./models/intent-classifier.int8.onnx",
  "./models/tokenizer.json", "./models/model-config.json",
  "./schema/animation-ir.schema.json", "./semantic-defaults.json",
  "./ort-wasm-simd-threaded.mjs"
];
await writeFile(path.join(browser, "sw.js"), `
const CACHE = ${JSON.stringify(cacheVersion)};
const ASSETS = ${JSON.stringify(cachedAssets)};
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
`, "utf8");
await rm(publicDirectory, { recursive: true, force: true });
await cp(browser, publicDirectory, { recursive: true });
console.log(JSON.stringify({ browser, publicDirectory }));
