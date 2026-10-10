import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {publicText} from '../tools/web-package.mjs';
import {assetUrl} from '../src/rendering/asset-url.js';
import {cropRuntimeDescriptor,runtimeGeometryManifest} from '../src/rendering/crop-runtime.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/web-assets.json',import.meta.url)));
test('authored GLBs remain archived while crop URLs resolve to explicit published collections',()=>{
 const originals=readdirSync(new URL('../public/assets/',import.meta.url)).filter(name=>name.endsWith('.glb')).map(name=>'assets/'+name).sort();
 assert.deepEqual(manifest.records.map(r=>r.source).sort(),originals);
 assert.equal(new Set(manifest.records.map(r=>r.source)).size,originals.length);
 assert.equal(new Set(manifest.records.map(r=>r.runtime)).size,originals.length);
 for(const item of manifest.records){const retired=cropRuntimeDescriptor.replaced.find(row=>row.source===item.source);assert.equal(assetUrl('/'+item.source),retired?cropRuntimeDescriptor.collections[retired.kind]:'/'+item.runtime);assert(item.afterBytes<item.beforeBytes);}
 const runtime=runtimeGeometryManifest(manifest);assert.equal(runtime.records.length,24);assert.equal(runtime.records.filter(row=>row.partition).length,4);
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

test('published wall diagnostic guard rejects explicit selection without changing normal OFF',async()=>{
 const path=new URL('../src/rendering/wall-buffer-package.js',import.meta.url);
 const source=readFileSync(path,'utf8').replace('../../content/manifests/wall-buffer-package.json',new URL('../content/manifests/wall-buffer-package.json',import.meta.url).href).replace('./asset-fetch.js',new URL('../src/rendering/asset-fetch.js',import.meta.url).href).replace('import.meta.env?.PROD','true');
 const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 assert.equal(module.wallBufferPackageEnabled({}),false);
 assert.equal(module.wallBufferPackageEnabled({__desktopSmokeStarted:true,__desktopSmokeWallBufferPackage:false}),false);
 assert.throws(()=>module.wallBufferPackageEnabled({__desktopSmokeStarted:true,__desktopSmokeWallBufferPackage:true}),/archived source\/dev diagnostic/);
});
