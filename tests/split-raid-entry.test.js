import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';

const fixture=new URL('../docs/qa/integrated-spiritual-survival/pilot-v126-day13-spawn-trace/checkpoint-state.json.gz',import.meta.url);
function caseFromRetainedState(){
 const state=deserialize(gunzipSync(readFileSync(fixture)).toString()),actors=state.raid.animals;
 state.raid=null;
 const center=state.structures.find(v=>v.kind==='center'&&v.hp>0);
 const specs=actors.map(a=>({spec:animalSpec(a.species),radius:ANIMAL_ACTIONS.animals[a.species].presentation.footprint.radius}));
 const {nav}=createOpeningWorld({seed:state.seed,biome:state.biome,culture:state.culture,terrainVersion:state.terrainVersion});nav.setState(state);
 const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38),eye={x:pose.eye[0],z:pose.eye[2]};
 nav.setRaidView(eye,center);const bounds=activeChunkRegion(eye).bounds;nav.setActiveBounds(bounds);
 return {state,before:serialize(state),center,specs,nav,bounds};
}

test('sixteen-animal raid uses two separated, physically exterior near-farm formations',()=>{
 const {state,before,center,specs,nav,bounds}=caseFromRetainedState(),view=nav.raidView;
 const entry=chooseRaidEntry(state,specs,bounds,0,nav);
 assert.equal(entry.entries.length,16);assert.equal(entry.exits.length,16);
 assert.ok(exteriorGroupWitness(entry,specs,raidWallEnvelope(state,nav),nav,exteriorRaidWitness));
 assert.ok(entry.entries.every(p=>Math.hypot(p.x-center.x,p.z-center.z)<70));
 for(let i=0;i<8;i++)for(let j=8;j<16;j++)for(const first of ['entries','exits'])for(const second of ['entries','exits']){
  assert.ok(Math.hypot(entry[first][i].x-entry[second][j].x,entry[first][i].z-entry[second][j].z)>specs[i].radius+specs[j].radius+1);
 }
 assert.equal(serialize(state),before);assert.equal(nav.raidView,view);
});
