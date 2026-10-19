import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope} from '../src/simulation/raid-exterior-entry.js';
import {animalSpec,randomInt} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

const fixture=new URL('../docs/qa/desert-raid-pressure-audit/desierto123-pre-entry-diagnostic-day15-pre-entry.json.gz',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));

test('Desert/123 night 15 enters from a reachable exterior wall side when camera relevance is empty',()=>{
  const frozen=JSON.parse(gunzipSync(readFileSync(fixture)));
  const state=deserialize(frozen.state),before=serialize(state);
  const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(const key of frozen.navigation.residentChunks){
      const [cx,cz]=key.split(',').map(Number);
      assert.notEqual(session.core.addChunk(cx,cz),-1);
      loaded.set(key,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state),planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
    nav.setActiveBounds(frozen.navigation.bounds);
    nav.setRaidView(frozen.navigation.view.eye,frozen.navigation.view.target);
    const group=state.nightPlan.group,
      specs=group.map(id=>({spec:animalSpec(id),
        radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius})),
      radius=Math.max(...specs.map(s=>s.radius));
    assert.equal(nav.spatialRelevantWallApproachSides(nav.raidView.eye,radius).length,0);
    assert(nav.spatialWallApproachSides(radius).length>0);
    const side=randomInt({rng:state.rng},0,3);
    const entry=chooseRaidEntry(state,specs,nav.activeBounds,side,nav);
    assert.equal(entry?.entries.length,group.length);
    assert(entry.wallOpportunity);
    const face={x:entry.wallOpportunity.x,z:entry.wallOpportunity.z};
    const box=raidWallEnvelope(state,nav);
    for(let i=0;i<group.length;i++){
      const birth=entry.entries[i],r=specs[i].radius;
      assert(nav.spatialExteriorEdge(birth,r,box),`actor ${i} has no exterior witness`);
      assert.equal(nav.spatialRouteStatus(birth,face,r),'found',
        `actor ${i} cannot reach selected wall face`);
      for(let j=0;j<i;j++)assert(Math.hypot(birth.x-entry.entries[j].x,
        birth.z-entry.entries[j].z)>r+specs[j].radius+1);
    }
    assert.equal(serialize(state),before,'entry consultation changed the game state');
  }finally{session.dispose();}
});
