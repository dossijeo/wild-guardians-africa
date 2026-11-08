import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {grassMaskProbeCandidate} from './grass-mask-probe-candidate.mjs';

const source=await readFile('src/rendering/grass-tile-generation.js','utf8');
const candidate=grassMaskProbeCandidate(source).replaceAll("'../world/terrain.js'",JSON.stringify(pathToFileURL(process.cwd()+'/src/world/terrain.js').href)).replaceAll("'../world/footprints.js'",JSON.stringify(pathToFileURL(process.cwd()+'/src/world/footprints.js').href)).replaceAll("'./grass-terrain-sampling.js'",JSON.stringify(pathToFileURL(process.cwd()+'/src/rendering/grass-terrain-sampling.js').href));
const {generateGrassTile:original}=await import('../../src/rendering/grass-tile-generation.js');
const {generateGrassTile:changed}=await import('data:text/javascript;base64,'+Buffer.from(candidate).toString('base64'));
let seed=9123;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const chunks=Array.from({length:4},(_,n)=>({cx:n-2,cz:1-n,h:Float32Array.from({length:49*49},()=>random()*.1),mask:{data:Uint8Array.from({length:35*35*4},(_,i)=>i%4===0?Math.floor(140+random()*115):i%4===3?Math.floor(random()*65):Math.floor(random()*256))}}));
const blockers=new Map([['-12,0',[{x:-95,z:3,r:2}]],['0,-12',[{x:3,z:-95,r:2}]]]);
const run=(fn,mode)=>{let accepted=0,candidates=0,masked=0;for(const c of chunks)for(let tx=c.cx*6-3;tx<c.cx*6+3;tx++)for(let tz=c.cz*6-3;tz<c.cz*6+3;tz++){const stats={candidates:0,masked:0},output=fn(c,tx,tz,{spacing:mode.fern?.65:.4,seed:83,varied:!!mode.varied,river:mode.river,mangrove:mode.fern,fern:mode.fern,edgePadding:mode.fern?1:.6,blockers,nearWater:(_c,x,z)=>mode.water&&x+z>12,stats});accepted+=output.items.length;candidates+=stats.candidates;masked+=stats.masked;mode.record?.push(output,stats);}return {accepted,candidates,masked};};
for(const mode of [{river:false,fern:false},{river:true,fern:false},{river:false,fern:true},{river:false,fern:false,varied:true,water:true},{river:false,fern:true,varied:true,water:true}]){const a=[],b=[];assert.deepEqual(run(original,{...mode,record:a}),run(changed,{...mode,record:b}));assert.deepEqual(b,a);}
const measure=(fn,mode)=>{const start=performance.now();run(fn,mode);return performance.now()-start;};
const measurements=[];for(let i=0;i<2;i++){measure(original,{river:false,fern:false});measure(changed,{river:false,fern:false});}for(const [name,fern] of [['grass',false],['fern',true]])for(const variant of ['A','B','B','A'])measurements.push({name,variant,ms:measure(variant==='A'?original:changed,{river:false,fern})});
console.log(JSON.stringify({equivalent:true,chunks:chunks.length,measurements},null,2));
