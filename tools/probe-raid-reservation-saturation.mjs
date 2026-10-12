// QA fixture only: explicit cohorts, native RNG/spawn/motion/collision/attack rules.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {topologyFixture} from './probe-raid-entry-topology.mjs';import {createPlant} from '../src/simulation/crops.js';import {createCropGrouping} from '../src/simulation/crop-components.js';import {defensiveGroups} from '../src/simulation/defensive-groups.js';import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
function cropGroups(s){const grouping=createCropGrouping(s.plants),seen=new Set(),groups=[];for(const p of grouping.living)if(!seen.has(p.id)){const group=grouping.group(p);group.forEach(p=>seen.add(p.id));groups.push(group.map(p=>p.id));}return groups;}
export function fixture(layout){
 const {s,nav}=topologyFixture('closed');s.structures=s.structures.filter(t=>t.kind==='center');s.plants=[];s.workers=[];s.villages=[];s.day=20;s.time=400;s.spells=[];
 if(layout==='closed-walls'){
  const nodes=[[4,-4],[26,-4],[26,18],[4,18]];
  for(let side=0;side<4;side++){const [x,z]=nodes[side],[ex,ez]=nodes[(side+1)%4],n=11;
   for(let i=0;i<n;i++)s.structures.push({id:`wall-${side}-${i}`,kind:'wall',x:x+(ex-x)*(i+.5)/n,z:z+(ez-z)*(i+.5)/n,yaw:Math.atan2(-(ez-z),ex-x),hp:100,maxHp:100,status:'intact',material:'zarzas',cost:10});
  }
 }
 if(layout==='connected-walls'){for(let i=0;i<12;i++)s.structures.push({id:'wall-'+i,kind:'wall',x:-11+i*2,z:22,yaw:0,hp:100,maxHp:100,status:'intact',material:'zarzas',cost:10});}
 if(layout!=='center-only')for(let i=0;i<100;i++)s.plants.push(createPlant('crop-'+i,'mijo',8+(i%10)*(layout==='fragmented'?3:1.5),Math.floor(i/10)*(layout==='fragmented'?3:1.5),'center'));
 nav.setState(s);nav.setActiveBounds([-80,-80,100,100]);nav.setRaidView({x:16,z:28},{x:12,z:7});return {s,nav};
}
export function probe(layout,count,{duration=120,dt=.1}={}){
 const {s,nav}=fixture(layout),groups=cropGroups(s),defense=defensiveGroups(s),rngBefore=s.rng;
 if(!spawnRaid(s,{group:Array.from({length:count},()=> 'warthog')},nav))throw Error('Fixture lacks whole-group native entry');
 const raid=s.raid,initial=new Map(raid.animals.map(a=>[a.id,a.hitsRemaining])),transitions=[];
 updateRaid(s,0,nav);const first=raid.animals.map(a=>({id:a.id,status:a.status,targetId:a.targetId,reservation:a.reservation,hits:a.hitsRemaining})),initialReservations={...raid.reservations};
 for(const a of raid.animals)if(a.status==='retreating')transitions.push({id:a.id,elapsed:0,hits:a.hitsRemaining,remainingLiving:s.plants.filter(p=>p.alive).length});
 for(let n=0;n<duration/dt&&s.raid;n++){const statuses=new Map(raid.animals.map(a=>[a.id,a.status]));s.elapsed+=dt;updateRaid(s,dt,nav);for(const a of raid.animals)if(a.status==='retreating'&&statuses.get(a.id)!=='retreating')transitions.push({id:a.id,elapsed:s.elapsed,hits:a.hitsRemaining,remainingLiving:s.plants.filter(p=>p.alive).length});}
 const actors=raid.animals.map(a=>({id:a.id,initialHits:initial.get(a.id),hitsSpent:initial.get(a.id)-a.hitsRemaining,remainingHits:a.hitsRemaining,status:a.status}));
 return {layout,count,dt,duration,fixtureCropGroups:groups.map(g=>g.length),defensiveGroups:defense.map(g=>({id:g.id,pieces:g.targets.length})),rngBefore,rngAfter:s.rng,initialReservations,first,transitions,actors,budgetInitial:actors.reduce((n,a)=>n+a.initialHits,0),budgetSpent:actors.reduce((n,a)=>n+a.hitsSpent,0),budgetRetained:actors.reduce((n,a)=>n+a.remainingHits,0),animalsSpending:actors.filter(a=>a.hitsSpent>0).length,animalsRetreatingWithBudget:transitions.filter(a=>a.hits>0).length,remainingLiving:s.plants.filter(p=>p.alive).length,damageEvents:{crop:s.events.filter(e=>e.type==='CropHit').length,structure:s.events.filter(e=>e.type==='StructureHit').length},raidEnded:s.raid===null,result:s.result};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=process.argv[2]??'docs/qa/raid-reservation-saturation';mkdirSync(output,{recursive:true});const rows=[];
 for(const [layout,count] of [['mono',1],['mono',2],['mono',5],['mono',12],['fragmented',12],['center-only',12],['connected-walls',12]]){const row=probe(layout,count);rows.push(row);console.log(JSON.stringify({layout,count,groups:row.fixtureCropGroups.length,defense:row.defensiveGroups.length,budget:row.budgetInitial,spent:row.budgetSpent,spending:row.animalsSpending,retreatWithBudget:row.animalsRetreatingWithBudget,living:row.remainingLiving,ended:row.raidEnded}));writeFileSync(output+'/native-rows.json',JSON.stringify(rows,null,2)+'\n');}
 const files=['src/simulation/raids.js','src/simulation/crop-components.js','src/simulation/defensive-groups.js','src/simulation/actor-motion.js','src/world/navigation.js','tools/probe-raid-reservation-saturation.mjs'];writeFileSync(output+'/source.json',JSON.stringify({gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Explicit QA cohorts, controlled flat surface and native solids/RNG/entry/actor motion/hits. Not a biome campaign, GPU test or performance benchmark. No production edits.',sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2)+'\n');
}
