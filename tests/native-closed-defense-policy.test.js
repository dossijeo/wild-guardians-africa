import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeClosedDefensePolicy,closedDefenseContours,selectClosedDefenseContour} from '../tools/native-closed-defense-policy.mjs';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {hitStructure} from '../src/simulation/rules.js';
import {parseNativeCampaignArgs,nativeCampaignProvenance} from '../tools/run_native_campaign.mjs';
function fixture(){const {s,nav}=createOpeningWorld();let id=0;return {s,nav,options:{command:k=>'closed-'+k+'-'+id++,reserve:160}};}

test('closed defense is explicit opt-in and recorded in CLI source provenance',()=>{
 const options=parseNativeCampaignArgs(['--out','fixture','--defense-policy','closed']);assert.equal(options.defensePolicy,'closed');
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).defensePolicy,'expanding');
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--defense-policy','unknown']));
 const p=nativeCampaignProvenance(options);assert.equal(typeof p.sourceHashes['tools/native-closed-defense-policy.mjs'],'string');
});
test('day1 native paid complete contour preserves crops, props, reserves and a worker-only gate',()=>{
 const {s,nav,options}=fixture(),policy=createNativeClosedDefensePolicy(),before=numberOf(s.ledger.balance),suppression=structuredClone(s.suppressed),rng=s.rng;
 assert.equal(policy.act(s,nav,options),1);const r=policy.report(),row=r.history.at(-1);
 assert.equal(s.day,1);assert.equal(s.time,0);assert.equal(s.elapsed,0);assert.equal(s.rng,rng);assert.equal(before-numberOf(s.ledger.balance),row.paidCost);assert.ok(numberOf(s.ledger.balance)>=160);assert.deepEqual(s.suppressed,suppression);assert.equal(s.plants.length,0);
 assert.equal(row.attempts.at(-1).newSlots,row.paidPieces);assert.equal(row.attempts.at(-1).reason,'complete-legal-slots');assert.equal(numberOf(s.ledger.entries[row.paymentId]),-row.paidCost);
 const gates=s.structures.filter(w=>w.gate);assert.equal(gates.length,1);const portal=gatePortalPoints(gates[0]);assert.equal(portal.length,2);assert.ok(nav.segmentClear(portal[0],portal[1],.28,null,true));assert.equal(nav.segmentClear(portal[0],portal[1],1.1,null,false),false);
 for(const w of s.structures.filter(w=>w.kind==='wall'))assert.equal(w.cost,10);
 const loaded=deserialize(serialize(s));assert.equal(serialize(loaded),serialize(s));
});
test('insufficient protected funds do not buy fragments or alter the native state',()=>{
 const {s,nav,options}=fixture(),policy=createNativeClosedDefensePolicy(),before=serialize(s);options.reserve=650;
 assert.equal(policy.act(s,nav,options),0);assert.equal(serialize(s),before);assert.equal(policy.report().paidPieces,0);assert.equal(policy.report().history[0].attempts.length,9);assert.ok(policy.report().history[0].attempts.every(a=>a.reason==='protected-budget'));
});
test('bounded enlargement avoids native props instead of suppressing or moving them',()=>{
 const {s,nav,options}=fixture(),c=s.structures[0];Game.plant(s,'native-border-seed','mijo',c.x+6,c.z+9,nav);const crop=structuredClone(s.plants),suppression=[...s.suppressed],cash=numberOf(s.ledger.balance),p=createNativeClosedDefensePolicy();
 assert.equal(p.act(s,nav,options),1);const row=p.report().history[0];assert.deepEqual(row.attempts.map(r=>r.reason),['native-prop-suppression','native-omissions','complete-legal-slots']);assert.ok(row.bounds[3]>row.attempts[0].bounds[3]);assert.deepEqual(s.plants,crop);assert.deepEqual(s.suppressed,suppression);assert.equal(cash-numberOf(s.ledger.balance),row.paidCost);assert.ok(numberOf(s.ledger.balance)>=160);
});
test('existing paid mixed-material modules are retained and only genuinely new modules are charged',()=>{
 const {s,nav,options}=fixture(),contour=closedDefenseContours(s)[0];const first=contour.points.slice(0,2);
 assert.ok(Game.buildWallChain(s,'paid-adobe-edge','adobe',first,nav,{smooth:false,snap:false}));const old=s.structures.filter(w=>w.kind==='wall').map(w=>({...w})),cash=numberOf(s.ledger.balance),policy=createNativeClosedDefensePolicy();
 assert.equal(policy.act(s,nav,options),1);for(const w of old)assert.deepEqual(s.structures.find(q=>q.id===w.id),w);assert.equal(cash-numberOf(s.ledger.balance),policy.report().paidCost);
 assert.ok(s.structures.some(w=>w.material==='adobe'));assert.ok(s.structures.some(w=>w.material==='zarzas'));assert.equal(s.structures.filter(w=>w.gate).length,1);
 const gates=s.structures.filter(w=>w.gate),portal=gatePortalPoints(gates[0]);assert.ok(nav.segmentClear(portal[0],portal[1],.28,null,true));assert.equal(nav.segmentClear(portal[0],portal[1],1.1,null,false),false);
});
test('existing ruined occupancy cannot masquerade as a complete paid barrier; repairs remain requests',()=>{
 const {s,nav,options}=fixture(),policy=createNativeClosedDefensePolicy();assert.equal(policy.act(s,nav,options),1);
 const center=s.structures[0];Game.plant(s,'native-seed','mijo',center.x+5,center.z+5,nav);Game.openInitialHiring(s);Game.hire(s,'native-hire',{olderFemale:1});
 const wall=s.structures.find(w=>w.kind==='wall'&&!w.gate);assert.ok(hitStructure(wall,wall.maxHp,s.elapsed));
 // Native damage fixture, followed by ordinary ticks; no geometry/clock/HP reset.
 Game.tick(s,2,nav);assert.equal(wall.status,'ruined');assert.ok(s.events.some(e=>e.type==='StructureRuined'&&e.targetId===wall.id));
 const selected=selectClosedDefenseContour(s,nav,{funds:0,previous:policy.report().built.bounds});assert.equal(selected.candidate,null);assert.equal(selected.attempts[0].reason,'existing-wall-needs-repair');
 for(let i=0;i<29;i++)Game.tick(s,1,nav);const cash=numberOf(s.ledger.balance);assert.equal(policy.act(s,nav,options),0);assert.equal(wall.hp,0);assert.equal(policy.report().repairRequests,1);assert.ok(s.tasks.some(t=>t.kind==='repair'&&t.targetId===wall.id));assert.equal(numberOf(s.ledger.balance),cash);
});
test('bounded native Canyon search records every omission and leaves its terrain and original ledger intact',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon'}),before=serialize(s),p=createNativeClosedDefensePolicy();let id=0;
 assert.equal(p.act(s,nav,{command:k=>'canyon-'+k+id++,reserve:160}),0);assert.equal(serialize(s),before);const r=p.report();assert.equal(r.history[0].attempts.length,9);assert.ok(r.history[0].attempts.every(a=>a.reason==='native-omissions'));assert.ok(r.history[0].attempts.every(a=>a.omitted.length>0));
});
test('configuration bounds and finite protected funds are enforced without simulation writes',()=>{
 for(const o of [{startDay:0},{maxSlots:257},{interval:0},{margin:1}])assert.throws(()=>createNativeClosedDefensePolicy(o));const {s,nav}=fixture(),before=serialize(s);assert.throws(()=>selectClosedDefenseContour(s,nav,{funds:NaN}));assert.equal(serialize(s),before);assert.equal(closedDefenseContours(s).length,9);
});
