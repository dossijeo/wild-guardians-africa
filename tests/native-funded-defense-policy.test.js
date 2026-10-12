import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {closedDefenseContours} from '../tools/native-closed-defense-policy.mjs';
import {numberOf,rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {wallSpec} from '../src/simulation/rules.js';
import {createNativeFundedDefensePolicy as referencePolicy} from '../tools/native-funded-defense-policy-before-budget-gate.mjs';
function fixture(){const {s,nav}=createOpeningWorld();let id=0;const c=s.structures[0];Game.plant(s,'seed','mijo',c.x+6,c.z+1,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});return {s,nav,options:{command:k=>'funded-'+k+'-'+id++,reserve:160}};}

test('chosen wall material uses native price and HP and pays its actual ledger debit',()=>{
 for(const material of ['zarzas','empalizada']){
  const {s,nav,options}=fixture(),before=numberOf(s.ledger.balance),policy=createNativeFundedDefensePolicy({startDay:1,material,chunkPieces:8});
  assert.equal(policy.act(s,nav,options),1);
  const report=policy.report(),purchase=report.history.find(r=>r.paidCost),spec=wallSpec(material),walls=s.structures.filter(w=>w.kind==='wall');
  assert.equal(report.material,material);assert.equal(walls.length,8);
  assert(walls.every(w=>w.material===material&&w.cost===spec.cost&&w.maxHp===(w.gate?spec.gate_hp:spec.hp)));
  assert.equal(before-numberOf(s.ledger.balance),8*spec.cost);
  assert.equal(numberOf(s.ledger.entries[purchase.paymentId]),-8*spec.cost);
 }
});
test('native read-only wall quote is possible without funds; preview/build still enforce real cash',()=>{
 const {s,nav}=fixture(),candidate=closedDefenseContours(s)[0];s.ledger.balance=rational(30);const before=serialize(s);
 const quote=Game.quoteWallChain(s,'zarzas',candidate.points,nav,{smooth:false,snap:false});assert(quote.cost>30);assert.equal(serialize(s),before);
 assert.throws(()=>Game.previewWallChain(s,'zarzas',candidate.points,nav,{smooth:false,snap:false}),/monedas/);
 assert.throws(()=>Game.buildWallChain(s,'unfunded','zarzas',candidate.points,nav,{smooth:false,snap:false}),/monedas/);assert.equal(serialize(s),before);
});
test('real partial purchases close paid perimeter, create one worker gate, retain crops and replay saved state',()=>{
 let {s,nav,options}=fixture();const policy=createNativeFundedDefensePolicy({startDay:1,chunkPieces:8}),cash=numberOf(s.ledger.balance),crops=JSON.stringify(s.plants),props=JSON.stringify(s.suppressed);
 assert.equal(policy.act(s,nav,options),1);assert.equal(s.structures.filter(w=>w.kind==='wall').length,8);assert(policy.reserve(s)>0);assert.equal(policy.report().history.at(-1).complete,false);
 for(let i=0;i<20&&!policy.report().completed;i++){
  Game.tick(s,5,nav);
  if(i===0){s=deserialize(serialize(s));nav.setState(s);}
  policy.act(s,nav,options);
 }
 const report=policy.report();assert(report.completed);assert.equal(policy.reserve(s),0);assert.equal(cash-numberOf(s.ledger.balance),report.paidCost);
 assert.equal(report.paidCost,report.paidPieces*10);assert.equal(JSON.stringify(s.plants.map(p=>({id:p.id,x:p.x,z:p.z}))),JSON.stringify(JSON.parse(crops).map(p=>({id:p.id,x:p.x,z:p.z}))));assert.equal(JSON.stringify(s.suppressed),props);
 assert.equal(s.structures.filter(w=>w.gate).length,1);const gate=s.structures.find(w=>w.gate),portals=gatePortalPoints(gate);assert(nav.segmentClear(portals[0],portals[1],.28,null,true));assert.equal(nav.segmentClear(portals[0],portals[1],1.1,null,false),false);
 const b=report.completed.bounds,inside={x:(b[0]+b[2])/2,z:(b[1]+b[3])/2},outside={x:b[2]+5,z:inside.z};
 // Choose the actual planted clear point, not a point inside the work center.
 assert.equal(nav.approachPath(outside,s.plants[0],1.1,32),null);
 assert(report.history.filter(r=>r.paidCost).length>1);for(const r of report.history.filter(r=>r.paidCost))assert.equal(numberOf(s.ledger.entries[r.paymentId]),-r.paidCost);
});
test('paid wage protection can postpone purchases while preserving a real future savings target',()=>{
 const {s,nav,options}=fixture(),policy=createNativeFundedDefensePolicy({startDay:1});options.reserve=numberOf(s.ledger.balance)-5;
 const before=serialize(s);assert.equal(policy.act(s,nav,options),0);assert.equal(serialize(s),before);assert(policy.reserve(s)>0);assert.equal(policy.report().paidPieces,0);
});

test('rolling investment buys a paid partial wall while preserving replant cash, not an unpaid-contour debt',()=>{
 const {s,nav,options}=fixture(),before=numberOf(s.ledger.balance);
 const policy=createNativeFundedDefensePolicy({startDay:1,material:'empalizada',funding:'rolling'});
 options.reserve=before-100;
 assert.equal(policy.act(s,nav,options),1);
 const r=policy.report(),purchase=r.history.find(h=>h.paidCost);
 assert.equal(purchase.paidCost,40);assert.equal(purchase.paidPieces,2);
 assert.equal(numberOf(s.ledger.entries[purchase.paymentId]),-40);
 assert.equal(numberOf(s.ledger.balance),before-40);
 assert.ok(r.remainingCost>0);assert.equal(policy.reserve(s),0);
 assert.equal(r.discretionaryNewWallFraction,.5);
 const c=s.structures.find(c=>c.kind==='center');
 assert.equal(Game.plant(s,'rolling-real-replant','mijo',c.x+6,c.z+4,nav),true);
 assert.equal(numberOf(s.ledger.balance),before-45);
 assert.equal(numberOf(s.ledger.entries['rolling-real-replant']),-5);
 assert.throws(()=>createNativeFundedDefensePolicy({funding:'free-walls'}));
});
test('funded defense remains opt-in and cannot lock funds before its declared day',()=>{
 const {s,nav,options}=fixture(),policy=createNativeFundedDefensePolicy({startDay:6}),before=serialize(s);assert.equal(policy.act(s,nav,options),0);assert.equal(policy.reserve(s),0);assert.equal(serialize(s),before);
 assert.throws(()=>createNativeFundedDefensePolicy({chunkPieces:0}));
});

test('legal native removal of small vegetation is allowed and recorded only through paid wall commands',()=>{
 const {s,nav,options}=fixture(),c=s.structures[0];Game.plant(s,'border-seed','mijo',c.x+6,c.z+9,nav);
 const policy=createNativeFundedDefensePolicy({startDay:1}),before=[...s.suppressed];
 for(let i=0;i<20&&!policy.report().completed;i++){policy.act(s,nav,options);Game.tick(s,5,nav);}
 const report=policy.report();assert(report.completed);assert(report.history.some(r=>r.nativeSuppressedProps?.length));
 const ids=new Set(report.history.flatMap(r=>r.nativeSuppressedProps??[]));for(const id of ids)assert(s.suppressed.includes(id));
 assert.equal(s.suppressed.filter(id=>!before.includes(id)).length,ids.size);
});

test('unfunded recertification defers geometry without changing commands, state or later paid purchases',()=>{
 for(const funding of ['rolling','contour']){
  const baseline=fixture(),candidate=fixture(),a=referencePolicy({startDay:1,funding}),b=createNativeFundedDefensePolicy({startDay:1,funding});
  let oldChecks=0,newChecks=0;
  for(const [world,count] of [[baseline,()=>oldChecks++],[candidate,()=>newChecks++]]){
   const original=world.nav.wallPlacement.bind(world.nav);world.nav.wallPlacement=(...args)=>{count();return original(...args);};
   world.options.reserve=numberOf(world.s.ledger.balance)-5;
  }
  assert.equal(a.act(baseline.s,baseline.nav,baseline.options),0);assert.equal(b.act(candidate.s,candidate.nav,candidate.options),0);
  assert.deepEqual(b.report().planned,a.report().planned);assert.equal(serialize(candidate.s),serialize(baseline.s));
  oldChecks=0;newChecks=0;
  baseline.s.elapsed+=6;candidate.s.elapsed+=6;
  a.act(baseline.s,baseline.nav,baseline.options);b.act(candidate.s,candidate.nav,candidate.options);
  assert(newChecks<oldChecks,'Unfunded repeated attempt must avoid redundant native geometry work');
  assert.equal(b.report().history.at(-1).geometryCheckDeferred,true);assert.equal(b.report().paidCost,0);
  assert.equal(serialize(candidate.s),serialize(baseline.s));
  baseline.options.reserve=160;candidate.options.reserve=160;
  baseline.s.elapsed+=6;candidate.s.elapsed+=6;
  assert.equal(a.act(baseline.s,baseline.nav,baseline.options),1);assert.equal(b.act(candidate.s,candidate.nav,candidate.options),1);
  assert.equal(serialize(candidate.s),serialize(baseline.s));assert.equal(b.report().paidCost,a.report().paidCost);
 }
});

test('a paid contour with one removed piece waits for funds without repeated native quotes',()=>{
 const worlds=[fixture(),fixture()],policies=[referencePolicy({startDay:1,obstacleAware:true,funding:'rolling'}),createNativeFundedDefensePolicy({startDay:1,obstacleAware:true,funding:'rolling'})];
 for(let i=0;i<20&&!policies[0].report().completed;i++)for(let k=0;k<2;k++){
  policies[k].act(worlds[k].s,worlds[k].nav,worlds[k].options);
  Game.tick(worlds[k].s,5,worlds[k].nav);
 }
 assert(policies.every(p=>p.report().completed));
 assert.equal(serialize(worlds[0].s),serialize(worlds[1].s));
 const missing=worlds[0].s.structures.find(w=>w.kind==='wall'&&!w.gate);
 for(const w of worlds){
  assert(Game.removeWall(w.s,'remove-paid-piece',missing.id,w.nav));
  w.options.reserve=numberOf(w.s.ledger.balance)-5;
  Game.tick(w.s,5,w.nav);
 }
 let oldChecks=0,newChecks=0;
 for(const [i,count] of [[0,()=>oldChecks++],[1,()=>newChecks++]]){
  const nav=worlds[i].nav,original=nav.wallPlacement.bind(nav);
  nav.wallPlacement=(...args)=>{count();return original(...args);};
 }
 assert.equal(policies[0].act(worlds[0].s,worlds[0].nav,worlds[0].options),0);
 assert.equal(policies[1].act(worlds[1].s,worlds[1].nav,worlds[1].options),0);
 assert(newChecks<oldChecks,'Unfunded paid contour must avoid redundant placement queries');
 assert.equal(serialize(worlds[0].s),serialize(worlds[1].s));
 assert.equal(policies[1].report().history.at(-1).geometryCheckDeferred,true);
 for(let k=0;k<2;k++){
  worlds[k].options.reserve=160;
  Game.tick(worlds[k].s,5,worlds[k].nav);
 }
 assert.equal(policies[0].act(worlds[0].s,worlds[0].nav,worlds[0].options),1);
 assert.equal(policies[1].act(worlds[1].s,worlds[1].nav,worlds[1].options),1);
 assert.equal(serialize(worlds[0].s),serialize(worlds[1].s));
});
