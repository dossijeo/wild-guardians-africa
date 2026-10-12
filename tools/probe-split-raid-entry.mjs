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
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';

const input=process.argv[2];if(!input)throw Error('Usage: node tools/probe-split-raid-entry.mjs CHECKPOINT.json.gz');
const state=deserialize(gunzipSync(readFileSync(input)).toString()),actors=state.raid?.animals;
if(actors?.length!==16)throw Error('Expected retained sixteen-animal raid');
state.raid=null;
const center=state.structures.find(v=>v.kind==='center'&&v.hp>0);
const specs=actors.map(a=>({spec:animalSpec(a.species),radius:ANIMAL_ACTIONS.animals[a.species].presentation.footprint.radius}));
const {nav}=createOpeningWorld({seed:state.seed,biome:state.biome,culture:state.culture,terrainVersion:state.terrainVersion});nav.setState(state);
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
const originalEye={x:pose.eye[0],z:pose.eye[2]},bounds=activeChunkRegion(originalEye).bounds;
nav.setRaidView(originalEye,center);nav.setActiveBounds(bounds);
const started=performance.now();
const first=chooseRaidEntry(state,specs.slice(0,8),bounds,0,nav);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const near=entry=>!!entry?.entries&&entry.entries.every(point=>distance(point,center)<70);
const separated=(a,b)=>['entries','exits'].every(firstKind=>['entries','exits'].every(secondKind=>a[firstKind].every((point,i)=>b[secondKind].every((other,j)=>distance(point,other)>specs[i].radius+specs[j+8].radius+1))));
const combinedWitness=(a,b)=>exteriorGroupWitness({entries:[...a.entries,...b.entries],exits:[...a.exits,...b.exits]},specs,raidWallEnvelope(state,nav),nav,exteriorRaidWitness);
const candidates=[];
for(let i=0;i<16;i++){
 const angle=i*Math.PI/8,eye={x:center.x+Math.sin(angle)*38,z:center.z+Math.cos(angle)*38};
 nav.setRaidView(eye,center);
 const second=chooseRaidEntry(state,specs.slice(8),bounds,i%4,nav);
 if(near(second))candidates.push({angleIndex:i,eye,second,separated:!!first&&separated(first,second),fullWitness:!!first&&combinedWitness(first,second),meanDistance:second.entries.reduce((sum,p)=>sum+distance(p,center),0)/8});
}
nav.setRaidView(originalEye,center);
const splitStarted=performance.now(),joined=chooseRaidEntry(state,specs,bounds,0,nav);
console.log(JSON.stringify({milliseconds:performance.now()-started,first:{valid:near(first),meanDistance:first?.entries?.reduce((sum,p)=>sum+distance(p,center),0)/8,entries:first?.entries},candidates:candidates.map(({angleIndex,eye,separated,fullWitness,meanDistance,second})=>({angleIndex,eye,separated,fullWitness,meanDistance,entries:second.entries})),validPairs:candidates.filter(c=>c.separated&&c.fullWitness).length,joined:{milliseconds:performance.now()-splitStarted,valid:!!joined&&exteriorGroupWitness(joined,specs,raidWallEnvelope(state,nav),nav,exteriorRaidWitness),actors:joined?.entries?.length??0,meanDistance:joined?.entries?.reduce((sum,p)=>sum+distance(p,center),0)/specs.length??null,selectionBounds:joined?.selectionBounds??null}}));
