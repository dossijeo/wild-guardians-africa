import fs from 'node:fs';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
const root='docs/qa/residual-spikes-20261027/chunk-water-runtime-validation';
const summary={scope:'Functional runtime checks, not performance acceptance or interruption coverage',runs:{}};
for(const mode of ['quality','context']){
 const file=`${root}/${mode}/report.json`,raw=fs.readFileSync(file),report=JSON.parse(raw),r=report.result;
 assert(r.chunkWaterBed.calls>0);
 const warnings=report.errors.filter(x=>x.startsWith('THREE.WebGLProgram: Program Info Log:')&&x.includes('warning X4000:'));
 const other=report.errors.filter(x=>!warnings.includes(x));assert.deepEqual(other,[]);
 const row={candidate:r.chunkWaterBed,shaderWarningMessages:warnings.length,otherErrors:other};
 if(mode==='quality'){
  const q=r.qualityCycle;assert.deepEqual(q.rows.map(x=>x.quality),['baja','media','baja']);
  assert.equal(q.active.advancingFrames,240);assert.equal(q.active.pausedFrames,0);assert.equal(q.active.stream.failed,0);
  row.transitions=q.rows.map(x=>({quality:x.quality,transitionWallMs:x.transitionMs,chunkWaitMs:x.completionPhases.chunkWaitMs,drawCalls:x.drawCalls,maxObservedFrameMs:Math.max(...x.frameTimes)}));row.active=q.active;
 }else{assert.equal(r.contextRestore.worldUnchanged,true);assert(r.contextRestore.drawCalls>0);assert.equal(r.contextRestore.backend,'pthreads');row.restore=r.contextRestore;}
 summary.runs[mode]=row;
 fs.writeFileSync(file+'.gz',gzipSync(raw));
 const log=`${root}/${mode}/execution.log`;fs.writeFileSync(log+'.gz',gzipSync(fs.readFileSync(log)));
}
fs.writeFileSync(root+'/summary.json',JSON.stringify(summary,null,2)+'\n');
// Preserve the exact pre-existing, locally modified harness without staging it.
fs.writeFileSync(root+'/canonical-harness.mjs.gz',gzipSync(fs.readFileSync('tools/experiments/check-spatial-thread-game.mjs')));
console.log(JSON.stringify(summary,null,2));
