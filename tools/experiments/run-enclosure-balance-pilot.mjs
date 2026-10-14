import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {dirname,relative,resolve} from 'node:path';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {EnclosureBalanceObserver} from './enclosure-balance-observer.mjs';

const input=resolve(process.argv[2]??'docs/qa/hierarchical-navigation/spatial-virtual-sabana-30-stable-obstacles-state.json');
const output=resolve(process.argv[3]??'docs/qa/enclosure-balance-observer/pilot.json');
const source=readFileSync(input),state=deserialize((input.endsWith('.gz')?gunzipSync(source):source).toString());
if(!state.raid)throw Error('Pilot requires an active native raid snapshot');
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.plants.filter(p=>p.alive),...state.raid.animals.flatMap(a=>[a,a.spawn])];
  const chunks=new Set();
  for(const p of points){
    const x=Math.floor((p.x+24)/48),z=Math.floor((p.z+24)/48);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)chunks.add(`${x+dx},${z+dz}`);
  }
  for(const key of chunks){
    const [x,z]=key.split(',').map(Number);
    if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)
      throw Error('Could not load spatial chunk '+key);
    loaded.set(key,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  const observer=new EnclosureBalanceObserver({session});
  const row=observer.observe(state,nav);
  const warmObserver=new EnclosureBalanceObserver({session});
  const hot=[];
  for(let i=0;i<5;i++){
    const sample=warmObserver.sample(state,nav,state.raid.animals,'hot-repeat');
    assert.deepEqual(sample.profiles,row.profiles);
    hot.push(sample.elapsedMs);
  }
  const idleCount=100000,idleStart=performance.now();
  for(let i=0;i<idleCount;i++)assert.equal(observer.observe(state,nav),null);
  const idleMs=performance.now()-idleStart;
  assert.equal(observer.report().counters.samples,1);
  const report={scope:'Read-only reconstruction of an archived Wild Engine active raid. Classification uses animal physical profiles and resident WASM components; no campaign ticks, balance changes or synthetic breach.',
    source:relative(process.cwd(),input).replaceAll('\\','/'),
    sourceSha256:createHash('sha256').update(source).digest('hex'),
    seed:state.seed,biome:state.biome,day:state.day,raidId:state.raid.id,
    livingCrops:state.plants.filter(p=>p.alive).length,residentChunks:chunks.size,
    walls:state.structures.filter(s=>s.kind==='wall'&&s.status!=='ruined').length,
    sample:row,counters:observer.report().counters,
    cost:{hotSampleMs:hot,idleCalls:idleCount,idleTotalMs:idleMs,
      idleUsPerCall:idleMs*1000/idleCount,
      note:'Five repeated full samples on the same warm resident topology; idle calls retain the same state and event ring. Timings exclude snapshot and chunk load and are not frame-time estimates.'}};
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,crops:report.livingCrops,profiles:row.profiles,
    elapsedMs:row.elapsedMs,hotSampleMs:hot,idleUsPerCall:report.cost.idleUsPerCall,
    residentChunks:chunks.size}));
}finally{session.dispose();}
