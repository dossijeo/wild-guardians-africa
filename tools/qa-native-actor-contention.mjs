import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {actorBlockers,actorSegmentClear} from '../src/simulation/actor-motion.js';
import {tick} from '../src/simulation/game.js';
const input=process.argv[2];assert.ok(input,'Pass saved native contention state');
const bytes=readFileSync(input);let s=deserialize(gunzipSync(bytes).toString());
const navigation=state=>{const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);return nav;};
let nav=navigation(s),reloaded=false,steps=0;const started=performance.now(),ids=s.raid.animals.filter(a=>a.status!=='gone').map(a=>a.id),moves=Object.fromEntries(ids.map(id=>[id,0])),finalActors=new Map();
const initial={day:s.day,completedNights:s.completedNights,ledger:structuredClone(s.ledger),remaining:ids.map(id=>{const a=s.raid.animals.find(a=>a.id===id);return {id,hits:a.hitsRemaining,exit:a.exit};})};
for(;s.raid&&steps<4000;steps++){
 const before=s.raid.animals.filter(a=>a.status!=='gone').map(a=>({actor:a,point:{x:a.x,z:a.z},blockers:actorBlockers(s,a,false).map(b=>({...b}))}));
 tick(s,.1,nav);
 const processed=new Map();
 for(const {actor,point,blockers} of before){
  const distance=Math.hypot(actor.x-point.x,actor.z-point.z);moves[actor.id]=(moves[actor.id]??0)+distance;
  assert.ok(distance<=.38+1e-8,'Native movement cannot teleport or exceed maximum run speed');
  assert.ok(nav.segmentClear(point,actor,actor.radius,null,false),'Movement must stay terrain-clear');
  // updateRaid walks animals in array order. Earlier bodies have already
  // moved; later bodies still occupy their pre-tick positions.
  const atMovement=blockers.map(b=>processed.get(b.id)??b).filter(b=>b.status!=='gone');
  assert.ok(actorSegmentClear(point,actor,{...actor,...point},atMovement),'Movement must preserve body clearance in native update order');
  processed.set(actor.id,actor);
  finalActors.set(actor.id,actor);
 }
 if(!reloaded&&steps>20&&s.raid){s=deserialize(serialize(s));nav=navigation(s);reloaded=true;}
}
assert.deepEqual(readFileSync(input),bytes,'Original retained state stays unchanged');
const endings=[...finalActors.values()].map(a=>({id:a.id,status:a.status,hits:a.hitsRemaining,position:{x:a.x,z:a.z},exit:a.exit}));
if(!s.raid)for(const a of finalActors.values()){assert.equal(a.status,'gone');assert.deepEqual({x:a.x,z:a.z},a.exit);}
const ledgerUnchanged=JSON.stringify(initial.ledger)===JSON.stringify(s.ledger);
const ledgerSha256=createHash('sha256').update(JSON.stringify(initial.ledger)).digest('hex');
console.log(JSON.stringify({snapshotSha256:createHash('sha256').update(bytes).digest('hex'),initial:{...initial,ledger:{balance:initial.ledger.balance,sha256:ledgerSha256}},steps,simulatedSeconds:steps*.1,reloaded,moves,endings,raidEnded:s.raid===null,day:s.day,completedNights:s.completedNights,result:s.result,remaining:s.raid?.animals.filter(a=>a.status!=='gone').map(a=>({id:a.id,status:a.status,hits:a.hitsRemaining,x:a.x,z:a.z,next:a.path?.[0]}))??[],ledgerUnchanged,cpuMilliseconds:performance.now()-started,scope:'Native snapshot replay with physical movement assertions and reload; no campaign, GPU or human-activity acceptance.'},null,2));
assert.equal(s.raid,null,'Native raid must finish without dropping actors or hits');
