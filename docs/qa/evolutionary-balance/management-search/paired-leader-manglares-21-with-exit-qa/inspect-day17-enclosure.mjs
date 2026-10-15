import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../../../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../../../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../../../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {EnclosureBalanceObserver} from '../../../../../tools/experiments/enclosure-balance-observer.mjs';

const capture=JSON.parse(gunzipSync(readFileSync(
  new URL('../../../../../tests/fixtures/manglares-123-day17-retreat.json.gz',import.meta.url))));
const state=deserialize(JSON.stringify(capture.state));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../../../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
 const points=[...state.plants.filter(p=>p.alive),...state.raid.animals.map(a=>a.spawn),
   ...state.villages];
 const chunk=value=>Math.floor((value+24)/48);
 const bounds=[Math.min(...points.map(p=>p.x))-48,Math.min(...points.map(p=>p.z))-48,
   Math.max(...points.map(p=>p.x))+48,Math.max(...points.map(p=>p.z))+48];
 for(let cz=chunk(bounds[1]);cz<=chunk(bounds[3]);cz++)
  for(let cx=chunk(bounds[0]);cx<=chunk(bounds[2]);cx++){
   if(session.core.selectChunk(cx,cz)<0)session.core.addChunk(cx,cz);
   loaded.set(`${cx},${cz}`,session.core.chunkPayload());
  }
 const nav=createSpatialNavigationMovement(session,state);
 const observer=new EnclosureBalanceObserver({session});
 const row=observer.sample(state,nav,state.raid.animals,'captured');
 console.log(JSON.stringify({sourceHash:capture.sourceHash,day:state.day,
  chunks:loaded.size,bounds,wallCount:row.wallCount,livingCrops:row.livingCrops,
  profiles:row.profiles,elapsedMs:row.elapsedMs},null,2));
}finally{session.dispose();}
