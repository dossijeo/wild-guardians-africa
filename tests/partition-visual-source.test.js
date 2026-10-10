import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {undoVisualQa,rustGuard} from './fixtures/partition-visual-normalizer.mjs';
test('QA overlay preserves complete production sources except exact capture and CLI guard hunks',()=>{
 const baseline=JSON.parse(readFileSync('tests/fixtures/partition-visual-production-baseline.json','utf8'));
 for(const row of baseline.rows)assert.equal(createHash('sha256').update(undoVisualQa(row.path,readFileSync(row.path,'utf8'))).digest('hex'),row.sha256,row.path);
});
test('native visual plant guards remain nested report/main/visual/plant without timing or recipe flags',()=>{
 const rust=readFileSync('src-tauri/src/main.rs','utf8').replaceAll('\r\n','\n');assert.ok(rust.includes(rustGuard));
 assert.match(rust,/PageLoadEvent::Finished[\s\S]*--smoke-report[\s\S]*webview.label\(\) == "main"[\s\S]*--smoke-visual"[\s\S]*--smoke-visual-plant"[\s\S]*--smoke-visual-plant-progress65/);
 for(const flag of ['--smoke-crop-pair-overlap','--smoke-loading-trace','--smoke-biome','--smoke-culture'])assert.ok(!rust.includes(flag));
 const app=readFileSync('src/app/main.js','utf8');assert.ok(app.includes('globalThis.__desktopSmokeVisualCapture===true?installLoadingVisualQa(owner,diorama):null'));
});
