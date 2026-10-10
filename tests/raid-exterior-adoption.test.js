import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {raidExteriorDiagnostics,raidExteriorInputKey,adoptRaidExteriorPayload,createRaidExteriorQuery,exteriorRaidEntry} from '../src/world/raid-exterior.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const twelve=['warthog','warthog','warthog','warthog','hyena','hyena','hyena','buffalo','buffalo','lion','lion','rhino'];
const specs=group=>group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
function fixture(group=['warthog']){
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'});
 assert.ok(Game.plant(s,'crop','mijo',88,9,nav));
 assert.ok(Game.buildWallChain(s,'walls','zarzas',[[85,6.2],[92,6.2],[92,17],[85,17],[85,6.2]],nav,{smooth:false,snap:false}));
 nav.setActiveBounds([-24,-120,216,120]);nav.setRaidView({x:88,z:9},{x:88,z:6.5});s.nightPlan={at:400,group,done:false};
 const worker={requests:[],postMessage(request){this.requests.push(request);},terminate(){this.terminated=true;}},preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});preparer.update(s);
 return {s,nav,worker,preparer};
}
test('owned complete graph adopted before spawn: group12 exterior, exact direct state and no main graph build',()=>{
 const {s,nav,worker,preparer}=fixture(twelve),before=serialize(s),reply=computeRaidEntry(worker.requests[0]);
 const begin=performance.now();worker.onmessage({data:reply});const adoptionMs=performance.now()-begin;
 assert.equal(serialize(s),before);assert.equal(preparer.stats.accepted,1);assert.equal(raidExteriorDiagnostics(nav).builds,0);
 const ref=deserialize(before),other=new Navigation(ref.seed,ref.biome,nav.profile);other.setState(ref);other.setActiveBounds(nav.activeBounds);other.setRaidView(nav.raidView.eye,nav.raidView.target);
 spawnRaid(ref,{group:twelve},other);const spawnStart=performance.now();spawnRaid(s,{group:twelve},nav);const spawnMs=performance.now()-spawnStart;
 assert.equal(serialize(s),serialize(ref));assert.equal(s.raid.animals.length,12);assert.equal(raidExteriorDiagnostics(nav).builds,0);
 assert.ok(exteriorRaidEntry(s,nav,specs(twelve),{entries:s.raid.animals.map(a=>a.spawn),exits:s.raid.animals.map(a=>a.exit)}));
 const restored=deserialize(serialize(s)),loaded=new Navigation(s.seed,s.biome,nav.profile);loaded.setState(restored);assert.equal(serialize(restored),serialize(s));
 for(const a of restored.raid.animals){assert.ok(loaded.walkable(a.exit.x,a.exit.z,a.radius,null,false));assert.ok(loaded.segmentClear(a.spawn,a.exit,a.radius,null,false));assert.ok(loaded.segmentClear(a.exit,a.spawn,a.radius,null,false));}
 console.log(JSON.stringify({scope:'CPU observation only, group12 entry/save/native reversible escape; not completed physical raid or frame guarantee',adoptionMs,spawnMs,mainGraph:raidExteriorDiagnostics(nav)}));preparer.dispose();
});
test('camera-only obsolescence adopts full current geometry, never the old entry',()=>{
 const {s,nav,worker,preparer}=fixture(),reply=computeRaidEntry(worker.requests[0]);nav.setRaidView({x:89,z:9},{x:88,z:6.5});worker.onmessage({data:reply});
 assert.equal(preparer.stats.geometryAdopted,1);assert.equal(preparer.stats.obsolete,1);assert.equal(preparer.ready,undefined);assert.equal(nav.preparedRaidEntry(s,s.nightPlan.group),undefined);
 createRaidExteriorQuery(s,nav).regionsFor(1.1);assert.equal(raidExteriorDiagnostics(nav).builds,0);preparer.dispose();
});
for(const change of ['position','material','gate','profile','suppression','field','collapse'])test(`${change}: current input ownership rejects complete but physically stale graph`,()=>{
 const {s,nav,worker,preparer}=fixture(),reply=computeRaidEntry(worker.requests[0]),wall=s.structures.find(p=>p.kind==='wall');
 if(change==='position')wall.x+=1;if(change==='material')wall.material='empalizada';if(change==='gate')wall.gate=!wall.gate;
 if(change==='profile')nav.profile={...nav.profile,proofTest:true};if(change==='suppression')s.suppressed.push('proof-test');if(change==='field')nav.field=Object.create(nav.field);if(change==='collapse')wall.status='collapsing';
 worker.onmessage({data:reply});assert.equal(preparer.stats.geometryAdopted,0);assert.equal(preparer.stats.obsolete,1);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);preparer.dispose();
});
test('HP and active shield duration do not invalidate geometry when collision is unchanged',()=>{
 const {s,nav,preparer}=fixture(),first=raidExteriorInputKey(s,nav);s.structures[0].hp-=10;assert.equal(raidExteriorInputKey(s,nav),first);
 s.spells.push({id:'test',kind:'shield',remaining:30,x:30,z:40,radius:5});const active=raidExteriorInputKey(s,nav);s.spells.at(-1).remaining=1;assert.equal(raidExteriorInputKey(s,nav),active);s.spells.at(-1).remaining=0;assert.notEqual(raidExteriorInputKey(s,nav),active);preparer.dispose();
});
test('key/token-shaped cloned or arbitrary replies cannot mint trusted geometry or warmth',()=>{
 const {s,nav,worker,preparer}=fixture(),reply=computeRaidEntry(worker.requests[0]);worker.onmessage({data:structuredClone(reply)});
 assert.equal(preparer.stats.rejected,1);assert.equal(preparer.stats.geometryAdopted,0);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(nav.preparedPaths,null);assert.equal(preparer.ready,undefined);preparer.dispose();
});
test('malformed complete graph rejects atomically, without caching even its first valid radius',()=>{
 const {s,nav,worker,preparer}=fixture(twelve),reply=computeRaidEntry(worker.requests[0]),bad=structuredClone(reply.geometry);bad.regions.at(-1)[1].push([{x:0,z:0},{x:NaN,z:1},{x:1,z:0}]);
 assert.equal(adoptRaidExteriorPayload(s,nav,bad,specs(twelve).map(p=>p.radius)),false);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(raidExteriorDiagnostics(nav).builds,0);
 const duplicate=structuredClone(reply.geometry);duplicate.regions.push(duplicate.regions[0]);assert.equal(adoptRaidExteriorPayload(s,nav,duplicate,specs(twelve).map(p=>p.radius)),false);preparer.dispose();
});
test('cancelled/disposed/error replies never install complete geometry',()=>{
 for(const mode of ['dispose','error']){
  const {s,nav,worker,preparer}=fixture(),reply=computeRaidEntry(worker.requests[0]);if(mode==='dispose')preparer.dispose();else worker.onerror(new Error('real worker failure'));
  worker.onmessage({data:reply});assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(preparer.ready,null);assert.equal(worker.terminated,true);preparer.dispose();
 }
});

test('pending plan cancellation and wrong owner never adopt a graph',()=>{
 for(const mode of ['plan-done','result','other-owner']){
  const {s,nav,worker,preparer}=fixture();let reply=computeRaidEntry(worker.requests[0]);
  if(mode==='plan-done')s.nightPlan.done=true;if(mode==='result')s.result='victory';
  if(mode==='other-owner')reply=computeRaidEntry({...worker.requests[0],owner:'another-preparer'});
  worker.onmessage({data:reply});assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(preparer.ready,undefined);preparer.dispose();
 }
});

test('an internally computed but different snapshot proof cannot adopt graph/cache data',()=>{
 const {nav,worker,preparer}=fixture(),request=structuredClone(worker.requests[0]);request.state.rng++;
 const reply=computeRaidEntry(request);worker.onmessage({data:reply});assert.equal(preparer.stats.rejected,1);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);assert.equal(nav.preparedPaths,null);preparer.dispose();
});
test('in-process completed payload is immutable and oversized polygon transport is rejected atomically',()=>{
 const {s,nav,worker,preparer}=fixture(),reply=computeRaidEntry(worker.requests[0]);assert.ok(Object.isFrozen(reply.geometry.regions[0][1]));assert.throws(()=>{reply.geometry.regions[0][1].push([]);},TypeError);
 const bad=structuredClone(reply.geometry);bad.regions[0][1]=[Array.from({length:50001},()=>({x:1,z:1}))];assert.equal(adoptRaidExteriorPayload(s,nav,bad,[1.1]),false);assert.equal(raidExteriorDiagnostics(nav).adoptions,0);preparer.dispose();
});

test('independent body validation rejects malformed arrays or bounds without throwing',()=>{
 const {s,nav,preparer}=fixture();assert.equal(exteriorRaidEntry(s,nav,specs(['warthog']),{entries:'x',exits:'z'}),false);
 assert.equal(exteriorRaidEntry(s,nav,specs(['warthog']),{entries:[null],exits:[null]}),false);
 assert.equal(exteriorRaidEntry(s,nav,specs(['warthog']),{entries:[{x:1,z:1}],exits:[{x:1,z:2}]},[]),false);preparer.dispose();
});
