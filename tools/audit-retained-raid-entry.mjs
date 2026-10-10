// Reconstruct only native static entry geometry from a retained terminal world.
// No clock advancement, campaign rerun, damage application or balance changes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {cameraRaidEntry} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import assert from 'node:assert/strict';
const root=process.argv[2],out=process.argv[3],hash=b=>createHash('sha256').update(b).digest('hex');
const stateRaw=readFileSync(root+'/native-state.json.gz'),reportRaw=readFileSync(root+'/native-report.json.gz');
const state=JSON.parse(gunzipSync(stateRaw)),report=JSON.parse(gunzipSync(reportRaw));
const context=report.entryTransport.readyContexts.at(-1),key=JSON.parse(context.key),bounds=key[7],view=key[8];
const raid=report.raids.find(r=>r.day===context.day),structureFacts=new Map(key[9].map(([id,status])=>[id,status]));
assert.equal(state.structures.length,structureFacts.size);
assert.ok(state.structures.every(s=>structureFacts.get(s.id)===s.status),'Terminal topology changed from retained entry preparation');
const packPath=new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url),packRaw=readFileSync(packPath),pack=JSON.parse(packRaw);
const nav=new Navigation(state.seed,state.biome,pack.profile);nav.setState(state);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
const specs=context.group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const begin=performance.now(),entry=cameraRaidEntry(state,specs,bounds,nav),elapsed=performance.now()-begin;
assert.ok(entry,'No replay entry found');
const liveWalls=state.structures.filter(s=>s.kind==='wall'&&s.status==='intact');
const wallBounds={minX:Math.min(...liveWalls.map(s=>s.x)),maxX:Math.max(...liveWalls.map(s=>s.x)),minZ:Math.min(...liveWalls.map(s=>s.z)),maxZ:Math.max(...liveWalls.map(s=>s.z))};
const actors=context.group.map((species,i)=>({species,radius:specs[i].radius,entry:entry.entries[i],exit:entry.exits[i],retainedExit:raid.lastAnimals[i].exit,
 replayExitMatchesRetained:JSON.stringify(entry.exits[i])===JSON.stringify(raid.lastAnimals[i].exit),
 insideAggregateWallBoundingBox:entry.entries[i].x>wallBounds.minX&&entry.entries[i].x<wallBounds.maxX&&entry.entries[i].z>wallBounds.minZ&&entry.entries[i].z<wallBounds.maxZ,
 distanceFromEye:Math.hypot(entry.entries[i].x-view.eye.x,entry.entries[i].z-view.eye.z)}));
const sourcePaths=['src/simulation/raids.js','src/world/navigation.js','src/world/terrain.js','tools/audit-retained-raid-entry.mjs'];
const result={scope:'Static native entry reconstruction in retained final topology; not original stored birth coordinates, not a campaign or rendering/physical-input QA',retainedSourceCommit:'4d939cb8',currentSourceHashes:Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))])),stateSHA256:hash(stateRaw),reportSHA256:hash(reportRaw),biomeProfileSHA256:hash(packRaw),day:context.day,finalStateDay:state.day,view,bounds,wallCount:liveWalls.length,wallBounds,elapsedMs:elapsed,actors,
 caveat:'A bounding box does not establish a closed enclosure. Matching retreat points supports reproducibility but cannot recover unrecorded original spawn facts. No defense efficacy inferred.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/entry-reconstruction.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({day:result.day,wallCount:result.wallCount,elapsedMs:elapsed,actors}));
