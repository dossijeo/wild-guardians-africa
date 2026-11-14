import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';

const paths=['src/world/wild-engine/spatial-savanna.wasm','.cache/spatial-center-reuse.wasm'],modules=paths.map(path=>new WebAssembly.Module(readFileSync(path))),fixture=gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString();
const runs=[];
for(const candidate of [false,true,true,false]){
 const state=JSON.parse(fixture);state.mangroveNetwork=true;state.mangroveSettlementVersion=2;
 const v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48),loaded=new Map(),session=createSpatialGameSession(modules[+candidate],state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),wasm=session.core.wasm;
 try{
  for(let z=cz-2;z<=cz+2;z++)for(let x=cx-2;x<=cx+2;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const before=wasm.memory.buffer.byteLength,profiles=[];
  for(const species of ['hyena','buffalo','lion','rhino']){
   const start=performance.now(),region=session.actorRegions(v,{worker:false,species}),ms=performance.now()-start,points=[];
   for(let z=-30;z<=30;z+=3)for(let x=-30;x<=30;x+=3){const p={x:v.x+x+.17,z:v.z+z+.31};points.push(session.actorCanStand(p,{worker:false,species}));}
   profiles.push({species,ms,region,points});
  }
  runs.push({candidate,totalMs:profiles.reduce((n,p)=>n+p.ms,0),memoryBefore:before,memoryAfter:wasm.memory.buffer.byteLength,profiles});
 }finally{session.dispose();}
}
const ref=runs[0].profiles;
for(const run of runs)for(let i=0;i<ref.length;i++)if(JSON.stringify([run.profiles[i].region,run.profiles[i].points])!==JSON.stringify([ref[i].region,ref[i].points]))throw Error('Region or sampled collision differs');
const report={scope:'Independent 5x5 mangrove island-network sessions, four cold profiles in ABBA order; Node CPU including experimental cache creation and destruction. 441 static point checks per profile, outside timed section; no routes, mutation, browser, GPU or full game.',runs:runs.map(({profiles,...row})=>({...row,profiles:profiles.map(({points,...p})=>({...p,checkedPoints:points.length,clearPoints:points.filter(Boolean).length}))}))};
writeFileSync('docs/lighting/tree-near-retexture/performance/mobility-center-sample-reuse-abba.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
