import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const root=new URL('../docs/qa/hierarchical-navigation/',import.meta.url);
const report=JSON.parse(readFileSync(new URL(
  'spatial-virtual-sabana-11-diagnostic-v2.json',root),'utf8'));
const snapshot=readFileSync(new URL(
  'spatial-virtual-sabana-11-diagnostic-v2-state.json',root),'utf8');
const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));

test('a resident wall-side repair pocket is a failed approach, not a missing chunk',async()=>{
  const state=deserialize(snapshot),loaded=new Map();
  const session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let cz=-1;cz<=1;cz++)for(let cx=1;cx<=3;cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx-2,cz)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state),
      start=report.routeStart,end=report.routeEnd;
    assert.equal(nav.walkable(start.x,start.z,.28,null,true),true);
    assert.equal(nav.walkable(end.x,end.z,.28,null,true),true);
    assert.deepEqual(session.actorRegions(end,{worker:true}),
      {ids:[],unknown:false});
    assert.equal(nav.path(start,end,.28,null,true),null);
  }finally{session.dispose();}
});
