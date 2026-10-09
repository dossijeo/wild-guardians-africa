import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';
const load=()=>deserialize(gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/desierto-saheliana-failure-37870712064/desierto-saheliana-failure-state.json.gz',import.meta.url))).toString());
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
const navigator=s=>{const nav=new Navigation(s.seed,s.biome,pack.profile);nav.setState(s);return nav;};
for(const dt of [.1,1])test(`recorded Saheliana night28 leaves the winding fractional passage at dt=${dt}`,()=>{
 const s=load(),nav=navigator(s),actor=s.raid.animals.find(a=>a.status==='retreating'),exit={...actor.exit};
 assert.equal(s.day,28);assert.equal(actor.hitsRemaining,0);assert.equal(actor.exitConnectorSearch.next,192);
 assert.equal(nav.path(actor,exit,actor.radius,null,false),null);
 let path=actor.path;Object.defineProperty(actor,'path',{enumerable:true,configurable:true,get:()=>path,set:value=>{if(value)for(let i=0;i<value.length;i++)assert.ok(nav.segmentClear(i?value[i-1]:actor,value[i],actor.radius,null,false),'Every actual route leg has native swept clearance');path=value;}});
 const ended=s.events.filter(e=>e.type==='RaidEnded').length;
 for(let t=0;s.raid&&t<120;t+=dt){
  const before={x:actor.x,z:actor.z};tick(s,dt,nav);
  assert.ok(Math.hypot(actor.x-before.x,actor.z-before.z)<=3.8*dt+1e-8);
  assert.ok(nav.walkable(actor.x,actor.z,actor.radius,null,false));
  if(dt===.1)assert.ok(nav.segmentClear(before,actor,actor.radius,null,false));
  assert.equal(actor.hitsRemaining,0);
 }
 assert.equal(s.raid,null);assert.equal(s.day,29);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 assert.ok(Math.hypot(actor.x-exit.x,actor.z-exit.z)<1e-8);
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
test('native winding search frontier resumes identically after save/load',()=>{
 const a=load(),navA=navigator(a);for(let i=0;i<10;i++)tick(a,.1,navA);
 assert.ok(a.raid.animals.find(a=>a.status==='retreating').exitConnectorSearch.fine.visited>0);
 const b=deserialize(serialize(a)),navB=navigator(b);
 for(let i=0;i<180&&a.raid;i++){tick(a,.1,navA);tick(b,.1,navB);assert.equal(serialize(a),serialize(b));}
 assert.equal(a.raid,null);assert.equal(b.raid,null);assert.equal(a.day,29);
});
test('fractional frontier collision work and memory remain bounded without a route',()=>{
 let checks=0;const nav={version:0,walkable:()=>{checks++;return true;},segmentClear:()=>{checks++;return false;}};
 const actor={x:0,z:0,radius:1},end={x:10,z:10};
 for(let i=0;i<30;i++){const before=checks;animalExitConnector(actor,end,nav);assert.ok(checks-before<=8*3+8*17);}
 const before=checks;animalExitConnector(actor,end,nav);assert.equal(checks,before);
 assert.ok(actor.exitConnectorSearch.fine.nodeCount<=4096);
});
test('snapshot rejects malformed winding frontiers',()=>{
 const s=load(),nav=navigator(s);tick(s,.1,nav);
 const actor=s.raid.animals.find(a=>a.status==='retreating'),valid=structuredClone(actor.exitConnectorSearch.fine);
 for(const change of [{visited:4097},{nodeCount:0},{sequence:32770},{previous:{'0,1':'nope'}},{items:[{order:0,value:{i:129,j:0,g:0,f:1}}]}]){
  actor.exitConnectorSearch.fine={...valid,...change};assert.throws(()=>serialize(s),/Conector fraccional/);
 }
});

test('saved native frontier rejects coordinates that would concatenate during expansion',()=>{
 const s=load(),nav=navigator(s);tick(s,.1,nav);
 const actor=s.raid.animals.find(a=>a.status==='retreating'),valid=structuredClone(actor.exitConnectorSearch.fine);
 for(const field of ['i','j']){
  actor.exitConnectorSearch.fine=structuredClone(valid);
  const value=actor.exitConnectorSearch.fine.items[0].value;value[field]=String(value[field]);
  assert.throws(()=>serialize(s),/Conector fraccional/);
 }
});

test('saved native frontier rejects missing origins, impossible queued costs and broken ancestry',()=>{
 const s=load(),nav=navigator(s);tick(s,.1,nav);
 const actor=s.raid.animals.find(a=>a.status==='retreating'),valid=structuredClone(actor.exitConnectorSearch.fine);
 const corruptions=[
  f=>{delete f.costs['0,0'];f.nodeCount--;},
  f=>{f.costs['0,0']=1;},
  f=>{f.items[0].value.i=128;f.items[0].value.j=128;},
  f=>{const entry=f.items.find(e=>f.costs[`${e.value.i},${e.value.j}`]>0);entry.value.g=f.costs[`${entry.value.i},${entry.value.j}`]-.1;},
  f=>{const child=Object.keys(f.previous)[0];delete f.previous[child];},
  f=>{const child=Object.keys(f.previous)[0];f.previous[child]='128,128';},
  f=>{const pair=Object.entries(f.previous).find(([,parent])=>parent!=='0,0');assert.ok(pair);f.previous[pair[1]]=pair[0];},
 ];
 for(const corrupt of corruptions){actor.exitConnectorSearch.fine=structuredClone(valid);corrupt(actor.exitConnectorSearch.fine);assert.throws(()=>serialize(s),/Conector fraccional/);}
});

test('a stale more expensive native heap entry remains a compatible saved state',()=>{
 const s=load(),nav=navigator(s);tick(s,.1,nav);
 const fine=s.raid.animals.find(a=>a.status==='retreating').exitConnectorSearch.fine;
 // A worse entry can remain after a cheaper cost was inserted; increasing a
 // leaf score preserves the heap while exercising this valid stale condition.
 const entry=fine.items.at(-1);entry.value.g+=1;entry.value.f+=1;
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
