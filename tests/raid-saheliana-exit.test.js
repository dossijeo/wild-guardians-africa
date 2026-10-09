import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';
const load=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-saheliana-failure-37868567780/desierto-saheliana-failure-state.json.gz',import.meta.url))).toString());
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
const navigator=s=>{const nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return nav;};
for(const dt of [.1,1])test(`recorded Saheliana night25 physically leaves the fractional passage at dt=${dt}`,()=>{
 const s=load(),nav=navigator(s),actors=s.raid.animals,exits=actors.map(a=>({...a.exit}));
 assert.equal(s.day,25);assert.equal(actors.length,3);assert.equal(s.workers.filter(w=>w.status!=='home').length,0);
 const actor=actors[1];assert.equal(actor.status,'retreating');assert.equal(actor.hitsRemaining,0);
 assert.equal(nav.path(actor,actor.exit,actor.radius,null,false),null,'Recorded grid failure is genuine');
 const ended=s.events.filter(e=>e.type==='RaidEnded').length;
 for(let t=0;s.raid&&t<30;t+=dt){
  const before={x:actor.x,z:actor.z};tick(s,dt,nav);
  assert.ok(Math.hypot(actor.x-before.x,actor.z-before.z)<=3.8*dt+1e-8,'No teleport or increased speed');
  assert.ok(nav.segmentClear(before,actor,actor.radius,null,false),'Every actual step clears native terrain and buildings');
  assert.equal(actor.hitsRemaining,0);
 }
 assert.equal(s.raid,null);assert.equal(s.day,26);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 actors.forEach((a,i)=>assert.ok(Math.hypot(a.x-exits[i].x,a.z-exits[i].z)<1e-8));
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
test('pending fractional search saves and resumes with exactly the same native state',()=>{
 const a=load(),navA=navigator(a);tick(a,.1,navA);
 assert.ok(a.raid.animals[1].exitConnectorSearch?.next>0);
 const b=deserialize(serialize(a)),navB=navigator(b);
 for(let i=0;i<80;i++){tick(a,.1,navA);tick(b,.1,navB);assert.equal(serialize(a),serialize(b));}
 assert.equal(a.raid,null);assert.equal(a.day,26);
});
test('impossible connector searches are bounded, exhausted once and reset on geometry changes',()=>{
 let calls=0;const nav={version:1,walkable:()=>{calls++;return false;},segmentClear:()=>false};
 const actor={x:0,z:0,radius:1},end={x:10,z:10};
 for(let i=0;i<30;i++){const before=calls;assert.equal(animalExitConnector(actor,end,nav),null);assert.ok(calls-before<=16);}
 assert.equal(calls,200);animalExitConnector(actor,end,nav);assert.equal(calls,200);
 nav.version++;animalExitConnector(actor,end,nav);assert.equal(calls,208);
});
test('snapshot rejects corrupt connector cursors while older snapshots remain valid',()=>{
 const s=load();assert.doesNotThrow(()=>serialize(s));
 for(const bad of [{key:'x',next:-1},{key:'x',next:193},{key:'x',next:NaN},{key:1,next:0}]){
  s.raid.animals[1].exitConnectorSearch=bad;assert.throws(()=>serialize(s),/Conector/);
 }
});
