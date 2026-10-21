import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const version=browser.version();await browser.close();
const files=['src/rendering/wild-renderer/core.cpp','src/rendering/wild-renderer/core.wasm','src/rendering/wild-renderer/adapter.js','src/rendering/wild-renderer/incremental.js','src/rendering/wild-renderer/event-lifecycle.js','src/rendering/wild-renderer/packed-props.cpp','src/rendering/wild-renderer/packed-props.js','src/rendering/wild-renderer/engine-packed.js','src/rendering/wild-renderer/engine-events.js','src/rendering/wild-renderer/suppression-events.js','tools/experiments/qa-wild-renderer-fixed-residency.js','tools/experiments/qa-wild-renderer-mutations.js','tools/experiments/qa-engine-packed-route.mjs','tools/experiments/qa-wild-renderer-route.mjs','tools/experiments/qa-wild-renderer-measure.js','tools/experiments/qa-wild-renderer-dense.js','tools/experiments/measure-wild-renderer.mjs'];
const hashes={};for(const file of files)hashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('docs/qa/wild-renderer/manifest.json',JSON.stringify({base:'451b9e9bf',branch:'codex/wild-renderer-wasm',date:new Date().toISOString(),node:process.version,chrome:version,playwright:JSON.parse(await readFile('node_modules/playwright/package.json')).version,platform:os.platform(),release:os.release(),cpu:os.cpus()[0].model,compiler:'Emscripten 6.0.12, -O3 -ffp-contract=off; see tools/build-wild-renderer.ps1',linearMemoryBytes:67108864,wasmBytes:(await readFile(files[1])).byteLength,hashes},null,2)+'\n');
