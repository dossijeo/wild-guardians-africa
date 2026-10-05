import test from 'node:test';
import assert from 'node:assert/strict';
import {actorBlockers,actorSegmentClear} from '../src/simulation/actor-motion.js';
import {walkTo,newGame} from '../src/simulation/game.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {updateWorkerEncounters} from '../src/simulation/encounters.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {updateRaid,reachableApproach} from '../src/simulation/raids.js';
import {readFileSync} from 'node:fs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {edgeDistance} from '../src/world/footprints.js';

test('opposed animals route around each other when both short lookahead goals are occupied',()=>{
 const a={id:'outbound',x:94.1096081493741,z:14.519706064422435,radius:1.1,status:'retreating',hitsRemaining:0};
 const b={id:'inbound',x:95.98513086550021,z:17.985130865500206,radius:1.1,status:'walking',hitsRemaining:3};
 const state={workers:[],raid:{animals:[a,b]}},nav={version:1,path:(_a,p)=>[{x:p.x,z:p.z}],segmentClear:()=>true,walkable:()=>true};
 const pairs=[[a,{id:'exit',x:105.52299355996654,z:34.34482534604684},3.8],[b,{id:'crop',x:93.40403760684815,z:-2.84871152966769},1.5]];
 for(let step=0;step<600&&pairs.some(([actor])=>actor.status!=='gone');step++)for(const [actor,target,speed] of pairs){
  if(actor.status==='gone')continue;
  const other=actor===a?b:a,before={x:actor.x,z:actor.z};
  const arrived=walkTo(state,actor,target,.1,nav,{speed,worker:false});
  if(other.status!=='gone')assert.ok(edgeDistance(before,actor,other.x,other.z)>=a.radius+b.radius-1e-8,'Swept bodies must remain disjoint');
  if(arrived){assert.ok(Math.hypot(actor.x-target.x,actor.z-target.z)<1e-8);actor.status='gone';}
 }
 assert.equal(a.status,'gone');assert.equal(b.status,'gone');
});
test('recorded five-animal Musgum traffic clears without overlapping bodies or changing destination',()=>{
 const raid=JSON.parse(readFileSync(new URL('../docs/qa/raid-musgum-deadlock/raid-before.json',import.meta.url),'utf8'));
 const state={workers:[],raid},nav={version:4080,path:(_a,p)=>[{x:p.x,z:p.z}],segmentClear:()=>true,walkable:()=>true};
 const destinations=new Map(raid.animals.map(actor=>[actor.id,actor.status==='retreating'?{...actor.exit,id:'exit-'+actor.id}:actor.approach]));
 for(let step=0;step<600&&raid.animals.some(actor=>actor.status!=='gone');step++)for(const actor of raid.animals){
  if(actor.status==='gone')continue;
  const before={x:actor.x,z:actor.z},others=actorBlockers(state,actor,false),target=destinations.get(actor.id),speed=actor.status==='retreating'?3.8:1.5;
  const arrived=walkTo(state,actor,target,.1,nav,{speed,worker:false});
  assert.ok(Math.hypot(actor.x-before.x,actor.z-before.z)<=speed*.1+1e-8);
  assert.ok(actorSegmentClear(before,actor,actor,others),'Each swept native body must stay outside the others');
  if(arrived){assert.ok(Math.hypot(actor.x-target.x,actor.z-target.z)<1e-8);actor.status='gone';}
 }
 assert.ok(raid.animals.every(actor=>actor.status==='gone'));
});

function fixture(species='warthog'){
  const state=newGame({seed:712,slotId:'actor-clearance'});state.pauses=[];
  const animal={id:'animal',species,x:-4,z:0,status:'retreating',hitsRemaining:0,radius:ANIMAL_ACTIONS.animals[species].presentation.footprint.radius};
  const worker={id:'worker',personId:'person',profile:'olderMale',x:0,z:0,status:'fleeing',hits:0,runRemaining:50};
  state.workers=[worker];state.raid={id:'raid',animals:[animal],reservations:{}};
  const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];
  nav.walkCache=new Map();nav.segmentCache=new Map();nav.failedPaths=new Set();nav.closedRegions=new Map();nav.chunks=new Map();nav.setState(state);
  return {state,animal,worker,nav};
}
test('rejoining beyond occupied waypoints validates the entire retained shortcut around a solid building',()=>{
 const {state,animal,nav}=fixture();state.workers=[];
 Object.assign(animal,{id:'traveller',x:0,z:0,radius:.5,status:'retreating',hitsRemaining:0,path:[{x:1,z:3},{x:5,z:3},{x:8,z:0}],destinationId:'finish',pathVersion:nav.version});
 const others=[{id:'body-a',x:1,z:3},{id:'body-b',x:5,z:3}].map(a=>({...a,radius:.8,status:'walking',hitsRemaining:3,path:null}));
 state.raid.animals.push(...others);
 nav.obstacles=[{id:'solid-building',kind:'house',footprint:[{x:5,z:-.5},{x:6,z:-.5},{x:6,z:.5},{x:5,z:.5}]}];
 const target={id:'finish',x:8,z:0};
 let previous={x:animal.x,z:animal.z};
 for(const point of animal.path){assert.ok(nav.segmentClear(previous,point,.5,null,false),'The original bent route is valid');previous=point;}
 for(let step=0;step<30;step++){
  const before={x:animal.x,z:animal.z};walkTo(state,animal,target,.1,nav,{speed:3.8,worker:false});
  assert.ok(nav.segmentClear(before,animal,.5,null,false),'The unchecked tail of a shortcut must not cross the building');
  assert.ok(actorSegmentClear(before,animal,animal,others));
 }
 for(const other of others)other.status='gone';
 let arrived=false;
 for(let step=0;step<100&&!arrived;step++){
  const before={x:animal.x,z:animal.z};arrived=walkTo(state,animal,target,.1,nav,{speed:3.8,worker:false});
  assert.ok(nav.segmentClear(before,animal,.5,null,false));assert.ok(Math.hypot(animal.x-before.x,animal.z-before.z)<=.38+1e-8);
 }
 assert.ok(arrived);assert.deepEqual({x:animal.x,z:animal.z},{x:8,z:0});
});
for(const species of Object.keys(ANIMAL_ACTIONS.animals))test(`${species}: exhausted native body detours around a worker without a hit, speed increase or invalid segment`,()=>{
  const {state,animal,worker,nav}=fixture(species),destination={id:'exit',x:4,z:0},rng=state.rng,events=state.events.length;
  let arrived=false,detoured=false;
  for(let i=0;i<500&&!arrived;i++){
    const before={x:animal.x,z:animal.z};arrived=walkTo(state,animal,destination,.1,nav,{speed:3.8,worker:false});
    const travelled=Math.hypot(animal.x-before.x,animal.z-before.z);
    assert.ok(travelled<=.38+1e-8);assert.ok(edgeDistance(before,animal,worker.x,worker.z)>=animal.radius+.28-1e-8);
    assert.ok(nav.segmentClear(before,animal,animal.radius,null,false));detoured||=Math.abs(animal.z)>.3;
    updateWorkerEncounters(state,nav);
  }
  assert.ok(arrived);assert.ok(detoured);assert.equal(worker.hits,0);assert.equal(animal.hitsRemaining,0);
  assert.equal(state.rng,rng);assert.equal(state.events.length,events);
});
test('An occupied narrow static passage waits, keeps the exit, and resumes when the person reaches home',()=>{
  const {state,animal,worker,nav}=fixture();nav.field.slope=(_x,z)=>Math.abs(z)>1.2?1:0;
  const destination={id:'exit',x:4,z:0};
  for(let i=0;i<100;i++)walkTo(state,animal,destination,.1,nav,{speed:3.8,worker:false});
  assert.ok(animal.x<0);assert.ok(Math.hypot(animal.x,animal.z)>=animal.radius+.28);
  assert.equal(animal.destinationId,'exit');assert.ok(animal.path.length);assert.equal(worker.hits,0);
  worker.status='home';let arrived=false;
  for(let i=0;i<100&&!arrived;i++)arrived=walkTo(state,animal,destination,.1,nav,{speed:3.8,worker:false});
  assert.ok(arrived);
});
test('Workers avoid a retreating beast in both movement directions and charge only travelled running metres',()=>{
  const {state,animal,worker,nav}=fixture('rhino');animal.x=0;worker.x=-4;
  const destination={id:'home',x:4,z:0};let arrived=false,total=0;
  for(let i=0;i<500&&!arrived;i++){
    const before={x:worker.x,z:worker.z};arrived=walkTo(state,worker,destination,.1,nav,{motion:{flight:true}});
    const travelled=Math.hypot(worker.x-before.x,worker.z-before.z);total+=travelled;
    assert.ok(travelled<=.24+1e-8);assert.ok(edgeDistance(before,worker,animal.x,animal.z)>=animal.radius+.28-1e-8);
  }
  assert.ok(arrived);assert.ok(total>8);assert.equal(worker.runRemaining,50);assert.equal(worker.hits,0);
});
test('A worker blocked by a retreating body spends no reserve or gait time, then resumes the same paid route',()=>{
  const {state,animal,worker,nav}=fixture();animal.x=0;worker.x=-1.4;
  // The destination itself is temporarily occupied, so no alternate endpoint
  // may replace it or count as an arrival.
  const destination={id:'delivery',x:0,z:0},position={x:worker.x,z:worker.z};
  for(let i=0;i<50;i++)assert.equal(walkTo(state,worker,destination,.1,nav,{motion:{urgent:true}}),false);
  assert.deepEqual({x:worker.x,z:worker.z},position);assert.equal(worker.runRemaining,50);assert.equal(worker.runPhase??0,0);assert.equal(worker.walkPhase??0,0);
  animal.status='gone';let arrived=false;
  for(let i=0;i<50&&!arrived;i++)arrived=walkTo(state,worker,destination,.1,nav,{motion:{urgent:true}});
  assert.ok(arrived);assert.ok(Math.abs(worker.runRemaining-48.6)<1e-8);assert.ok(Math.abs(worker.runPhase-1.4/2.4)<1e-8);
});
test('Two native animals crossing opposite ways maintain separation and both finish',()=>{
  const {state,animal:a,nav}=fixture('rhino');state.workers=[];
  const b={...a,id:'other',species:'warthog',radius:1.1,x:4};state.raid.animals.push(b);
  let doneA=false,doneB=false;
  for(let i=0;i<500&&(!doneA||!doneB);i++){
    for(const [actor,destination] of [[a,{id:'right',x:4,z:0}],[b,{id:'left',x:-4,z:0}]]){
      const other=actor===a?b:a,before={x:actor.x,z:actor.z};
      const done=walkTo(state,actor,destination,.1,nav,{speed:3.8,worker:false});
      assert.ok(edgeDistance(before,actor,other.x,other.z)>=a.radius+b.radius-1e-8);
      if(actor===a)doneA=done;else doneB=done;
    }
  }
  assert.ok(doneA&&doneB);
});
test('Saving midway through a detour preserves its route and deterministic motion',()=>{
  const {state,animal,nav}=fixture(),destination={id:'exit',x:4,z:0};
  for(let i=0;i<10;i++)walkTo(state,animal,destination,.1,nav,{speed:3.8,worker:false});
  const loaded=deserialize(serialize(state)),copy=loaded.raid.animals[0];
  for(let i=0;i<20;i++){
    walkTo(state,animal,destination,.1,nav,{speed:3.8,worker:false});
    walkTo(loaded,copy,destination,.1,nav,{speed:3.8,worker:false});
    assert.deepEqual(copy.path,animal.path);assert.equal(copy.x,animal.x);assert.equal(copy.z,animal.z);
  }
});
test('Physical clearance preserves active encounters but protects incapacitated people and exhausted states',()=>{
  const {state,animal,worker}=fixture();animal.status='walking';animal.hitsRemaining=4;
  assert.deepEqual(actorBlockers(state,animal,false),[]);assert.deepEqual(actorBlockers(state,worker,true),[]);
  worker.incapacitated=true;assert.deepEqual(actorBlockers(state,animal,false),[worker]);assert.deepEqual(actorBlockers(state,worker,true),[animal]);
  worker.incapacitated=false;animal.hitsRemaining=0;
  assert.deepEqual(actorBlockers(state,animal,false),[worker]);assert.deepEqual(actorBlockers(state,worker,true),[animal]);
});
test('Legacy overlaps may escape continuously but cannot move deeper or across the other body',()=>{
  const actor={x:.5,z:0,radius:1},other={x:0,z:0,radius:.28};
  assert.ok(actorSegmentClear(actor,{x:.6,z:0},actor,[other]));
  assert.equal(actorSegmentClear(actor,{x:.4,z:0},actor,[other]),false);
  assert.equal(actorSegmentClear(actor,{x:-2,z:0},actor,[other]),false);
});
test('Crowded crop approaches are recomputed outside the other native bodies and the raid completes',()=>{
  const {state,nav}=fixture();state.workers=[];
  state.plants=[
    {id:'p1',x:228,z:34.5,species:'girasol',alive:true},
    {id:'p2',x:229.5,z:37.5,species:'algodon',alive:true},
    {id:'p3',x:229.5,z:36,species:'mijo',alive:true},
  ];
  const positions=[{x:227.22116184604198,z:38.71665819998091},{x:229.4568819476586,z:38.213292840660856},{x:230.85130729924077,z:36.35359311983204}];
  const endpoints=[{x:228.02329430016135,z:36.19984039709026},{x:228.1428473826314,z:38.562904498557636},{x:228.90047862620932,z:37.558078280994366}];
  const animals=positions.map((p,i)=>({id:'crowd-'+i,species:'warthog',...p,radius:1.1,hitsRemaining:2,status:'walking',targetId:state.plants[i].id,reservation:'crop:'+state.plants[i].id,spawn:{x:176.5936382952636,z:34.34991014827507+i*4},path:[endpoints[i]],approach:{id:'occupied-'+i,...endpoints[i]},destinationId:'occupied-'+i,pathVersion:nav.version}));
  state.raid.animals=animals;state.raid.reservations=Object.fromEntries(animals.map(a=>[a.reservation,a.id]));
  assert.equal(actorSegmentClear(endpoints[1],endpoints[1],animals[1],[animals[0],animals[2]]),false);
  const approach=reachableApproach(animals[1],state.plants[1],nav);
  assert.ok(approach);assert.ok(actorSegmentClear(approach.point,approach.point,animals[1],[animals[0],animals[2]]));
  for(let i=0;i<3000&&state.raid;i++){
    state.elapsed+=.1;updateRaid(state,.1,nav);
    for(let a=0;a<animals.length;a++)for(let b=a+1;b<animals.length;b++)if(animals[a].status!=='gone'&&animals[b].status!=='gone')assert.ok(Math.hypot(animals[a].x-animals[b].x,animals[a].z-animals[b].z)>=2.2-1e-8);
  }
  assert.equal(state.raid,null);assert.ok(animals.every(a=>a.status==='gone'));assert.ok(state.events.some(e=>e.type==='AnimalLogicalHit'));
});

test('Sabana/712: two native animals rejoin beyond occupied waypoints without permanent waiting or clipping',()=>{
 const {s,nav}=createOpeningWorld(),animals=JSON.parse(readFileSync(new URL('./fixtures/actor-rejoin-sabana.json',import.meta.url)));
 s.workers=[];s.raid={id:'recorded-rejoin',animals,reservations:{}};nav.setState(s);
 for(const a of animals)a.pathVersion=nav.version;
 const arrived=new Set();
 for(let i=0;i<600&&arrived.size<animals.length;i++)for(const a of animals){
  if(arrived.has(a.id))continue;
  const before={x:a.x,z:a.z},others=actorBlockers(s,a,false);
  if(walkTo(s,a,a.approach,.1,nav,{speed:3.8,worker:false}))arrived.add(a.id);
  assert.ok(Math.hypot(a.x-before.x,a.z-before.z)<=.38+1e-8);
  assert.ok(actorSegmentClear(before,a,a,others),'preserve native body separation');
  assert.ok(nav.segmentClear(before,a,a.radius,null,false),'preserve terrain and prop clearance');
 }
 assert.equal(arrived.size,2);
 for(const a of animals)assert.deepEqual({x:a.x,z:a.z},{x:a.approach.x,z:a.approach.z});
});
