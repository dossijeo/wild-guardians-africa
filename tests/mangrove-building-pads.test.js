import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {centerFootprint} from '../src/world/centers.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
for(const seed of [1,37,712,4096])test(`footprint reservation keeps buildings dry and roundtrips adjacent chunks, seed ${seed}`,async()=>{
 const opening=await createSpatialCampaignOpening({seed,biome:'manglares',mangroveNetwork:true,mangroveSettlementVersion:2});let restored;
 try{
  const {state,session}=opening,v=state.villages[0];
  const footprints=[...v.buildings.filter(b=>b.kind!=='Zona común').map(b=>b.footprint),centerFootprint(v.center,state).footprint];
  for(const polygon of footprints)for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length];for(let j=0;j<=8;j++){const x=p.x+(q.x-p.x)*j/8,z=p.z+(q.z-p.z)*j/8;assert.equal(session.field.waterInfo(x,z).inside,false,`${x},${z}`);}}
  const loaded=new Map();restored=createSpatialGameSession(module,deserialize(serialize(state)),{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
  const cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48),wanted=new Map();
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)wanted.set(`${cx+dx},${cz+dz}`,{cx:cx+dx,cz:cz+dz,score:0});
  session.stream.plan(wanted);restored.stream.plan(wanted);await Promise.all([session.stream.whenIdle(),restored.stream.whenIdle()]);
  for(const p of wanted.values()){session.core.selectChunk(p.cx,p.cz);restored.core.selectChunk(p.cx,p.cz);const a=session.core.chunkPayload(),b=restored.core.chunkPayload();assert.deepEqual(b.water,a.water);assert.deepEqual(b.terrain.positions,a.terrain.positions);}
 }finally{restored?.dispose();opening.dispose();}
});
