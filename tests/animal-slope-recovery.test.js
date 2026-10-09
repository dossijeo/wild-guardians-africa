import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Navigation} from '../src/world/navigation.js';
import {animalSlopeRecoveryPath,animalSlopeRecoveryClear} from '../src/simulation/animal-slope-recovery.js';
import {animalRouteClearance} from '../src/simulation/animal-route-clearance.js';
import {tick,walkTo} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';

const load=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-suajili-failure-37871996318/desierto-suajili-failure-state.json.gz',import.meta.url))).toString());
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
const navigator=s=>{const nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return nav;};
for(const dt of [.1,1])test(`legacy Desert/Suajili lion exits its marginal footprint physically at dt=${dt}`,()=>{
 const s=load(),nav=navigator(s),actor=s.raid.animals.find(a=>a.status==='retreating'),hits=actor.hitsRemaining,exit={...actor.exit};
 assert.equal(s.day,9);assert.equal(hits,6);assert.equal(nav.terrainValid(actor.x,actor.z,actor.radius,false),false);
 const origin={x:actor.x,z:actor.z},ended=s.events.filter(e=>e.type==='RaidEnded').length;
 for(let t=0;s.raid&&t<60;t+=dt){
  const before={x:actor.x,z:actor.z};tick(s,dt,nav);
  assert.ok(Math.hypot(actor.x-before.x,actor.z-before.z)<=3.8*dt+1e-8,'Native speed; no teleport');
  assert.equal(actor.hitsRemaining,hits,'Recovery does not spend or reset attack hits');
  assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Normal legal landings after the tiny first segment');
 }
 assert.equal(s.raid,null);assert.equal(s.day,10);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 assert.ok(Math.hypot(actor.x-exit.x,actor.z-exit.z)<1e-8);
 assert.equal(nav.terrainValid(origin.x,origin.z,actor.radius,false),false,'Ordinary slope rule was not changed');
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
for(const dt of [.1,1])test(`save/load during the tiny marginal exit preserves native continuation at dt=${dt}`,()=>{
 const a=load(),navA=navigator(a);tick(a,.00001,navA);
 const actor=a.raid.animals.find(a=>a.status==='retreating');
 assert.ok(actor.path?.length);assert.equal(navA.terrainValid(actor.x,actor.z,actor.radius,false),false);
 const b=deserialize(serialize(a)),navB=navigator(b);
 for(let t=0;a.raid&&t<60;t+=dt){tick(a,dt,navA);tick(b,dt,navB);assert.equal(serialize(a),serialize(b));}
 assert.equal(a.raid,null);assert.equal(b.raid,null);
});
function world(slope=x=>x<.01?.505:.49,fluid=()=>false){
 const nav=new Navigation(712,'sabana',{});nav.field={slope,fluidInside:fluid};nav.propsAt=()=>[];nav.version=1;return nav;
}
const animal=()=>({id:'legacy-lion',status:'retreating',x:0,z:0,radius:.05,hitsRemaining:6});
const exit={id:'exit-legacy-lion',x:4,z:0};
test('only retreating animals can use the recovery',()=>{
 for(const status of ['entering','walking','attacking']){
  const nav=world(),actor={...animal(),status};assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);
 }
});
test('steeper footprints, fluid, uphill escapes and solid structures remain forbidden',()=>{
 for(const nav of [world(()=>.52),world(undefined,()=>true),world(()=>.505),world((x,z)=>Math.hypot(x,z)<.4?.505+.004*Math.hypot(x,z):.49),world(undefined,x=>x>.01&&x<.03)]){
  const actor=animal();assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);
 }
 const nav=world();nav.obstacles=[{id:'house',kind:'house',x:0,z:0,radius:1}];
 const actor=animal();assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);
});
test('the special clearance rejects off-prefix, backward and dynamic-body movement',()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);actor.path=path;
 const first=path[0],middle={x:first.x*.5,z:first.z*.5};
 assert.equal(animalSlopeRecoveryClear(actor,nav,actor,{x:0,z:-.1},actor.radius),false);
 const blocked=animalRouteClearance(actor,nav,{radius:actor.radius,escapeProps:true},()=>false);
 assert.equal(blocked.clear(actor,middle),false);
 assert.equal(actor.x,0);assert.equal(actor.z,0);
 assert.ok(animalSlopeRecoveryClear(actor,nav,actor,middle,actor.radius));actor.x=middle.x;actor.z=middle.z;
 assert.equal(animalSlopeRecoveryClear(actor,nav,actor,{x:0,z:0},actor.radius),false);
});
test('a failed legacy recovery is memoized until geometry or origin changes',()=>{
 let calls=0;const nav=world(()=>{calls++;return .505;}),actor=animal();
 assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);const count=calls;assert.ok(count<=1605);
 for(let i=0;i<100;i++)assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);
 assert.equal(calls,count);nav.version++;animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(calls>count);
});
test('an ordinary legal retreat does not rescan a recovery proof each frame',()=>{
 let calls=0;const nav=world(()=>{calls++;return .49;}),actor=animal();actor.path=[{x:.4,z:0}];
 animalSlopeRecoveryClear(actor,nav,actor,{x:.01,z:0},actor.radius);const count=calls;
 for(let i=0;i<100;i++)assert.equal(animalSlopeRecoveryClear(actor,nav,actor,{x:.01,z:0},actor.radius),false);
 assert.equal(calls,count);
});

for(const kind of ['wall','shield'])test(`a new ${kind} invalidates a memoized marginal segment`,()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);actor.path=path;
 const point=path[0];nav.obstacles.push({id:'new-obstacle',kind,x:point.x,z:point.z,radius:1,yaw:0,material:'zarzas'});nav.version++;
 assert.equal(animalSlopeRecoveryClear(actor,nav,actor,point,actor.radius),false);
 assert.equal(actor.x,0);assert.equal(actor.z,0);
});
test('changing the first waypoint inside the same array cannot reuse the old proof',()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);actor.path=path;
 path[0].x=4;path[0].z=0;
 assert.equal(animalSlopeRecoveryClear(actor,nav,actor,{x:.01,z:0},actor.radius),false);
});
test('an unsampled real intermediate landing may not increase the slope excess',()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);actor.path=path;
 const end={x:path[0].x*.1,z:path[0].z*.1},ordinary=nav.field.slope;
 // A narrow real landing is absent from the prevalidated 0.025 m samples.
 nav.field.slope=(x,z)=>Math.hypot(x-end.x,z-end.z)<1e-9?.506:ordinary(x,z);
 const clearance=animalRouteClearance(actor,nav,{radius:actor.radius,escapeProps:true},null);
 assert.equal(clearance.clear(actor,end),false);assert.ok(clearance.blocked());
 assert.equal(actor.x,0);assert.equal(actor.z,0);
});
test('real fluid landing checks remain active inside a memoized recovery',()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);actor.path=path;
 const end={x:path[0].x*.1,z:path[0].z*.1};nav.field.fluidInside=(x,z)=>Math.hypot(x-end.x,z-end.z)<1e-9;
 const clearance=animalRouteClearance(actor,nav,{radius:actor.radius,escapeProps:true},null);
 assert.equal(clearance.clear(actor,end),false);assert.ok(clearance.blocked());
 assert.equal(actor.x,0);assert.equal(actor.z,0);
});
test('the normal strict landing limit resumes after consuming the first recovery waypoint',()=>{
 const nav=world(),actor=animal(),path=animalSlopeRecoveryPath(nav,actor,exit,actor.radius);assert.ok(path);
 actor.path=path;actor.destinationId=exit.id;actor.pathVersion=nav.version;
 const point={...path[0]},dt=Math.hypot(point.x,point.z)/3.8;
 walkTo({structures:[],workers:[],raid:{animals:[actor]}},actor,exit,dt,nav,{worker:false,expandRoute:true,speed:3.8});
 assert.ok(Math.hypot(actor.x-point.x,actor.z-point.z)<1e-8);
 assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false));
 assert.ok(Math.hypot(actor.path[0].x-point.x,actor.path[0].z-point.z)>.5);
 const end={x:actor.x+.01,z:actor.z},ordinary=nav.field.slope;
 nav.field.slope=(x,z)=>Math.hypot(x-end.x,z-end.z)<1e-9?.505:ordinary(x,z);
 const clearance=animalRouteClearance(actor,nav,{radius:actor.radius,escapeProps:true},null);
 assert.equal(clearance.clear(actor,end),false);assert.ok(clearance.blocked());
});

test('failed native tails have a finite candidate budget and do not repeat each frame',()=>{
 const nav=world(),actor=animal();let tails=0;nav.path=()=>{tails++;return null;};
 assert.equal(animalSlopeRecoveryPath(nav,actor,exit,actor.radius),null);assert.ok(tails>0&&tails<=160);
 const first=tails;for(let i=0;i<100;i++)animalSlopeRecoveryPath(nav,actor,exit,actor.radius);
 assert.equal(tails,first);
});
