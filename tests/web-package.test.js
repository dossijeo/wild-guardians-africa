import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicText} from '../tools/web-package.mjs';
import {assetUrl} from '../src/rendering/asset-url.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/web-assets.json',import.meta.url)));
test('all twenty original GLBs resolve to one distinct runtime variant',()=>{
 assert.equal(manifest.records.length,20);assert.equal(new Set(manifest.records.map(r=>r.runtime)).size,20);
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
