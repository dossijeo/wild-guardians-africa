import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {publicText,UNUSED_WORKER_LAB_MODELS} from '../tools/web-package.mjs';
import {assetUrl} from '../src/rendering/asset-url.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/web-assets.json',import.meta.url)));
test('all original GLBs resolve to one distinct runtime variant',()=>{
 const originals=readdirSync(new URL('../public/assets/',import.meta.url)).filter(name=>name.endsWith('.glb')).map(name=>'assets/'+name).sort();
 assert.deepEqual(manifest.records.map(r=>r.source).sort(),originals);
 assert.equal(new Set(manifest.records.map(r=>r.source)).size,originals.length);
 assert.equal(new Set(manifest.records.map(r=>r.runtime)).size,originals.length);
 for(const item of manifest.records){assert.equal(assetUrl('/'+item.source),'/'+item.runtime);assert(item.afterBytes<item.beforeBytes);}
});
test('native pages, injected scripts, JSON and stylesheets use their actual resolution context',()=>{
 assert.equal(publicText('<img src="/assets/x.webp"><iframe src="/selector/index.html">','menu/index.html',manifest),'<img src="../assets/x.webp"><iframe src="../selector/index.html">');
 assert.equal(publicText('fetch("/library/x.json")','library/worker/script.js',manifest),'fetch("library/x.json")');
 assert.equal(publicText('{"url":"/assets/x.webp"}','content/models.json',manifest),'{"url":"assets/x.webp"}');
 assert.equal(publicText('url(/assets/font.woff2)','content/hud.css',manifest),'url(../assets/font.woff2)');
 assert.equal(publicText('url(/assets/font.woff2)','content/ui/fonts/type.css',manifest),'url(../../../assets/font.woff2)');
 assert.equal(publicText('<script src="../../assets/chunk.js">','tests/browser/qa.html',manifest),'<script src="../../assets/chunk.js">');
 assert.equal(publicText('<script src="./assets/chunk.js">','index.html',manifest),'<script src="./assets/chunk.js">');
});
test('native menu and library receive local decoding before their original parsers',()=>{
 const menu=publicText(readFileSync(new URL('../public/menu/index.html',import.meta.url),'utf8'),'menu/index.html',manifest);
 assert(menu.includes("from '../runtime/glb-legacy.js'"));assert(menu.includes('window.decodeWebGlb=decodeWebGlb'));
 const loader=publicText(readFileSync(new URL('../public/library.html',import.meta.url),'utf8'),'library.html',manifest);
 assert(loader.includes('decodeWebGlb(result)'));assert(!loader.includes("fetch('/"));
});
test('unlinked worker lab models are omitted without removing gameplay worker rigs',()=>{
 const workers=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url)));
 for(const worker of Object.values(workers))assert(!UNUSED_WORKER_LAB_MODELS.has(worker.url.slice(1)));
 const original=readFileSync(new URL('../public/content/models.json',import.meta.url),'utf8');
 const packaged=JSON.parse(publicText(original,'content/models.json',manifest));
 assert.equal(packaged.length,JSON.parse(original).length-UNUSED_WORKER_LAB_MODELS.size);
 for(const model of packaged)assert(![...UNUSED_WORKER_LAB_MODELS].some(source=>model.url.includes(source)));
});
