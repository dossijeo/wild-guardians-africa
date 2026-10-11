import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('incremental Canyon gate replay matches paid structures and distinguishes omitted-edge faces',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wild-guardians-gate-topology-'));
 try{
  const output=join(dir,'audit.json'),base='docs/qa/integrated-spiritual-survival/';
  const child=spawnSync(process.execPath,['tools/audit-native-contour-gate-faces.mjs',base+'funded-canyon-small-integrated-v6-state.json.gz',output,base+'native-paid-canyon-eight-crop-service-v2-state.json.gz',base+'funded-canyon-small-integrated-v6.json'],{encoding:'utf8',timeout:30000});
  assert.equal(child.status,0,child.stderr);
  const result=JSON.parse(readFileSync(output));
  assert.equal(result.stateUnchangedAfterNavigationSetup,true);
  assert.deepEqual(result.history.map(h=>h.pieces),[8,16,24,31]);
  assert.deepEqual(result.history.map(h=>h.gates.length),[0,0,0,2]);
  const final=result.history.at(-1);
  assert.equal(final.conversionGraph.facesWithMultipleGates.length,0);
  assert.equal(final.conversionGraph.faces.filter(f=>f.gateIds.length).length,2);
  const planted=final.conversionGraph.faces.filter(f=>f.cropIds.length);
  assert.equal(planted.length,1);assert.equal(planted[0].cropIds.length,8);assert.equal(planted[0].gateIds.length,1);
  // The second gate is explained by the omitted placement edges, rather than
  // silently treating both as members of the final crop enclosure.
  assert.equal(result.gates.filter(g=>g.faces.length===0).length,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
