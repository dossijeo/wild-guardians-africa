// QA replay of one already saved native raid; no virtual-player decisions.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as Game from '../../src/simulation/game.js';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {EnclosureBalanceObserver} from '../experiments/enclosure-balance-observer.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const alive=state=>state.plants.filter(plant=>plant.alive).length;

export function replayRaidSnapshot(input,{radius=4,maxTicks=600}={}){
 const source=readFileSync(input,'utf8'),wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
 if(!Number.isSafeInteger(radius)||radius<1||radius>8||
  !Number.isSafeInteger(maxTicks)||maxTicks<1||maxTicks>3600)throw Error('Invalid replay budget');
 const passes=[];
 for(const observed of [false,true]){
  const state=deserialize(source);
  if(!state.raid)throw Error('Replay requires a saved active raid');
  const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
   loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
   const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48);
   for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++){
    if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)
     throw Error(`Cannot load replay chunk ${x},${z}`);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
   }
   const nav=createSpatialNavigationMovement(session,state);
   nav.setActiveBounds([(cx-radius)*48-24,(cz-radius)*48-24,
    (cx+radius)*48+24,(cz+radius)*48+24]);
   const observer=observed?new EnclosureBalanceObserver({session}):null;
   const startDay=state.day,startCrops=alive(state),rows=[];
   let ticks=0;
   while(ticks<maxTicks&&state.raid&&state.day===startDay&&!state.result){
    const previousCrops=alive(state),previousTopology=nav.version;
    Game.tick(state,1,nav);
    nav.serviceRaidConnectivityDemand?.();
    const sample=observer?.observe(state,nav);
    const lost=previousCrops-alive(state);
    if(sample||lost||nav.version!==previousTopology)
     rows.push({tick:ticks+1,time:state.time,topology:nav.version,
      cropsLost:lost,livingCrops:alive(state),sample:sample??null});
    ticks++;
   }
   passes.push({observed,ticks,ended:!state.raid||state.day!==startDay||!!state.result,
    startDay,endDay:state.day,startCrops,endCrops:alive(state),
    stateSha256:sha(serialize(state)),observer:observer?.report()??null,rows});
  }finally{session.dispose();}
 }
 assert.equal(passes[0].stateSha256,passes[1].stateSha256,
  'QA observer changed serialized game state or RNG');
 return {sourceSha256:sha(source),source:input,radius,maxTicks,
  stateEquivalent:true,passes};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const input=resolve(process.argv[2]??''),output=resolve(process.argv[3]??'');
 if(!process.argv[2]||!process.argv[3])throw Error('Usage: replay-enclosure-raid <snapshot> <report>');
 const result=replayRaidSnapshot(input);
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({sourceSha256:result.sourceSha256,stateEquivalent:true,
  ticks:result.passes[1].ticks,ended:result.passes[1].ended,
  cropsLost:result.passes[1].startCrops-result.passes[1].endCrops,
  samples:result.passes[1].observer.counters.samples,output}));
}
