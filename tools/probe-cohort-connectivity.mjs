import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry,cameraRaidEntry} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';import * as Game from '../src/simulation/game.js';
const folder='docs/qa/exterior-cohort-connectivity/';
const hashes={good:'f0b5facb3b0ec3454334d35aca8ee0c53b58bd27f1144d055315ef97c1a4c7e7',expansive:'03ceedf735adf8ac716d908a646ad495e76046e69d144aa9f24d81207bb51ce2'};
export function loadCohort(kind){
 const raw=gunzipSync(readFileSync(folder+kind+'-original-partial-state.json.gz')),inputSha=createHash('sha256').update(raw).digest('hex');if(inputSha!==hashes[kind])throw Error('Original snapshot changed');
 const state=deserialize(raw.toString('utf8')),key=JSON.parse(JSON.parse(readFileSync(folder+kind+'-original-entry-wait.json','utf8')).key),profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[state.biome]+'.json','utf8')).profile,nav=new Navigation(state.seed,state.biome,profile);
 nav.setState(state);nav.setActiveBounds(key[7]);nav.setRaidView(key[8].eye,key[8].target);return {state,nav,inputSha};
}
export function inspectCohort(kind){
 const {state,nav,inputSha}=loadCohort(kind),before=serialize(state),specs=state.nightPlan.group.map(id=>({radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius})),base=cameraRaidEntry(state,specs,nav.activeBounds,nav),entry=chooseRaidEntry(state,specs,nav.activeBounds,0,nav),box=raidWallEnvelope(state,nav);
 return {kind,inputSha,stateUnchanged:serialize(state)===before,group:state.nightPlan.group,base,entry,wholeGroup:exteriorGroupWitness(entry,specs,box,nav,exteriorRaidWitness),proof:entry?.entries.map((birth,i)=>({birth,exit:entry.exits[i],radius:specs[i].radius,birthWalkable:nav.walkable(birth.x,birth.z,specs[i].radius,null,false),exitWalkable:nav.walkable(entry.exits[i].x,entry.exits[i].z,specs[i].radius,null,false),birthRay:exteriorRaidWitness(birth,specs[i].radius,box,nav),exitRay:exteriorRaidWitness(entry.exits[i],specs[i].radius,box,nav)}))};
}
export function replayCohort(kind,dt,{reloadAfter=null}={}){
 let {state,nav,inputSha}=loadCohort(kind);const start=state.elapsed,completed=state.completedNights,rows=[];let reloaded=false;
 for(let n=0;n<60/dt&&state.completedNights===completed&&!state.result;n++){
  Game.tick(state,dt,nav);
  for(const a of state.raid?.animals??[])if(a.status!=='gone')rows.push({elapsed:state.elapsed-start,id:a.id,species:a.species,x:a.x,z:a.z,status:a.status,hits:a.hitsRemaining,staticFootprint:nav.walkable(a.x,a.z,a.radius,null,false)});
  if(reloadAfter!==null&&!reloaded&&state.elapsed-start>=reloadAfter){const restored=deserialize(serialize(state)),next=new Navigation(restored.seed,restored.biome,nav.profile);next.setState(restored);next.setActiveBounds(nav.activeBounds);next.setRaidView(nav.raidView.eye,nav.raidView.target);state=restored;nav=next;reloaded=true;}
 }
 return {kind,inputSha,dt,reloadAfter,reloaded,simulatedSeconds:state.elapsed-start,completedBefore:completed,completedAfter:state.completedNights,result:state.result,raidRemaining:state.raid?.animals.map(a=>({id:a.id,status:a.status,hits:a.hitsRemaining,x:a.x,z:a.z}))??null,events:state.events.filter(e=>['RaidSpawned','StructureHit','CropHit','AnimalLeft','NightCompleted'].includes(e.type)),rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const kind=process.argv[2]??'good',result={certificate:inspectCohort(kind),replays:process.argv.includes('--replay')?[replayCohort(kind,.1),replayCohort(kind,1),replayCohort(kind,.1,{reloadAfter:5})]:[],scope:'Exact snapshot; bounded Game.tick. Static footprint samples, no universal swept-leg or performance claim.'};writeFileSync(folder+kind+'-candidate.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({certificate:result.certificate,replays:result.replays.map(({rows,events,...r})=>({...r,footprintChecks:rows.length,illegal:rows.filter(r=>!r.staticFootprint).length}))}));}
