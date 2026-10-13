import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {closedDefenseContours} from '../tools/native-closed-defense-policy.mjs';
import {wallStroke} from '../src/world/wall-layout.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

test('native construction leaves a gap when no automatic gate can be hosted',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const points=closedDefenseContours(s)[0].points,expected=wallStroke(points,[],{smooth:false,snap:false}).length;
 const placement=nav.wallPlacement.bind(nav);
 nav.wallPlacement=wall=>wall.gate?{valid:false}:placement(wall);
 const quote=Game.quoteWallChain(s,'zarzas',points,nav,{smooth:false,snap:false});
 assert.equal(quote.pieces.length,expected-1);
 assert.equal(quote.gates,0);
});

test('single-piece wall edits cannot close an enclosure without a traversable gate',()=>{
 const {s,nav}=createOpeningWorld(),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const points=closedDefenseContours(s)[0].points;
 assert(Game.buildWallChain(s,'walls','zarzas',points,nav,{smooth:false,snap:false}));
 const gate=s.structures.find(piece=>piece.autoGate);
 assert(gate);
 assert(Game.removeWall(s,'remove-gate',gate.id,nav));
 const placement=nav.wallPlacement.bind(nav),before=s.structures.length;
 nav.wallPlacement=wall=>wall.gate?{valid:false}:placement(wall);
 assert.equal(Game.placeStructure(s,'blocked-closure',{kind:'wall',material:gate.material,x:gate.x,z:gate.z,yaw:gate.yaw},nav),false);
 assert.equal(s.structures.length,before);
 assert.equal(s.ledger.entries['blocked-closure'],undefined);
});

test('a returning worker brushing a newly closed wall recovers a valid route through the automatic gate',()=>{
 const {s,nav}=createOpeningWorld({seed:123}),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const worker=s.workers[0];
 // Reproduce a worker already inside the crop area when the final segments
 // are purchased. The closing wall brushes the worker's collision radius.
 worker.x=73.79870720221577;worker.z=2.400430932594735;
 worker.status='returning';
 // A route calculated before the closing edit must be invalidated by the
 // navigation version change and replaced with one through the new gate.
 worker.path=[{x:0,z:0}];worker.destinationId='home-village-1';worker.pathVersion=nav.version;
 const oldPathVersion=nav.version;
 const policy=createNativeFundedDefensePolicy({startDay:1,chunkPieces:8});let sequence=0;
 for(let i=0;i<20&&!policy.report().completed;i++){
  policy.act(s,nav,{command:kind=>`wall-${kind}-${sequence++}`,reserve:160});s.elapsed+=6;
 }
 assert(policy.report().completed);
 assert.notEqual(nav.version,oldPathVersion);
 assert.equal(s.structures.filter(x=>x.kind==='wall'&&x.gate).length,1);
 const destination={...s.villages[0].entry,id:'home-'+s.villages[0].id};
 assert.equal(nav.walkable(worker.x,worker.z,.28,null,true),false);
 const loaded=deserialize(serialize(s));
 let reached=false;
 for(let i=0;i<150&&!reached;i++)reached=Game.walkTo(s,worker,destination,.5,nav);
 assert(nav.walkable(worker.x,worker.z,.28,null,true));
 assert(reached,'worker should reach the village via native gate navigation');
 nav.setState(loaded);
 const restored=loaded.workers[0];let restoredReached=false;
 for(let i=0;i<150&&!restoredReached;i++)restoredReached=Game.walkTo(loaded,restored,destination,.5,nav);
 assert(restoredReached,'the same native route must recover after saving inside the wall');
});

test('several workers inside a newly closed wall can all recover their gate routes',()=>{
 const {s,nav}=createOpeningWorld({seed:123}),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:4});
 const policy=createNativeFundedDefensePolicy({startDay:1,chunkPieces:8});let sequence=0;
 for(let i=0;i<20&&!policy.report().completed;i++){
  policy.act(s,nav,{command:kind=>`wall-${kind}-${sequence++}`,reserve:160});s.elapsed+=6;
 }
 assert(policy.report().completed);
 const destination={...s.villages[0].entry,id:'home-'+s.villages[0].id};
 for(const worker of s.workers){
  worker.x=73.79870720221577;worker.z=2.400430932594735;
  worker.status='returning';worker.path=null;
 }
 for(let i=0;i<300;i++){
  for(const worker of s.workers)if(worker.status!=='home'&&Game.walkTo(s,worker,destination,.5,nav))worker.status='home';
  if(s.workers.every(worker=>worker.status==='home'))break;
 }
 assert(s.workers.every(worker=>worker.status==='home'));
});

test('the native day loop sends a trapped worker home and does not block the next hire',()=>{
 const {s,nav}=createOpeningWorld({seed:123}),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 const worker=s.workers[0],oldId=worker.id;
 const policy=createNativeFundedDefensePolicy({startDay:1,chunkPieces:8});let sequence=0;
 for(let i=0;i<20&&!policy.report().completed;i++){
  policy.act(s,nav,{command:kind=>`wall-${kind}-${sequence++}`,reserve:160});s.elapsed+=6;
 }
 assert(policy.report().completed);
 worker.x=73.79870720221577;worker.z=2.400430932594735;
 worker.status='returning';worker.path=null;
 for(let i=0;i<150&&worker.status!=='home';i++)Game.tick(s,.5,nav);
 assert.equal(worker.status,'home');
 s.day=2;s.time=0;s.pauses=[];
 Game.openInitialHiring(s);
 Game.hire(s,'next-hire',{olderFemale:1});
 assert(!s.workers.some(w=>w.id===oldId),'expired worker must leave the active roster');
 assert.equal(s.workers.length,1);
});
