import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import {workerRiskClearance} from '../src/simulation/worker-route-clearance.js';
import {walkTo,newGame} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function world(slope=()=>0) {
 const nav=new Navigation(712,'sabana',{});
 nav.field={slope,fluidInside:()=>false};nav.propsAt=()=>[];
 nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
 return nav;
}
const worker=()=>({id:'worker',status:'walking',x:0,z:0,radius:.28});
const destination={id:'task',x:4,z:0};

test('refinement catches a narrow steep strip missed by the ordinary coarse samples',()=>{
 const nav=world((x,z)=>Math.abs(z)<.08?(Math.abs(x-.63)<.025?.6:x>.3&&x<.9?.49:0):0);
 const start={x:0,z:0},end={x:1,z:0};
 assert.equal(nav.coarseSegmentClear(start,end,.28,null,true),true);
 assert.equal(nav.segmentClear(start,end,.28,null,true),false);
 assert.equal(nav.segmentClear(start,end,.28,null,false),false,'Animal routes also reject the forbidden near-limit band before choosing an approach');
 const w=worker(),s={structures:[],workers:[w]};let arrived=false;
 for(let tick=0;tick<150;tick++){
  arrived=walkTo(s,w,destination,.05,nav);
  assert(nav.terrainValid(w.x,w.z,w.radius,true),'Every actual landing remains on walkable terrain');
  if(arrived)break;
 }
 assert(arrived,'Worker detours and reaches the task rather than stopping permanently');
});

test('a risky restored connector is rejected and replanned without teleporting the worker',()=>{
 const nav=world((x,z)=>Math.abs(z)<.08?(Math.abs(x-.1)<.02?.6:.49):0);
 const w={...worker(),path:[{x:4,z:0}],pathVersion:nav.version,destinationId:destination.id};
 const s={structures:[],workers:[w]};
 assert(nav.terrainValid(w.x,w.z,w.radius,true));
 assert.equal(walkTo(s,w,destination,.05,nav,{speed:2}),false);
 assert.equal(w.x,0);assert.equal(w.z,0);assert.equal(w.path,null);
 assert.equal(w.terrainAvoidance.length,1);
 const restored=structuredClone(w),cold=world(nav.field.slope);
 for(let tick=0;tick<200;tick++){
  const a=walkTo(s,w,destination,.05,nav,{speed:2});
  const b=walkTo({structures:[],workers:[restored]},restored,destination,.05,cold,{speed:2});
  assert.equal(a,b);assert.deepEqual(w,restored);assert(nav.terrainValid(w.x,w.z,w.radius,true));
  if(a)break;
 }
 assert.equal(w.x,4);assert.equal(w.z,0);
});

test('dynamic blockers retain priority and never create a terrain avoidance point',()=>{
 const nav=world(()=>.49),w={...worker(),path:[{x:4,z:0}]};
 const guard=workerRiskClearance(w,nav,{radius:.28,ignore:null},()=>false);
 assert.equal(guard.clear(w,{x:.1,z:0}),false);assert.equal(guard.blocked(),false);
 assert.equal(w.terrainAvoidance,undefined);assert.equal(nav.workerMotionStats,undefined);
});

test('shared terrain-risk metadata retains its peak and actual geometry changes invalidate it',()=>{
 const nav=world(()=>.49),start={x:0,z:0},end={x:2,z:0};
 assert(nav.segmentClear(start,end,.28,null,true));
 assert.deepEqual(nav.knownWorkerSegmentRisk(start,end,.28,null),{valid:true,peak:.49});
 nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
 assert.equal(nav.knownWorkerSegmentRisk(start,end,.28,null),null);
});

test('private avoided-point views are isolated per worker, bounded and replaced on geometry changes',()=>{
 const nav=world(),a={...worker(),terrainAvoidance:[{x:2,z:0}]},b=worker();
 const path=nav.workerPath(a,destination,.28,null);assert(path&&path.length>1);
 const view=nav.workerViews.get(a).view;
 assert.deepEqual(nav.workerPath(b,destination,.28,null),[{x:4,z:0}]);
 nav.workerPath(a,destination,.28,null);assert.equal(nav.workerViews.get(a).view,view);
 for(let i=0;i<12;i++)nav.workerPath({...worker(),terrainAvoidance:[{x:2,z:0}]},destination,.28,null);
 assert(nav.workerViews.size<=8);
 nav.setState({structures:[],villages:[],spells:[],suppressed:[]});
 nav.workerPath(a,destination,.28,null);assert.notEqual(nav.workerViews.get(a).view,view);
 a.terrainAvoidance=[];nav.workerPath(a,destination,.28,null);assert.equal(nav.workerViews.has(a),false);
});

test('optional learned terrain points round-trip and malformed or oversized save data is rejected',()=>{
 const s=newGame({seed:712,slotId:'worker-terrain'});s.workers.push(worker());
 assert.deepEqual(deserialize(serialize(s)),s,'Existing saves do not require the new optional field');
 s.workers[0].terrainAvoidance=[{x:.1,z:0}];assert.deepEqual(deserialize(serialize(s)),s);
 for(const value of [null,{},[{x:null,z:0}],[{x:0,z:Infinity}],Array.from({length:9},()=>({x:0,z:0}))]){
  const broken=structuredClone(s);broken.workers[0].terrainAvoidance=value;
  assert.throws(()=>serialize(broken),/Desvío de terreno inválido/);
 }
});
