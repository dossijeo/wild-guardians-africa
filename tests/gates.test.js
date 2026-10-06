import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {advanceGateLeaves,waitForGate,GATE_MOVE_SECONDS} from '../src/simulation/gates.js';
import {moveWorker} from '../src/simulation/locomotion.js';
import {Navigation} from '../src/world/navigation.js';
import {gateFrameFootprints,gateSwingPolygon} from '../src/world/gate-passages.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {pushWorker} from '../src/simulation/encounters.js';
const gate=(material='empalizada')=>({id:'gate',kind:'wall',gate:true,material,x:0,z:0,yaw:0,hp:120,maxHp:120,status:'intact',gateOpen:0});
const worker=()=>({id:'worker',x:.05,z:-3,path:[{x:.05,z:3}],status:'walking',profile:'olderMale',runRemaining:50});
const state=(g=gate(),w=worker())=>({structures:[g],workers:[w],pauses:[],initialPreparation:false});
const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url)));
function paidFixture(material,profile='olderMale',centerZ=2,centerX=-6){
  const s=Game.newGame({seed:712});s.villages[0].z=centerX===0?-20:-8;Game.resume(s,'intro');s.tutorial.step='center';
  const nav=Object.create(Navigation.prototype);nav.field={blocked:()=>false,slope:()=>0};nav.propsAt=()=>[];nav.chunks=new Map();nav.walkCache=new Map();nav.segmentCache=new Map();nav.failedPaths=new Set();nav.closedRegions=new Map();nav.searchedRegions=[];nav.obstacles=[];
  Game.placeStructure(s,'center',{x:centerX,z:centerZ},nav);Game.placeStructure(s,'gate',{kind:'wall',material,gate:true,x:0,z:0},nav);Game.plant(s,'seed','mijo',0,4,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{[profile]:1});
  return {s,nav,g:s.structures.find(e=>e.gate),w:s.workers[0]};
}
test('Workers request a near crossing and wait without spending run distance or movement phases',()=>{
  const s=state(),w=s.workers[0],g=s.structures[0];
  assert.equal(moveWorker(w,.1,{urgent:true,gates:s.structures}),false);assert.equal(w.z,-3);assert.equal(w.runRemaining,50);assert.equal(w.walkPhase,undefined);assert.equal(w.runPhase,undefined);assert.equal(w.gateWaiting,true);
  for(let i=0;i<6;i++)advanceGateLeaves(s,.1);assert.equal(g.gateOpen,1);assert.equal(GATE_MOVE_SECONDS,.6);
  moveWorker(w,.1,{urgent:true,gates:s.structures});assert.ok(w.z>-3);assert.equal(w.gateWaiting,false);assert.ok(w.runRemaining<50);
});
test('All four native profiles wait in Idle and preserve the crate carrying pose',()=>{
  for(const profile of ['olderMale','olderFemale','youngMale','youngFemale']){
    const w={...worker(),profile,gateWaiting:true};assert.equal(workerPose(w,null,2,libraries[profile]).name,'Idle');
    w.status='carrying';w.carryPhase=.3;const pose=workerPose(w,null,2,libraries[profile]);assert.equal(pose.name,'Carry_Crate');assert.equal(pose.time,.3);
  }
});
test('Pauses, preparation and end states freeze leaf clocks; closing waits for body occupancy',()=>{
  const s=state(),g=s.structures[0];advanceGateLeaves(s,.3);assert.equal(g.gateOpen,.5);
  s.pauses=['hiring'];advanceGateLeaves(s,20);assert.equal(g.gateOpen,.5);
  s.pauses=[];s.initialPreparation=true;advanceGateLeaves(s,20);assert.equal(g.gateOpen,.5);
  s.initialPreparation=false;s.result='victory';advanceGateLeaves(s,20);assert.equal(g.gateOpen,.5);
  delete s.result;advanceGateLeaves(s,.3);assert.equal(g.gateOpen,1);
  s.workers[0].z=0;s.workers[0].path=null;advanceGateLeaves(s,2);assert.equal(g.gateOpen,1);
  s.workers[0].z=6;advanceGateLeaves(s,.3);assert.equal(g.gateOpen,.5);advanceGateLeaves(s,.3);assert.equal(g.gateOpen,0);
});
test('Passing beside a closed gate does not request opening or stop a worker',()=>{
  const s=state();s.workers[0].x=2.5;s.workers[0].path=[{x:2.5,z:3}];
  assert.equal(waitForGate(s.workers[0],s.structures),false);advanceGateLeaves(s,1);assert.equal(s.structures[0].gateOpen,0);
});
test('Collapsing gates hold crossing until rubble; legacy occupants restore a safe open pose',()=>{
  const s=state(),g=s.structures[0];g.status='collapsing';g.gateOpen=1;assert.equal(waitForGate(s.workers[0],s.structures),true);advanceGateLeaves(s,.2);assert.equal(g.gateOpen,1);
  g.status='ruined';assert.equal(waitForGate(s.workers[0],s.structures),false);advanceGateLeaves(s,.1);assert.equal(g.gateOpen,0);
  g.status='intact';delete g.gateOpen;s.workers[0].z=0;s.workers[0].path=null;advanceGateLeaves(s,.1);assert.equal(g.gateOpen,1);
});
test('Physical collision uses current leaf phase while route planning includes the opened leaf',()=>{
  for(const material of ['zarzas','empalizada','reforzado']){
    const {s,nav,g}=paidFixture(material),a={x:.05,z:-2},b={x:.05,z:2};
    assert.equal(nav.segmentClear(a,b,.28,null,true),true);assert.equal(nav.workerMotionClear(a,b),false);
    g.gateOpen=.5;assert.equal(nav.workerMotionClear(a,b),false);g.gateOpen=1;assert.equal(nav.workerMotionClear(a,b),true);
    assert.equal(nav.segmentClear(a,b,.28,null,false),false);assert.equal(gateFrameFootprints(g).length,3);assert.equal(gateSwingPolygon(g).length,24);
    g.status='ruined';nav.setState(s);assert.equal(nav.workerMotionClear(a,b),true);
  }
});
test('Paid workers cross three original leaf materials without penetrating a closing or moving leaf',()=>{
  for(const material of ['zarzas','empalizada','reforzado'])for(const profile of ['olderMale','olderFemale','youngMale','youngFemale']){
    const {s,nav,g,w}=paidFixture(material,profile),money=s.ledger.balance.n;let sawWaiting=false,sawOpen=false,crossed=false;
    for(let i=0;i<220;i++){
      const before={x:w.x,z:w.z};Game.tick(s,.1,nav);sawWaiting||=w.gateWaiting===true;sawOpen||=g.gateOpen===1;
      if(Math.hypot(w.x-before.x,w.z-before.z)>1e-8)assert.equal(nav.workerMotionClear(before,w),true,material+'/'+profile+' physical motion');
      if(w.z>1)crossed=true;
    }
    assert.ok(sawWaiting&&sawOpen&&crossed,material+'/'+profile+' must actually cross');assert.equal(s.ledger.balance.n,money);
    assert.equal(s.ledger.entries.gate.n,String(-({zarzas:10,empalizada:20,reforzado:55}[material])));
  }
});
test('Opening and waiting persist exactly through save/reload and reject malformed phases',()=>{
  const {s,g,w}=paidFixture('zarzas');w.z=-3;w.path=[{x:0,z:3}];advanceGateLeaves(s,.2);waitForGate(w,s.structures);
  const text=serialize(s),loaded=deserialize(text);assert.equal(serialize(loaded),text);assert.equal(loaded.structures.find(e=>e.gate).gateOpen,g.gateOpen);assert.equal(loaded.workers[0].gateWaiting,true);
  for(const phase of [-1,1.01,NaN,'open']){const bad=structuredClone(s);bad.structures.find(e=>e.gate).gateOpen=phase;assert.throws(()=>serialize(bad),/Apertura/);}
  const bad=structuredClone(s);bad.workers[0].gateWaiting='yes';assert.throws(()=>serialize(bad),/Espera/);
});
test('Encounter pushes cannot drive a worker through a closed gate or its moving sweep',()=>{
  for(const opening of [0,.5,1]){
    const {nav,g,w}=paidFixture('empalizada');g.gateOpen=opening;w.x=0;w.z=-2.4;const before={x:w.x,z:w.z};
    pushWorker({x:0,z:-2.8,heading:0},w,2,nav);assert.equal(nav.workerMotionClear(before,w),true);assert.ok(Math.hypot(w.x-before.x,w.z-before.z)<=2+1e-9);
  }
});
test('A large locomotion step approaches safely and cannot jump through a closed leaf',()=>{
  const s=state();s.workers[0].z=-8;moveWorker(s.workers[0],20,{flight:true,gates:s.structures});
  assert.ok(s.workers[0].z<=-3.1);assert.equal(s.workers[0].gateWaiting,true);assert.equal(s.workers[0].runRemaining,50);
  advanceGateLeaves(s,.6);moveWorker(s.workers[0],20,{flight:true,gates:s.structures});assert.equal(s.workers[0].z,3);
});
test('Fractional gate portals connect enclosed grid regions and retain exact swept collisions',()=>{
  for(const material of ['zarzas','empalizada','adobe','piedra','reforzado']){
    const {nav,g}=paidFixture(material);g.x=.4;g.baseScaleX=material==='reforzado'?.7:1;g.gateOpen=1;
    const box=(x0,z0,x1,z1)=>[{x:x0,z:z0},{x:x1,z:z0},{x:x1,z:z1},{x:x0,z:z1}];
    const walls=[box(-25,-.2,g.x-.75,.2),box(g.x+.75,-.2,25,.2)];
    nav.setState({structures:[g],villages:[{id:'barrier',buildings:walls.map((footprint,i)=>({key:String(i),kind:'house',footprint}))}],spells:[],suppressed:[]});
    const a={x:.4,z:-5},b={x:.4,z:5};assert.equal(nav.path(a,b,.28,null,false),null,material+' blocks animals');
    const route=nav.path(a,b,.28,null,true);assert.ok(route,material+' actual narrow opening');assert.ok(route.some(p=>!Number.isInteger(p.x)||!Number.isInteger(p.z)));
    let previous=a;for(const point of route){assert.ok(nav.workerMotionClear(previous,point),material+' exact segment');previous=point;}
    assert.deepEqual(route.at(-1),b);assert.deepEqual(nav.path(a,b,.28,null,true),route,'failure caches must retain portal connectivity');
  }
});
for(const material of ['zarzas','empalizada','reforzado'])test(`${material}: a real harvested crate waits, crosses and charges only on delivery`,()=>{
  const {s,nav,w}=paidFixture(material,'olderMale',-7,0),initialMoney=BigInt(s.ledger.balance.n);let carryWait=false,delivered=false,saved=false;
  for(let i=0;i<2400&&!delivered;i++){
    const before={x:w.x,z:w.z};Game.tick(s,.1,nav);
    if(Math.hypot(w.x-before.x,w.z-before.z)>1e-8)assert.ok(nav.workerMotionClear(before,w),'every actual movement stays clear');
    // Maturity queues the harvest; the paid worker must still collect and carry it.
    if(w.status==='carrying'&&w.gateWaiting){
      carryWait=true;assert.equal(BigInt(s.ledger.balance.n),initialMoney,'waiting does not pay a crate');
      if(!saved){const text=serialize(s);assert.equal(serialize(deserialize(text)),text);saved=true;}
    }
    delivered=s.crates.some(c=>c.delivered);
  }
  assert.ok(carryWait&&saved&&delivered,'must actually wait with a harvested crate and deliver it');
  assert.equal(BigInt(s.ledger.balance.n),initialMoney+14n);assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,1);
});
