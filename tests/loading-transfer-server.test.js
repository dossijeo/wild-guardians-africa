import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {loadingQaAssetPath,loadingQaAssetFailure,rewriteLoadingQaAssetUrl} from '../tools/experiments/loading-transfer-server.mjs';
test('QA asset routing rejects traversal and preserves unchanged original asset paths',()=>{
 const root=path.resolve('public');assert.equal(loadingQaAssetPath(root,'/__qa_assets/group/assets/%2e%2e/%2e%2e/private.key'),null);assert.equal(loadingQaAssetPath(root,'/normal/assets/a.glb'),null);
 const slow=loadingQaAssetPath(root,'/__qa_assets/slow-a/assets/web/a.glb');assert.equal(slow.file,path.join(root,'assets','web','a.glb'));assert.equal(slow.slow,true);
});
test('QA rewrite requires the precise native alias and never changes production files',()=>{
 const source='return new URL(variants.get(path)??path,base).href;',result=rewriteLoadingQaAssetUrl(source);assert.match(result,/qa-transfer-scope/);assert.match(result,/partial-/);assert.match(result,/glb\|hdr/);assert.throws(()=>rewriteLoadingQaAssetUrl('unknown implementation'),/refusing/);
});


test('menu and selector documents retain their native URLs rather than falling through to a recursive app index',()=>{const rewrite=new Function('variants','path','base','location',rewriteLoadingQaAssetUrl('return new URL(variants.get(path)??path,base).href;')),base='http://localhost:5293/',location={search:'?qa-transfer-scope=menu-test'};for(const document of ['menu/index.html','selector/index.html','library/index.html'])assert.equal(rewrite(new Map(),document,base,location),base+document);assert.equal(rewrite(new Map(),'assets/maize.glb',base,location),base+'__qa_assets/menu-test/assets/maize.glb');assert.equal(rewrite(new Map(),'content/models.json',base,location),base+'__qa_assets/menu-test/content/models.json');});


test('scoped failure affects only the requested Sabana biome JSON and leaves slow/ordinary asset bodies unchanged',()=>{const root=path.resolve('public');assert.equal(loadingQaAssetFailure(loadingQaAssetPath(root,'/__qa_assets/fail-menu/content/biome-savanna.json')),true);for(const url of ['/__qa_assets/menu/content/biome-savanna.json','/__qa_assets/slow-menu/content/biome-savanna.json','/__qa_assets/fail-menu/content/models.json','/__qa_assets/fail-menu/assets/a.glb'])assert.equal(loadingQaAssetFailure(loadingQaAssetPath(root,url)),false);assert.equal(loadingQaAssetFailure(null),false);});
