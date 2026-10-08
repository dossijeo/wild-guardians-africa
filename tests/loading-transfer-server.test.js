import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {loadingQaAssetPath,rewriteLoadingQaAssetUrl} from '../tools/experiments/loading-transfer-server.mjs';
test('QA asset routing rejects traversal and preserves unchanged original asset paths',()=>{
 const root=path.resolve('public');assert.equal(loadingQaAssetPath(root,'/__qa_assets/group/assets/%2e%2e/%2e%2e/private.key'),null);assert.equal(loadingQaAssetPath(root,'/normal/assets/a.glb'),null);
 const slow=loadingQaAssetPath(root,'/__qa_assets/slow-a/assets/web/a.glb');assert.equal(slow.file,path.join(root,'assets','web','a.glb'));assert.equal(slow.slow,true);
});
test('QA rewrite requires the precise native alias and never changes production files',()=>{
 const source='return new URL(variants.get(path)??path,base).href;',result=rewriteLoadingQaAssetUrl(source);assert.match(result,/qa-transfer-scope/);assert.match(result,/partial-/);assert.match(result,/glb\|hdr/);assert.throws(()=>rewriteLoadingQaAssetUrl('unknown implementation'),/refusing/);
});
