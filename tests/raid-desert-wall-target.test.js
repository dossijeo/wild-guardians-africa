import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import * as Game from '../src/simulation/game.js';

const snapshots=[6,7].map(day=>JSON.parse(gunzipSync(readFileSync(new URL(
  `./fixtures/raid-desert-983/day${day}-defended.json.gz`,import.meta.url)))));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

function replay(snapshot,reload=false){
  let state=deserialize(JSON.stringify(snapshot.state));
  if(reload)state=deserialize(serialize(state));
  const loaded=new Map();
  const session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const bounds=snapshot.activeBounds,chunk=value=>Math.floor((value+24)/48);
    for(let z=chunk(bounds[1]);z<=chunk(bounds[3]);z++)
      for(let x=chunk(bounds[0]);x<=chunk(bounds[2]);x++){
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        loaded.set(`${x},${z}`,session.core.chunkPayload());
      }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds(bounds);nav.raidView=snapshot.raidView;
    const initialHits=new Map(state.raid.animals.map(a=>[a.id,a.hitsRemaining]));
    const initialWalls=new Map(state.structures.filter(s=>s.kind==='wall').map(s=>[s.id,s.hp]));
    let attackingSeconds=0;
    for(let i=0;i<40;i++){
      Game.tick(state,1,nav);
      if(state.raid.animals.some(a=>a.status==='attacking'))attackingSeconds++;
    }
    return {hash:createHash('sha256').update(serialize(state)).digest('hex'),attackingSeconds,
      hits:state.raid.animals.reduce((n,a)=>n+initialHits.get(a.id)-a.hitsRemaining,0),
      damaged:state.structures.filter(s=>s.kind==='wall'&&s.hp<initialWalls.get(s.id))
        .map(s=>s.id).sort()};
  }finally{session.dispose();}
}

for(const snapshot of snapshots)test(`Desierto 983 day ${snapshot.day} strikes the crop-facing perimeter deterministically`,()=>{
    assert.equal(snapshot.sourceHash,'2b208619dca8c79d3bd859493e2e735db0e78a60');
    const first=replay(snapshot),second=replay(snapshot,true);
    assert.deepEqual(first,second);
    assert(first.attackingSeconds>0,'the native attack state must precede wall damage');
    assert(first.hits>0,'attacks must consume a real hit budget');
    assert(first.damaged.length>0,'wall HP must fall in the native simulation');
    assert(first.damaged.every(id=>['structure-1586','structure-1868',
      'structure-1869','structure-1870','structure-1871','structure-1872'].includes(id)),
    `an unrelated flank wall was hit: ${first.damaged}`);
  });
