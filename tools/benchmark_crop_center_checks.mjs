import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
import * as production from '../src/simulation/game.js';import {gunzipSync} from 'node:zlib';import {createPlant} from '../src/simulation/crops.js';import {BALANCE} from '../src/simulation/balance.js';
assert(process.argv[2]&&process.argv[3],'Pass frozen game.js reference and output JSON');
const readSource=path=>path.endsWith('.gz')?gunzipSync(readFileSync(path)).toString():readFileSync(path,'utf8');
const source=readSource(process.argv[2]),base=pathToFileURL(resolve('src/simulation/game.js'));
const load=source=>import('data:text/javascript;base64,'+Buffer.from(source.replace(/from (['"])(\.[^'"]+)\1/g,(_m,_q,path)=>'from '+JSON.stringify(new URL(path,base).href))).toString('base64'));
const reference=await load(source),candidateSource=process.argv[4]?readSource(process.argv[4]):readFileSync(base,'utf8'),candidate=process.argv[4]?await load(candidateSource):production;
const hash=value=>createHash('sha256').update(value).digest('hex'),nav={setState(){}};
function setup(mode,count=80,walls=40){
 const s=candidate.newGame({seed:712,slotId:'center-checks'});s.initialPreparation=false;s.hiringPaidDay=1;s.tutorial.step='done';s.dayPlan={done:true};s.nightPlan={done:true};
 const centers=Array.from({length:4},(_,i)=>({id:'center-'+i,kind:'center',status:i===3?'ruined':'intact',hp:i===3?0:600,maxHp:600,x:i*20,z:0,villageId:'village-1'}));
 const extras=Array.from({length:walls},(_,i)=>({id:'wall-'+i,kind:'wall',status:'intact',hp:100,maxHp:100,x:i,z:50}));
 s.structures=mode==='last'?[...extras,...centers]:[...centers,...extras];
 for(let i=0;i<count;i++){
  const spec=BALANCE.crops[i%BALANCE.crops.length],p=createPlant('plant-'+i,spec.id,i%40,Math.floor(i/40),'center-'+i%5);
  if(mode==='mature'||i%3===0){p.growth=spec.growth_seconds;for(const w of p.water)w.status='manual';}
  if(mode==='growing'){p.growth=1;p.water[0].status='manual';}
  if(i%17===0)p.alive=false;s.plants.push(p);
 }return s;
}
const report={scope:'Full tick states with synthetic farms and no workers; no navigation/rendering/FPS or physical RAM claim. Reference/candidate order alternates, setup and serialization excluded from timings.',referenceSha256:hash(source),candidateSha256:hash(candidateSource),comparisons:0,cases:[]};
for(const mode of ['first','last','mature','growing']){
 const a=setup(mode),b=structuredClone(a);
 for(let step=0;step<30;step++){
  if(step===8)for(const s of [a,b]){s.structures.find(c=>c.id==='center-0').status='ruined';s.structures.find(c=>c.id==='center-0').hp=0;}
  if(step===16)for(const s of [a,b]){s.structures.find(c=>c.id==='center-0').status='intact';s.structures.find(c=>c.id==='center-0').hp=600;for(const p of s.plants)p.harvestRequested=false;}
  reference.tick(a,.1,nav);candidate.tick(b,.1,nav);assert.deepEqual(b,a,mode+' step'+step);report.comparisons++;
 }
}
for(const mode of ['first','last','growing']){
 const timing={reference:[],candidate:[]};let finalHash;
 for(let sample=0;sample<60;sample++){
  const a=setup(mode,1200,800),b=structuredClone(a);
  for(const key of sample%2?['candidate','reference']:['reference','candidate']){
   const start=performance.now();(key==='candidate'?candidate:reference).tick(key==='candidate'?b:a,.1,nav);timing[key].push(performance.now()-start);
  }
  assert.deepEqual(b,a);finalHash=hash(JSON.stringify(b));
 }
 const median=xs=>[...xs].sort((a,b)=>a-b)[xs.length>>1];report.cases.push({mode,plants:1200,walls:800,samples:60,referenceMedianMs:median(timing.reference),candidateMedianMs:median(timing.candidate),finalHash,timing});
}
writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,cases:report.cases.map(({timing,...rest})=>rest)}));
