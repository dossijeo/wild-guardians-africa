import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from './check_opening.mjs';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';

const input=process.argv[2];if(!input)throw Error('Usage: node tools/probe-compact-raid-entry.mjs CHECKPOINT.json.gz');
const state=deserialize(gunzipSync(readFileSync(input)).toString()),actors=state.raid?.animals;
if(!actors?.length)throw Error('Checkpoint has no raid actors');
state.raid=null;
const center=state.structures.find(v=>v.kind==='center'&&v.hp>0);
const counts=process.argv.slice(3).length?process.argv.slice(3).map(Number):[actors.length];
for(const count of counts){
 if(!Number.isSafeInteger(count)||count<1||count>actors.length)throw Error('Invalid actor count');
 const specs=actors.slice(0,count).map(a=>({spec:animalSpec(a.species),radius:ANIMAL_ACTIONS.animals[a.species].presentation.footprint.radius}));
 const {nav}=createOpeningWorld({seed:state.seed,biome:state.biome,culture:state.culture,terrainVersion:state.terrainVersion});nav.setState(state);
 const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
 nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
 const bounds=activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds;nav.setActiveBounds(bounds);
 const started=performance.now(),entry=chooseRaidEntry(state,specs,bounds,0,nav);
 console.log(JSON.stringify({requestedActors:count,milliseconds:performance.now()-started,actors:entry?.entries?.length??0,bounds,first:entry?.entries?.[0],last:entry?.entries?.at(-1),meanDistanceToFarm:entry?.entries?.reduce((sum,p)=>sum+Math.hypot(p.x-center.x,p.z-center.z),0)/specs.length??null,selectionBounds:entry?.selectionBounds??null}));
}
