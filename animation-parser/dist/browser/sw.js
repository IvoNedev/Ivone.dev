
const CACHE = "ivone-animation-parser-1.0.1";
const ASSETS = ["./index.js","./worker.js","./models/intent-classifier.int8.onnx","./models/tokenizer.json","./models/model-config.json","./schema/animation-ir.schema.json","./semantic-defaults.json","./ort-wasm-simd-threaded.asyncify.mjs","./ort-wasm-simd-threaded.asyncify.wasm","./ort-wasm-simd-threaded.jsep.mjs","./ort-wasm-simd-threaded.jsep.wasm"];
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
