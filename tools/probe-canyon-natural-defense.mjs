import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createOpeningWorld} from './check_opening.mjs';
import {canyonLandAccess} from '../src/world/canyon-land-access.js';
import {centerServicePoint} from '../src/world/centers.js';
import {chooseRaidEntry,reachableApproach} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const out=process.argv[2];if(!out||existsSync(out))throw Error('A new evidence output path is required');
const sources=['src/world/navigation.js','src/world/canyon-land-access.js','src/world/villages.js','src/world/boundary-gates.js','src/simulation/actor-fluid-clearance.js','src/simulation/raids.js','src/simulation/canyon-raid-formation.js','src/simulation/raid-agricultural-impact.js','src/simulation/worker-route-clearance.js','tools/probe-canyon-natural-defense.mjs'];
const sourceHashes=Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
const rows=[];
for(const seed of [712,123,2026])for(const culture of ['mapungubwe','saheliana']){
 const started=performance.now(),{s,nav}=createOpeningWorld({seed,culture,biome:'gran-canon',slotId:'river-'+seed+'-'+culture}),center=s.structures[0],departure=centerServicePoint(center,s,.8),points=[];
 for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
  const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
  if(nav.placement(p.x,p.z,.4).valid&&nav.path(departure,p,.28,null,true)&&nav.path(p,departure,.28,null,true))points.push(p);
 }
 const land=canyonLandAccess(nav,points),entries=[];
 for(const species of ['warthog','hyena','buffalo','lion','rhino']){
  const radius=ANIMAL_ACTIONS.animals[species].presentation.footprint.radius,specs=[{radius,spec:animalSpec(species)}],bounds=[center.x-128,center.z-128,center.x+128,center.z+128];
  const entry=chooseRaidEntry(s,specs,bounds,0,nav),actor=entry&&{...entry.entries[0],radius};
  const approach=actor&&reachableApproach(actor,center,nav);
  entries.push({species,radius,entry:entry?.entries[0]??null,exit:entry?.exits[0]??null,dry:!!actor&&nav.walkable(actor.x,actor.z,radius,null,false),centerReachable:!!approach});
 }
 const formations=[];
 for(const group of [Array(12).fill('warthog'),Array.from({length:16},(_,i)=>['warthog','hyena','buffalo','lion','rhino'][i%5])]){
  const specs=group.map(species=>({radius:ANIMAL_ACTIONS.animals[species].presentation.footprint.radius,spec:animalSpec(species)})),start=performance.now();
  const formation=chooseRaidEntry(s,specs,[center.x-128,center.z-128,center.x+128,center.z+128],0,nav);
  const pairwise=!!formation&&formation.entries.every((p,i)=>formation.entries.every((q,j)=>i===j||Math.hypot(p.x-q.x,p.z-q.z)>specs[i].radius+specs[j].radius+1));
  formations.push({group,count:formation?.entries.length??0,selectionMs:performance.now()-start,pairwiseClear:pairwise,dry:!!formation&&formation.entries.every((p,i)=>nav.walkable(p.x,p.z,specs[i].radius,null,false)),entry:formation});
 }
 const z=center.z,x=nav.field.riverX(z),row={seed,culture,openingAndProbeMs:performance.now()-started,plantableWorkerRoutedPoints:points.length,landWitness:land,riverWorkerPass:nav.terrainValid(x,z,.28,true),riverHostileBlocked:!nav.terrainValid(x,z,1.1,false),entries,formations};rows.push(row);
 console.log(JSON.stringify({seed,culture,land:!!land,entries:entries.map(e=>[e.species,e.dry,e.centerReachable]),formations:formations.map(f=>[f.count,f.pairwiseClear,f.dry])}));
 writeFileSync(out,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,scope:'Native deterministic terrain/worker routes/hostile exterior entry and approach only; no economic campaign or damage calibration.',rows},null,2)+'\n');
 if(!land||!row.riverWorkerPass||!row.riverHostileBlocked||!entries.some(e=>e.dry&&e.centerReachable)||formations.some(f=>f.count!==f.group.length||!f.pairwiseClear||!f.dry))throw Error('Natural access acceptance failed; original evidence retained');
}
