import test from 'node:test';import assert from 'node:assert/strict';
import {topologyFixture} from '../tools/probe-raid-entry-topology.mjs';import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';import {createPlant} from '../src/simulation/crops.js';import {resolveAgriculturalImpact,agriculturalQueryStats,invalidateAgriculturalIndex,agriculturalRayClear,validDamageProfile} from '../src/simulation/raid-agricultural-impact.js';import {serialize,deserialize} from '../src/persistence/snapshots.js';import {reachableApproach,spawnRaid,updateRaid} from '../src/simulation/raids.js';
const profile={cropDamage:1,structureDamage:25,attackRadius:3,areaCap:7,peripheralWeight:.5};
function scene(points=[[40,0],[40,1],[40,-1],[41,1],[43,0]]){const {s,nav}=fixture('mono');s.plants=points.map(([x,z],i)=>createPlant('p'+i,'mijo',x,z,'center'));const a={id:'animal',species:'warthog',x:40,z:-1.7,radius:1.1,heading:0,spawn:{x:40,z:-1.7},exit:{x:40,z:-4.7},status:'attacking',hitsRemaining:4,attackId:'attack-1',damageProfile:{...profile}};s.raid={animals:[a],reservations:{},id:'qa'};nav.setState(s);assert(nav.walkable(a.x,a.z,a.radius,null,false));return {s,nav,a,target:s.plants[0]};}
test('central full damage, frontal90-degree periphery half damage and maximum radius are physical',()=>{const {s,nav,a,target}=scene(),fact=resolveAgriculturalImpact(s,a,target,nav);assert.deepEqual(fact.hits.map(h=>[h.targetId,h.damage,h.central]),[['p0',1,true],['p1',.5,false],['p3',.5,false]]);assert.equal(s.plants[2].attackHits,undefined);assert.equal(s.plants[4].attackHits,undefined);});
test('sector follows current contact heading and rejects a backward or remote contact',()=>{for(const variant of ['backward','remote']){const {s,nav,a,target}=scene();if(variant==='backward')a.heading=Math.PI;else a.z=-8;assert.equal(resolveAgriculturalImpact(s,a,target,nav).blocked,'contact');assert(s.plants.every(p=>p.attackHits===undefined));}});
test('a radius-zero or damage-zero profile never manufactures peripheral hits or mandatory deaths',()=>{const {s,nav,a,target}=scene();a.damageProfile.attackRadius=0;assert.equal(resolveAgriculturalImpact(s,a,target,nav).hits.length,1);a.attackId='attack-2';a.damageProfile.cropDamage=0;assert.equal(resolveAgriculturalImpact(s,a,target,nav).hits.length,0);assert.equal(target.alive,false);assert(s.plants.slice(1).every(p=>p.alive));});
test('area cap prioritizes the central plant then nearest legal physical candidates',()=>{const {s,nav,a,target}=scene([[40,0],[40,.8],[40,1.6],[40,2.4]]);a.damageProfile.areaCap=2;assert.deepEqual(resolveAgriculturalImpact(s,a,target,nav).hits.map(h=>h.targetId),['p0','p1']);});
for(const gate of [false,true])test(`native wall footprint occludes peripheral impacts, including animal-blocking gate=${gate}`,()=>{const {s,nav,a,target}=scene([[40,0],[40,2]]);s.structures.push({id:'wall',kind:'wall',x:40,z:1,yaw:0,material:'adobe',gate,hp:100,maxHp:100,status:'intact'});nav.setState(s);assert.equal(agriculturalRayClear(s,nav,target,s.plants[1]),false);assert.deepEqual(resolveAgriculturalImpact(s,a,target,nav).hits.map(h=>h.targetId),['p0']);});
test('an animal cannot hit a crop through a wall seam narrower than its body',()=>{
 const {s,nav,a,target}=scene([[40,0],[40,2]]);
 const piece=(id,x,length)=>({id,kind:'wall',x,z:1,yaw:0,material:'zarzas',
  baseScaleX:length/2.18,hp:100,maxHp:100,status:'intact'});
 const left=piece('left',38.98,1.96),right=piece('right',41.02,1.96);
 s.structures.push(left,right);nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1]),true,'the thin visual ray fits through the seam');
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],a.radius),false);
 assert.deepEqual(resolveAgriculturalImpact(s,a,target,nav).hits.map(h=>h.targetId),['p0']);
 left.status='ruined';nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],a.radius),true,
  'the formerly protected crop becomes exposed when the barrier is ruined');
});
test('a wall-to-building seam narrower than the animal blocks crop splash',()=>{
 const {s,nav,a,target}=scene([[40,0],[40,2]]);
 s.structures.push({id:'left-wall',kind:'wall',x:38.98,z:1,yaw:0,material:'zarzas',
  baseScaleX:1.96/2.18,hp:100,maxHp:100,status:'intact'});
 s.villages.push({id:'seam-village',x:60,z:0,buildings:[{key:'seam-house',kind:'Edificio',x:41.02,z:1,
  footprint:[{x:40.04,z:.78},{x:42,z:.78},{x:42,z:1.22},{x:40.04,z:1.22}]}]});
 nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1]),true,'the thin ray passes through the seam');
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],a.radius),false);
 assert.deepEqual(resolveAgriculturalImpact(s,a,target,nav).hits.map(h=>h.targetId),['p0']);
 s.structures.at(-1).status='ruined';nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],a.radius),true,
  'the building does not keep an already ruined wall opaque');
});
test('a wide wall opening remains attackable for an animal that can fit through it',()=>{
 const {s,nav,a,target}=scene([[40,0],[40,2]]);
 const piece=(id,x)=>({id,kind:'wall',x,z:1,yaw:0,material:'zarzas',
  baseScaleX:1/1.09,hp:100,maxHp:100,status:'intact'});
 s.structures.push(piece('left',38.5),piece('right',41.5));nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],.4),true);
 assert.equal(agriculturalRayClear(s,nav,target,s.plants[1],a.radius),false);
});
test('a committed introductory strike cannot exploit a narrow seam after save and load',()=>{
 const {s,nav,a,target}=scene([[40,0]]);delete a.damageProfile;
 Object.assign(a,{targetId:target.id,reservation:`crop:${target.id}`,
  attackDuration:1,attackRemaining:.1,animation:'Right_Hand_Sword_Slash',hitApplied:false});
 s.raid.reservations[a.reservation]=a.id;
 for(const [id,x] of [['left',38.98],['right',41.02]])s.structures.push({
  id,kind:'wall',x,z:-.35,yaw:0,material:'zarzas',baseScaleX:1.96/2.18,
  hp:100,maxHp:100,status:'intact'});
 nav.setState(s);
 const restored=deserialize(serialize(s));nav.setState(restored);updateRaid(restored,.1,nav);
 assert.equal(restored.plants[0].attackHits,undefined);
 assert.equal(restored.events.filter(e=>e.type==='CropHit').length,0);
 assert.equal(restored.events.filter(e=>e.type==='AnimalLogicalMiss').length,1);
});
test('a wall between actor and impact prevents a central hit rather than producing splash behind it',()=>{const {s,nav,a,target}=scene();s.structures.push({id:'wall',kind:'wall',x:40,z:-.35,yaw:0,material:'zarzas',hp:100,maxHp:100,status:'intact'});nav.setState(s);assert.equal(resolveAgriculturalImpact(s,a,target,nav).blocked,'contact');assert(s.plants.every(p=>p.alive&&p.attackHits===undefined));});
test('an introductory crop strike cannot pass through an intact wall',()=>{
 const {s,nav,a,target}=scene([[40,0]]);
 delete a.damageProfile;
 Object.assign(a,{targetId:target.id,reservation:`crop:${target.id}`,
  attackDuration:1,attackRemaining:.1,animation:'Right_Hand_Sword_Slash',
  hitApplied:false});
 s.raid.reservations[a.reservation]=a.id;
 const wall={id:'intro-wall',kind:'wall',x:40,z:-.35,yaw:0,
  material:'zarzas',hp:100,maxHp:100,status:'intact'};
 s.structures.push(wall);
 nav.setState(s);
 assert.equal(agriculturalRayClear(s,nav,a,target),false);
 const reloaded=deserialize(serialize(s));
 nav.setState(reloaded);updateRaid(reloaded,.1,nav);
 assert.equal(reloaded.plants[0].attackHits,undefined);
 nav.setState(s);
 updateRaid(s,.1,nav);
 assert.deepEqual({cropHits:reloaded.plants[0].attackHits,
  budget:reloaded.raid.animals[0].hitsRemaining,
  misses:reloaded.events.filter(e=>e.type==='AnimalLogicalMiss').length,
  damage:reloaded.events.filter(e=>e.type==='CropHit').length},
 {cropHits:target.attackHits,budget:a.hitsRemaining,
  misses:s.events.filter(e=>e.type==='AnimalLogicalMiss').length,
  damage:s.events.filter(e=>e.type==='CropHit').length},
 'Saving during a committed blocked attack preserves its physical outcome');
 assert.equal(target.attackHits,undefined);
 assert.equal(a.hitsRemaining,3);
 assert.equal(s.events.filter(e=>e.type==='CropHit').length,0);
 assert.equal(s.events.filter(e=>e.type==='AnimalLogicalMiss').length,1);
 wall.status='ruined';nav.setState(s);
 Object.assign(a,{status:'attacking',attackId:'attack-after-ruin',
  attackRemaining:.1,hitApplied:false});
 updateRaid(s,.1,nav);
 assert.equal(target.attackHits,1);
 assert.equal(s.events.filter(e=>e.type==='CropHit').length,1);
 assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,1);
});
test('crop approach selection rejects a reachable position whose attack ray crosses a wall',()=>{
 const {s,nav,a,target}=scene([[40,0]]);
 s.structures.push({id:'approach-wall',kind:'wall',x:40,z:-.35,yaw:0,
  material:'zarzas',hp:100,maxHp:100,status:'intact'});
 nav.setState(s);
 const outsideOnly={state:s,obstacles:nav.obstacles,version:nav.version,
  walkable:(x,z)=>Math.abs(x-40)<.01&&z<0,
  approachPath:(_actor,point)=>[point]};
 assert.equal(agriculturalRayClear(s,outsideOnly,a,target),false);
 assert.equal(reachableApproach(a,target,outsideOnly),null);
});
test('a native centre footprint blocks rays and is re-evaluated after removal',()=>{const {s,nav}=scene();const c=s.structures[0];assert.equal(agriculturalRayClear(s,nav,{x:c.x-20,z:c.z},{x:c.x+20,z:c.z}),false);c.status='ruined';assert(agriculturalRayClear(s,nav,{x:c.x-20,z:c.z},{x:c.x+20,z:c.z}));});
test('Shield protects each peripheral plant and blocks a crossing ray outside its endpoint',()=>{const {s,nav,a,target}=scene([[40,0],[40,2],[41,2]]);s.spells=[{id:'shield',kind:'shield',x:40,z:1.5,radius:.4,remaining:10}];nav.setState(s);const fact=resolveAgriculturalImpact(s,a,target,nav);assert.deepEqual(fact.hits.map(h=>h.targetId),['p0','p2']);assert.equal(s.plants[1].attackHits,undefined);});
test('a shielded central target consumes no crop HP',()=>{const {s,nav,a,target}=scene();s.spells=[{id:'shield',kind:'shield',x:40,z:0,radius:.4,remaining:10}];nav.setState(s);assert.equal(resolveAgriculturalImpact(s,a,target,nav).blocked,'shield');assert.equal(target.attackHits,undefined);});
test('one attack is deduplicated across replay/save and fractional damage persists exactly',()=>{let {s,nav,a,target}=scene();const first=resolveAgriculturalImpact(s,a,target,nav);assert.equal(first.hits.length,3);assert(resolveAgriculturalImpact(s,a,target,nav).duplicate);const restored=deserialize(serialize(s));assert.equal(restored.plants[1].attackHits,.5);assert(resolveAgriculturalImpact(restored,restored.raid.animals[0],restored.plants[0],nav).duplicate);});
test('intro destruction cap survives central4 and peripheral2 damage, retaining a living farm',()=>{const {s,nav,a,target}=scene([[40,0],[40,1],[40,2],[40,3]]);a.damageProfile.cropDamage=4;s.raid.introPlantCount=4;s.raid.introCropLimit=1;s.raid.introCropsDestroyed=0;const fact=resolveAgriculturalImpact(s,a,target,nav);assert.equal(s.plants.filter(p=>!p.alive).length,1);assert.equal(s.raid.introCropsDestroyed,1);assert.deepEqual(fact.hits.map(h=>h.after),[1]);});
test('grid handles append, death, native position epoch and replacement without scanning all crops per hit',()=>{const {s,nav,a,target}=scene([[40,0],[40,1]]);for(let i=0;i<4000;i++)s.plants.push(createPlant('far'+i,'mijo',500+i*2,500,'center'));resolveAgriculturalImpact(s,a,target,nav);const stats=agriculturalQueryStats(s.plants);assert(stats.visited<10);a.attackId='attack-2';const replacement=createPlant('replacement','mijo',40,0,'center');s.plants.push(replacement);s.plants[1].alive=false;const newPlant=createPlant('new','mijo',40,1.5,'center');s.plants.push(newPlant);assert(resolveAgriculturalImpact(s,a,replacement,nav).hits.some(h=>h.targetId==='new'));assert.equal(agriculturalQueryStats(s.plants).builds,1);
 a.attackId='attack-3';newPlant.x=600;const fresh=createPlant('fresh','mijo',40,0,'center');s.plants.push(fresh);nav.setState(s);assert(!resolveAgriculturalImpact(s,a,fresh,nav).hits.some(h=>h.targetId==='new'));assert.equal(agriculturalQueryStats(s.plants).builds,2);invalidateAgriculturalIndex(s.plants);assert.equal(agriculturalQueryStats(s.plants),null);
});
test('profile and crop fractional bounds reject corrupt saves while supporting legacy integer HP',()=>{const {s,a}=scene();for(const patch of [{attackRadius:16},{areaCap:128},{cropDamage:5},{structureDamage:91},{peripheralWeight:.25}])assert.equal(validDamageProfile({...profile,...patch}),false);assert.doesNotThrow(()=>serialize(s));a.damageProfile.areaCap=128;assert.throws(()=>serialize(s));a.damageProfile.areaCap=7;delete s.plants[0].attackHitPoints;for(const bad of [-.5,.25,2.5,Infinity]){s.plants[0].attackHits=bad;assert.throws(()=>serialize(s));}s.plants[0].attackHits=1.5;assert.doesNotThrow(()=>serialize(s));s.plants[0].attackHits=2;assert.throws(()=>serialize(s));s.plants[0].alive=false;assert.doesNotThrow(()=>serialize(s));});
for(const species of ['warthog','hyena','buffalo','lion','rhino'])for(const dt of [.1,1])test(`native ${species} profile completes real melee, one impact per attack, dt${dt}`,()=>{const {s,nav}=fixture('mono');assert(spawnRaid(s,{group:[species]},nav));const raid=s.raid;raid.animals[0].damageProfile={...profile,cropDamage:2};const initial=raid.animals[0].hitsRemaining;for(let i=0;i<400/dt&&s.raid;i++){s.elapsed+=dt;updateRaid(s,dt,nav);}assert.equal(s.raid,null);const facts=s.events.filter(e=>e.type==='AnimalLogicalHit');assert.equal(facts.length,initial);assert.equal(new Set(facts.map(e=>e.attackId)).size,initial);assert(facts.every(e=>e.agriculturalImpact));assert(s.events.some(e=>e.type==='CropHit'&&e.damage===1&&e.requestedDamage===2&&e.central));assert(s.plants.some(p=>!p.alive));});

test('a native wall strike uses structural profile damage but never applies agricultural splash',()=>{
 const {s,nav}=topologyFixture('closed');s.day=20;nav.setRaidView({x:0,z:30},{x:0,z:0});assert(spawnRaid(s,{group:['warthog']},nav));s.raid.animals[0].damageProfile={...profile,structureDamage:90,cropDamage:4};
 for(let i=0;i<1500&&!s.events.some(e=>e.type==='StructureHit');i++){s.elapsed+=.1;updateRaid(s,.1,nav);}const event=s.events.find(e=>e.type==='StructureHit');assert(event);assert.equal(event.structureHit.previousHp-event.structureHit.hp,90);assert.equal(s.events.filter(e=>e.type==='CropHit').length,0);assert.equal(s.plants.filter(p=>p.alive).length,1);
});
test('native saved attack resumes once and does not duplicate event facts',()=>{
 let {s,nav}=fixture('mono');assert(spawnRaid(s,{group:['warthog']},nav));s.raid.animals[0].damageProfile={...profile};
 for(let i=0;i<1500&&s.raid.animals[0].status!=='attacking';i++){s.elapsed+=.1;updateRaid(s,.1,nav);}const attack=s.raid.animals[0].attackId;assert(attack);s=deserialize(serialize(s));nav.setState(s);for(let i=0;i<4000&&s.raid;i++){s.elapsed+=.1;updateRaid(s,.1,nav);}assert.equal(s.raid,null);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId===attack).length,1);assert(s.events.some(e=>e.type==='CropHit'&&e.central&&e.damage===1));
});

test('native committed contact writes half-point HP, reload preserves it and applied attacks cannot hit twice',()=>{
 let {s,nav,a,target}=scene([[40,0],[40,1]]);Object.assign(a,{targetId:target.id,hitApplied:false,attackDuration:1,attackRemaining:.1,animation:'Right_Hand_Sword_Slash'});
 updateRaid(s,.1,nav);assert.equal(s.plants[1].attackHits,.5);assert.equal(s.events.filter(e=>e.type==='CropHit').length,2);
 s=deserialize(serialize(s));nav.setState(s);assert.equal(s.plants[1].attackHits,.5);a=s.raid.animals[0];assert(a.hitApplied);const id=a.attackId;updateRaid(s,0,nav);assert.equal(s.plants[1].attackHits,.5);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit'&&e.attackId===id).length,1);
});

test('live wall collapse remains occluding until ruined, and new topology invalidates cached geometry',()=>{
 const {s,nav,a,target}=scene([[40,0],[40,2]]);a.damageProfile.cropDamage=0;resolveAgriculturalImpact(s,a,target,nav);a.damageProfile.cropDamage=1;
 const wall={id:'new-wall',kind:'wall',x:40,z:1,yaw:0,material:'adobe',hp:0,maxHp:100,status:'collapsing'};s.structures.push(wall);nav.setState(s);
 a.attackId='later-attack';assert.deepEqual(resolveAgriculturalImpact(s,a,target,nav).hits.map(h=>h.targetId),['p0']);
 wall.status='ruined';assert(agriculturalRayClear(s,nav,target,s.plants[1]));
});
test('maximal canonical profile and its bounded living queries are valid; malformed and replay IDs are not',()=>{
 const {s,nav,a,target}=scene();a.damageProfile={cropDamage:4,structureDamage:90,attackRadius:3.64,areaCap:7,peripheralWeight:.5};assert(validDamageProfile(a.damageProfile));
 a.damageProfile.attackRadius=NaN;assert.equal(resolveAgriculturalImpact(s,a,target,nav).blocked,'invalid-profile');assert.equal(target.attackHits,undefined);
 a.damageProfile.attackRadius=3.64;a.agriculturalAttackIds=['duplicate','duplicate'];assert.throws(()=>serialize(s));a.agriculturalAttackIds=[''];assert.throws(()=>serialize(s));a.agriculturalAttackIds=Array.from({length:65},(_,i)=>'id'+i);assert.throws(()=>serialize(s));
});
