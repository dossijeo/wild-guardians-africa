// Frozen Desierto/983 raid: compare entrance selection, not attack balance.
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import * as current from '../../src/simulation/raids.js';

const baselinePath=new URL('../../src/simulation/raids-baseline-qa.mjs',import.meta.url);
writeFileSync(baselinePath,execFileSync('git',[
  'show','1a1e6df4:src/simulation/raids.js']));
let session;
try{
  const baseline=await import(baselinePath.href);
  const fixture=JSON.parse(gunzipSync(readFileSync(new URL(
    '../../tests/fixtures/desierto983-d6-no-walls-raid.json.gz',import.meta.url))));
  const state=deserialize(JSON.stringify(fixture.state)),bounds=fixture.activeBounds;
  const wasm=new WebAssembly.Module(readFileSync(new URL(
    '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map();session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const chunkAt=value=>Math.floor((value+24)/48);
  for(let z=chunkAt(bounds[1]);z<=chunkAt(bounds[3]);z++)
    for(let x=chunkAt(bounds[0]);x<=chunkAt(bounds[2]);x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);
  nav.setRaidView(fixture.raidView.eye,fixture.raidView.target);
  const specs=state.raid.animals.map(a=>({radius:a.radius})),before=serialize(state);
  const arms={baseline:()=>baseline.chooseRaidEntry(state,specs,bounds,0,nav),
    current:()=>current.chooseRaidEntry(state,specs,bounds,0,nav)};
  for(let i=0;i<2;i++)for(const run of Object.values(arms))run();
  const rows=[];
  for(const order of [['baseline','current'],['current','baseline'],
    ['current','baseline'],['baseline','current']])for(const name of order){
    const start=performance.now(),entry=arms[name]();
    rows.push({name,ms:performance.now()-start,count:entry?.entries.length??0});
  }
  const crop=state.plants.find(p=>p.alive);
  const endpoints=Object.fromEntries(Object.entries(arms).map(([name,run])=>{
    const entry=run();return [name,entry.entries.map((point,i)=>({point,
      connectivity:nav.regionConnected(point,crop,specs[i].radius,null,false)}))];
  }));
  if(serialize(state)!==before)throw Error('Entrance selection mutated gameplay state');
  console.log(JSON.stringify({fixture:'Desierto/983 night 6, eight animals, no walls',
    baseline:'1a1e6df4',rows,endpoints},null,2));
}finally{session?.dispose();unlinkSync(baselinePath);}
