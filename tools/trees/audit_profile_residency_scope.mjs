import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const fixture=gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString(),module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const rows=[];
for(const radius of [2,1,1,2]){
 const state=JSON.parse(fixture);state.mangroveNetwork=true;state.mangroveSettlementVersion=2;
 const v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48),loaded=new Map(),setupStart=performance.now(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
 try{
  for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const setupMs=performance.now()-setupStart;
  const results=[],times=[],profiles=['hyena','buffalo','lion','rhino'];
  for(const species of profiles){
   const options={worker:false,species},t=performance.now();session.actorSectorRevision(options);times.push({species,ms:performance.now()-t});
   for(let i=0;i<40;i++){
    const inner=i<20,d=inner?20:88,start={x:v.x-8+(i%5)*4,z:v.z-8+(Math.floor(i/5)%4)*4},end={x:v.x+d+(i%4)*2,z:v.z-22+(Math.floor(i/4)%10)*5};
    const answer=session.routeActorNative(start,end,options);results.push({species,inner,start,end,...answer});
   }
  }
  let recovery=null;
  if(radius===1){
   const started=performance.now(),chunkTimes=[];for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){const key=`${x},${z}`;if(loaded.has(key))continue;const chunkStarted=performance.now();if(session.core.addChunk(x,z)<0)throw Error('Cannot install missing chunk');loaded.set(key,session.core.chunkPayload());chunkTimes.push(performance.now()-chunkStarted);}
   const installMs=performance.now()-started,recovered=results.map(row=>({species:row.species,inner:row.inner,start:row.start,end:row.end,...session.routeActorNative(row.start,row.end,{worker:false,species:row.species})}));
   recovery={installMs,chunkTimes,chunks:loaded.size,results:recovered};
  }
  rows.push({radius,chunks:(2*radius+1)**2,setupMs,profileMs:times.reduce((sum,row)=>sum+row.ms,0),times,results,recovery});
 }finally{session.dispose();}
}
const signature=r=>JSON.stringify({status:r.status,points:r.points}),reference=rows[0].results;
for(const row of rows){
 row.comparison={equal:0,different:0,referenceFoundCandidateUnknown:0,otherStatusChanges:0,changedFoundRoutes:0,byInner:{}};
 for(let i=0;i<reference.length;i++){
  const base=reference[i],candidate=row.results[i],entry=row.comparison.byInner[base.inner?'inner':'outer']??={equal:0,different:0};
  if(signature(base)===signature(candidate)){row.comparison.equal++;entry.equal++;continue;}
  row.comparison.different++;entry.different++;
  if(base.status==='found'&&candidate.status==='unknown')row.comparison.referenceFoundCandidateUnknown++;
  else if(base.status!==candidate.status)row.comparison.otherStatusChanges++;
  else if(base.status==='found')row.comparison.changedFoundRoutes++;
 }
 if(row.recovery){row.recovery.different=row.recovery.results.filter((value,i)=>signature(value)!==signature(reference[i])).length;delete row.recovery.results;}
}
if(rows[3].comparison.different)throw Error('Full-residency control differs');
const report={scope:'Independent synthetic 3x3 vs 5x5 resident worlds with identical island-network seed and state; full profile construction and 160 native routes per run. This removes chunks from the world, not only from a profile: it is an upper-bound feasibility probe, not an implementation or a safe equivalence claim.',mangroveNetwork:true,settlementVersion:2,rows:rows.map(({results,...row})=>({...row,statuses:Object.fromEntries(['found','unknown','blocked'].map(status=>[status,results.filter(result=>result.status===status).length]))}))};
writeFileSync('docs/lighting/tree-near-retexture/performance/mobility-profile-residency-scope-abba.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
