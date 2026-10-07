import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as candidate from '../src/simulation/crops.js';
import {BALANCE} from '../src/simulation/balance.js';

assert.ok(process.argv[2], 'Pass frozen crops.js reference');
assert.ok(process.argv[3], 'Pass output JSON');
const source=readFileSync(resolve(process.argv[2]),'utf8');
const reference=await import('data:text/javascript;base64,'+Buffer.from(source.replace("'./rules.js'",JSON.stringify(pathToFileURL(resolve('src/simulation/rules.js')).href))).toString('base64'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const median=values=>[...values].sort((a,b)=>a-b)[values.length>>1];
const report={scope:'Isolated CPU growth update; exact full plant state comparisons. No rendering, FPS, RAM, navigation or whole-game speed claim.',referenceSha256:hash(source),candidateSha256:hash(readFileSync(new URL('../src/simulation/crops.js',import.meta.url))),cases:[]};
let comparisons=0;
for(const spec of BALANCE.crops)for(let scenario=0;scenario<4;scenario++){
 let a=reference.createPlant('reference',spec.id,0,0,'center'),b=candidate.createPlant('reference',spec.id,0,0,'center');
 for(let step=0;step<300;step++){
  if(step%17===0){reference.waterPlant(a,scenario===3);candidate.waterPlant(b,scenario===3);}
  if(step%29===0){a.toleranceBonus=b.toleranceBonus=.3;a.nextTolerancePenalty=b.nextTolerancePenalty=.5;}
  const seconds=[.1,1,17,spec.growth_seconds*2][(step+scenario)%4],magic=scenario>1&&step%3!==0;
  reference.advancePlant(a,seconds,magic);candidate.advancePlant(b,seconds,magic);
  assert.deepEqual(b,a,`${spec.id} scenario ${scenario} step ${step}`);comparisons++;
  if(step%31===0){a=JSON.parse(JSON.stringify(a));b=JSON.parse(JSON.stringify(b));}
 }
}
report.checkpointComparisons=comparisons;
for(const mode of ['growing','tolerance','magic','mature','initial']){
 const original=Array.from({length:1200},(_,i)=>{
  const spec=BALANCE.crops[i%BALANCE.crops.length],p=candidate.createPlant('plant-'+i,spec.id,i%40,Math.floor(i/40),'center');
  if(mode!=='initial')candidate.waterPlant(p);
  if(mode==='mature'){for(const w of p.water)w.status='manual';p.growth=spec.growth_seconds;}
  if(mode==='tolerance'&&p.water[1]){p.growth=p.water[1].at;p.water[1].status='due';p.water[1].wait=spec.derived_tolerance_seconds*.5;}
  p.toleranceBonus=i%3*.1;if(i%4===0)p.nextTolerancePenalty=.5;
  return p;
 });
 const times={reference:[],candidate:[]};let finalHash;
 for(let sample=0;sample<120;sample++){
  const states={reference:structuredClone(original),candidate:structuredClone(original)};
  for(const name of sample%2?['candidate','reference']:['reference','candidate']){
   const module=name==='reference'?reference:candidate,start=performance.now();
   for(let step=0;step<10;step++)for(const plant of states[name])module.advancePlant(plant,.1,mode==='magic');
   if(sample>=20)times[name].push(performance.now()-start);
  }
  assert.deepEqual(states.candidate,states.reference,mode+' sample '+sample);
  finalHash=hash(JSON.stringify(states.candidate));
 }
 const row={mode,plants:original.length,steps:10,samples:100,referenceMedianMs:median(times.reference),candidateMedianMs:median(times.candidate),finalHash,times};
 report.cases.push(row);writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...row,times:undefined}));
}
