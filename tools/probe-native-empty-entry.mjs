// Read-only investigation of retained preparation failure; no actors spawned.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry,cameraRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
import {animalSpec,randomInt} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Requires incomplete campaign directory and fresh output');
const file=directory+'/partial-state.json.gz',raw=readFileSync(file),state=deserialize(gunzipSync(raw).toString());
const partial=JSON.parse(readFileSync(directory+'/partial.json'));
const context=JSON.parse(partial.entryTransport.waits.at(-1).key),bounds=context[7],view=context[8],group=context[6];
assert.deepEqual(group,state.nightPlan.group);
const profileFile=`public/content/biome-${BIOME_IDS[state.biome]}.json`,profile=JSON.parse(readFileSync(profileFile)).profile;
const navigation=s=>{const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);return nav;};
const rows=[];
for(const species of [group,...new Set(group)].map(v=>Array.isArray(v)?v:[v])){
 const s=deserialize(gunzipSync(raw).toString()),nav=navigation(s),specs=species.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const chosen=chooseRaidEntry(s,specs,bounds,randomInt(s,0,3),nav);
 const cameraState=deserialize(gunzipSync(raw).toString()),cameraNav=navigation(cameraState);
 const candidate=cameraRaidEntry(cameraState,specs,bounds,cameraNav),box=raidWallEnvelope(cameraState,cameraNav);
 const poses=candidate?[...candidate.entries,...candidate.exits].map((point,i)=>{
  const radius=specs[i%specs.length].radius;
  return {point,radius,bodyClear:cameraNav.walkable(point.x,point.z,radius,null,false),exteriorWitness:exteriorRaidWitness(point,radius,box,cameraNav)};
 }):[];
 rows.push({species,nativeChosenActors:chosen?.entries.length??0,chosen,cameraCandidateActors:candidate?.entries.length??0,
  cameraExteriorCertified:!!candidate&&exteriorGroupWitness(candidate,specs,box,cameraNav,exteriorRaidWitness),cameraPoses:poses});
}
assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),createHash('sha256').update(raw).digest('hex'));
const result={input:file,inputSha256:createHash('sha256').update(raw).digest('hex'),day:state.day,time:state.time,bounds,view,rows,
 scope:'Original full pending group and isolated-species native entry queries on copied states. Never reduces a real raid, bypasses geometry or accepts an uncertified spawn.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows.map(({species,nativeChosenActors,cameraCandidateActors,cameraExteriorCertified})=>({species,nativeChosenActors,cameraCandidateActors,cameraExteriorCertified}))));
