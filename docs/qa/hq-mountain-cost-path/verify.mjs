import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url);
const receipt=JSON.parse(await fs.readFile(new URL('receipt.json',dir),'utf8'));
for(const [file,hash]of Object.entries(receipt.files)){
 let bytes=await fs.readFile(new URL(file.endsWith('.json')?file+'.gz':file,dir));
 if(file.endsWith('.json'))bytes=gunzipSync(bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,file);
}
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(new URL(name+'.json.gz',dir))));
const r=await read('fixed-abba'),before=await read('fixed-before'),after=await read('fixed-after');
assert.deepEqual(before.drawingBuffer,[1280,720]);assert.deepEqual(after.drawingBuffer,before.drawingBuffer);
assert.deepEqual(before.camera,after.camera);assert.deepEqual(r.errors,[]);assert.equal(r.unchangedState,true);
assert.deepEqual(r.blocks.map(b=>b.mode),['A','B','B','A']);
const common=r.blocks[0].start;
const q=(values,p)=>values.toSorted((a,b)=>a-b)[Math.floor((values.length-1)*p)];
const blockStats=[];
for(const b of r.blocks){
 assert.equal(b.cpu.length,120);assert.equal(b.raf.length,119);assert.equal(b.gpu.samples.length,120);
 assert.equal(b.gpu.supported,true);assert.equal(b.gpu.contextLost,false);
 for(const key of ['disjointEvents','discarded','overflowSkipped','foreignQuerySkipped','allocationFailures','unresolvedAtDispose','pending'])assert.equal(b.gpu[key],0,key);
 assert.equal(b.cameraUnchanged,true);assert.equal(b.stateUnchanged,true);assert.equal(b.glError,0);
 for(const key of ['camera','chunks','chunkRevision','geometry','legacyGeometry','rendererMemory','state']){
  assert.deepEqual(b.start[key],b.end[key],key);assert.deepEqual(b.start[key],common[key],key);
 }
 assert.deepEqual(b.start.render,b.end.render);assert.equal(b.start.render.calls,54);
 assert.equal(b.start.render.triangles,b.mode==='A'?685275:685243);
 const gpu=b.gpu.samples.map(v=>v.ms);assert.ok([...b.cpu,...b.raf,...gpu].every(v=>Number.isFinite(v)&&v>=0));
 blockStats.push({mode:b.mode,cpuMedianMs:q(b.cpu,.5),cpuP95Ms:q(b.cpu,.95),gpuMedianMs:q(gpu,.5),gpuP95Ms:q(gpu,.95),rafMedianMs:q(b.raf,.5)});
}
const arms=Object.fromEntries(['A','B'].map(mode=>{
 const blocks=r.blocks.filter(b=>b.mode===mode),gpu=blocks.flatMap(b=>b.gpu.samples.map(s=>s.ms)),cpu=blocks.flatMap(b=>b.cpu);
 return [mode,{samples:gpu.length,gpuMedianMs:q(gpu,.5),gpuP95Ms:q(gpu,.95),cpuMedianMs:q(cpu,.5),cpuP95Ms:q(cpu,.95)}];
}));
const path=await read('canyon-continuous');assert.equal(path.completed,true);assert.equal(path.unchangedState,true);assert.deepEqual(path.errors,[]);assert.equal(path.poses.length,161);
const eye=path.poses[0].camera;
assert.deepEqual(path.poses.at(-1).camera,eye);
const segments={};let maxHorizontalStep=0,maxVerticalStep=0;
for(const [i,p]of path.poses.entries()){
 assert.deepEqual(p.errors,[]);assert.equal(p.glError,0);assert.equal(p.anchor[1],2.36);assert.deepEqual(p.drawingBuffer,[1280,720]);
 assert.equal(p.yaw,0);assert.equal(p.phase,'day');assert.equal(p.arcStableAltitude,true);
 segments[p.segment]=(segments[p.segment]??0)+1;
 if(i){maxHorizontalStep=Math.max(maxHorizontalStep,Math.abs(p.camera[0]-path.poses[i-1].camera[0]));maxVerticalStep=Math.max(maxVerticalStep,Math.abs(p.camera[1]-path.poses[i-1].camera[1]));}
}
assert.ok(maxHorizontalStep<=.50000001&&maxVerticalStep<=.50000001);
assert.equal(Math.max(...path.poses.map(p=>p.camera[0]))-eye[0],20);
assert.equal(Math.max(...path.poses.map(p=>p.camera[1]))-eye[1],20);
console.log(JSON.stringify({blockStats,arms,path:{poses:161,segments,maxHorizontalStep,maxVerticalStep,anchorY:2.36,unchangedState:true}},null,2));
