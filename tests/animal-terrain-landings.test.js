import test from 'node:test';
import assert from 'node:assert/strict';
import {animalRouteClearance} from '../src/simulation/animal-route-clearance.js';
import {simulateIntensiveFarm,auditIntensiveFarm} from '../tools/check_intensive_farm.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Navigation} from '../src/world/navigation.js';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';

test('a reused sampled route cannot land an animal on an illegal slope',()=>{
 const actor={x:0,z:0,path:[{x:10,z:0}]};
 const nav={version:1,segmentClear:()=>true,terrainValid:x=>x<.2||x>.3};
 assert.ok(animalRouteClearance(actor,nav,{radius:.85},null).clear(actor,{x:.1,z:0}));
 actor.x=.1;
 const guard=animalRouteClearance(actor,nav,{radius:.85},null);
 assert.equal(guard.clear(actor,{x:.25,z:0}),false);
 assert.ok(guard.blocked());
 assert.equal(actor.x,.1,'Clearance never relocates the animal');
});

test('current native Desert/Suajili night9 keeps every actually spawned animal on legal terrain',()=>{
 let observed=0;const identities=new Set();
 const report=simulateIntensiveFarm({days:9,seed:712,biome:'desierto',culture:'suajili',mixed:true,onTick(s,nav){
  if(s.day!==9)return;
  for(const actor of s.raid?.animals??[]){
   observed++;identities.add(actor.id);
   assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Every actual landing obeys the unchanged native slope/fluid limit');
  }
 }});
 assert.ok(observed>0);assert.ok(identities.size>0);
 assert.equal(report.completedNights,9);assert.equal(report.state.day,10);
 assert.equal(report.state.raid,null);assert.notEqual(report.result,'defeat');
 auditIntensiveFarm(report,{victory:false});
});

// Preserve the precise old counterexample independently of current harvest
// prices, RNG trajectory, plant IDs or the composition of a new night 9.
const beforeUnsafe=()=>{
 const bytes=gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-suajili-failure-37871996318/suajili9-before-unsafe-state.json.gz',import.meta.url)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'2035a5c6987120f11bf3c5c7cdf4a5d9b95f377761073d701d1d5c2b4f2584eb');
 return deserialize(bytes.toString('utf8'));
};
const nativeNavigator=s=>{
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
 const nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return nav;
};
for(const dt of [.1,1])test(`historic legal-start Desert/Suajili lion animal-8183 avoids the exact unsampled landing at dt=${dt}`,()=>{
 const s=beforeUnsafe(),nav=nativeNavigator(s),actor=s.raid.animals.find(a=>a.id==='animal-8183');
 assert.ok(actor);assert.equal(actor.species,'lion');assert.equal(s.day,9);
 assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Original start must be legal; this tests prevention rather than recovery');
 const ended=s.events.filter(e=>e.type==='RaidEnded').length;
 let observed=0;
 for(let elapsed=0;s.raid&&elapsed<180;elapsed+=dt){
  const origin={x:actor.x,z:actor.z};tick(s,dt,nav);observed++;
  assert.ok(Math.hypot(actor.x-origin.x,actor.z-origin.z)<=3.8*dt+1e-8,'No relocation or accelerated movement');
  assert.ok(nav.terrainValid(actor.x,actor.z,actor.radius,false),'Every real landing retains original slope/fluid rules');
 }
 assert.ok(observed>0);assert.equal(s.raid,null);
 assert.equal(actor.status,'gone');assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 // The legal-start snapshot exits before dawn. Completing an attack is not
 // itself a day transition; advance the unchanged night to its real boundary.
 if(s.day===9)tick(s,600-s.time,nav);
 assert.equal(s.day,10);
 assert.notEqual(s.result,'defeat');assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
