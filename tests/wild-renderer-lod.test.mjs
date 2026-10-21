import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nativeLodBins} from '../src/rendering/lod-source.js';
const load=async()=> (await WebAssembly.instantiate(await readFile(new URL('../src/rendering/wild-renderer/core.wasm',import.meta.url)),{wasi_snapshot_preview1:{proc_exit(){throw Error('exit')}}})).instance.exports;
test('native LOD preserves original bins, stable order, quality and distance boundaries',async()=>{
 const w=await load(),n=2048,ptr=w.malloc(n*32+24+n*12+12),records=new Float64Array(w.memory.buffer,ptr,n*4),rp=ptr+n*32,ip=rp+24,cp=ip+n*12;
 const ranges=new Float64Array(w.memory.buffer,rp,3),indices=new Uint32Array(w.memory.buffer,ip,n*3),counts=new Uint32Array(w.memory.buffer,cp,3);
 let checked=0;
 try{for(const role of ['formation','prop'])for(const group of [0,1,2,3,4,5])for(const quality of ['muy_baja','baja','media','alta'])for(const levels of [1,2,3]){
  const prototype={role,size:[3,5,2],centerY:1.25},q=quality==='alta'?1.25:['muy_baja','baja'].includes(quality)?.8:1;
  const thresholds=role==='formation'?[50,105,10000]:group===2?[10,25,64]:group===1?[16,38,95]:group===4?[17,42,110]:group===0?[38,85,10000]:group===5?[35,75,10000]:[24,55,160];
  ranges.set(thresholds.map(x=>x*q));
  const instances=Array.from({length:n},(_,i)=>({x:(i*97%701)-350,y:i%9,z:(i*43%607)-300,sx:1+(i%5)*.2,sy:.8+(i%3)*.3,sz:.7+(i%7)*.1}));
  // Axis-aligned exact thresholds and both sides, with nonzero visual radius.
  for(let k=0;k<9;k++){const p=instances[k];p.sx=p.sy=p.sz=1;p.x=ranges[Math.floor(k/3)]+.75+[-1e-8,0,1e-8][k%3];p.y=-prototype.centerY;p.z=0;}
  instances.forEach((p,i)=>records.set([p.x,p.y+prototype.centerY*p.sy,p.z,Math.max(3*p.sx,2*p.sz)*.25],i*4));
  for(const eye of [[0,0,0],[12,8,-5],[200,35,180]]){
   w.wr_lod(ptr,n,...eye,rp,levels,ip,cp);
   const actual=Array.from({length:3},(_,l)=>Array.from(indices.subarray(l*n,l*n+counts[l])));
   assert.deepEqual(actual,nativeLodBins(instances,prototype,group,eye,quality,levels));checked++;
  }
 }
 assert.equal(checked,432);
 w.wr_lod(ptr,0,0,0,0,rp,3,ip,cp);assert.deepEqual(Array.from(counts),[0,0,0]);
 }finally{w.free(ptr);}
});
