// CPU-only ABBA comparison. The untouched extracted lab remains the reference.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resample} from '../src/world/wall-layout-native.js';
import {resampleWallStroke} from '../src/world/wall-stroke-sampling.js';
import {wallStroke} from '../src/world/wall-layout.js';
const current=readFileSync(new URL('../src/world/wall-layout.js',import.meta.url),'utf8');
// Reuse precisely the same full wrapper, substituting only its sampler.
const referenceSource=current
 .replace("from './wall-layout-native.js'",`from '${new URL('../src/world/wall-layout-native.js',import.meta.url).href}'`)
 .replace("import {resampleWallStroke as resample,simplifyWallStroke as simplify} from './wall-stroke-sampling.js';",`import {resample,simplify} from '${new URL('../src/world/wall-layout-native.js',import.meta.url).href}';`);
const reference=await import('data:text/javascript;base64,'+Buffer.from(referenceSource).toString('base64'));
const count=3000,iterations=180;
let seed=712;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const paths={
 short:[[0,0],[4,3],[8,4],[12,8]],
 dense:Array.from({length:count},(_,i)=>[i*.08,Math.sin(i*.02)*8]),
 jagged:Array.from({length:count},(_,i)=>[i*.07,(random()-.5)*2]),
};
const summaries=[];
for(const [name,points] of Object.entries(paths))for(const scope of ['sampler','full-stroke']){
 const functions=scope==='sampler'?[resample,resampleWallStroke]:[p=>reference.wallStroke(p,[]),p=>wallStroke(p,[])];
 const expected=JSON.stringify(functions[0](points));assert.equal(JSON.stringify(functions[1](points)),expected);
 const runs=[];
 for(const mode of [0,1,1,0]){
  const fn=functions[mode];for(let i=0;i<30;i++)fn(points);
  const samples=[];for(let i=0;i<iterations;i++){const start=performance.now();fn(points);samples.push(performance.now()-start);}
  const ordered=samples.toSorted((a,b)=>a-b);
  runs.push({mode:mode?'one-pass':'native',cpuMeanMs:samples.reduce((a,b)=>a+b,0)/samples.length,cpuP50Ms:ordered[Math.floor(iterations*.5)],cpuP95Ms:ordered[Math.ceil(iterations*.95)-1],samples});
 }
 summaries.push({name,scope,points:points.length,slots:functions[0](points).length,presentationSha256:createHash('sha256').update(expected).digest('hex'),runs});
}
console.log(JSON.stringify({scope:'CPU geometry sampling only; no GPU or physical touch measurement',count,iterations,summaries},null,2));
