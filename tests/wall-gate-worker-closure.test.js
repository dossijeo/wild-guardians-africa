import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

const options={smooth:false,snap:false};
const perimeter=[[73,-15.5],[102.5,-15.5],[102.5,15.5],[73,15.5],[73,-15.5]];
function populated(){
 const {s,nav}=createOpeningWorld({seed:123}),center=s.structures[0];
 assert(Game.plant(s,'seed','mijo',center.x+6,center.z+1,nav));
 Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 return {s,nav};
}

test('wall quotes ignore dead crop geometry while preserving the same plan',()=>{
 const {s,nav}=populated();
 const before=Game.quoteWallChain(s,'zarzas',perimeter,nav,options);
 s.plants.push({id:'plant-history',centerId:s.structures[0].id,alive:false,
  get x(){throw Error('Historical crop x was read');},
  get z(){throw Error('Historical crop z was read');}});
 const after=Game.quoteWallChain(s,'zarzas',perimeter,nav,options);
 assert.deepEqual(after,before);
});

test('a wall stroke leaves its closing piece unbuilt if no gate is physically valid',()=>{
 const {s,nav}=populated(),placement=nav.wallPlacement.bind(nav);
 const withGate=Game.quoteWallChain(s,'zarzas',perimeter,nav,options);
 assert.equal(withGate.gates,1);
 nav.wallPlacement=wall=>wall.gate?{valid:false}:placement(wall);
 const quote=Game.quoteWallChain(s,'zarzas',perimeter,nav,options);
 assert(quote.pieces.length<withGate.pieces.length);
 assert.equal(quote.gates,0);
 assert.throws(()=>Game.quoteWallChain(s,'zarzas',perimeter,nav,
  {...options,requireComplete:true}),{name:'IncompleteWallQuote'});
});

test('a single-piece rebuild cannot seal a room without a valid automatic gate',()=>{
 const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
 const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:-12,z:-12},nav);
 const n=6.54,points=[[0,0],[n,0],[n,n],[0,n],[0,0]];
 assert(Game.buildWallChain(s,'walls','zarzas',points,nav,options));
 const gate=s.structures.find(p=>p.autoGate);assert(gate);
 assert(Game.removeWall(s,'remove-gate',gate.id,nav));
 const placement=nav.wallPlacement.bind(nav),before=s.structures.length;
 nav.wallPlacement=wall=>wall.gate?{valid:false}:placement(wall);
 assert.equal(Game.placeStructure(s,'blocked-rebuild',{kind:'wall',material:gate.material,x:gate.x,z:gate.z,yaw:gate.yaw},nav),false);
 assert.equal(s.structures.length,before);
 assert.equal(s.ledger.entries['blocked-rebuild'],undefined);
});

test('an ungated secondary room containing a worker keeps a gap even if the first has a gate',()=>{
 const nav=new Navigation(712,'sabana',{});
 nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
 const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:-12,z:-12},nav);
 const n=6.54,points=[[0,0],[n,0],[n,n],[0,n],[0,0],[-n,0],[-n,n],[0,n]];
 const placement=nav.wallPlacement.bind(nav);
 nav.wallPlacement=wall=>wall.gate&&wall.x<=.1?{valid:false}:placement(wall);
 const empty=Game.quoteWallChain(s,'zarzas',points,nav,options);
 assert.equal(empty.pieces.length,21);assert.equal(empty.gates,1);
 s.workers=[{id:'inside-left',x:-3,z:3,status:'returning'}];
 const occupied=Game.quoteWallChain(s,'zarzas',points,nav,options);
 assert.equal(occupied.pieces.length,20);
 assert.equal(occupied.gates,1);
});

test('native movement returns an enclosed worker through the gate and clears next-day hiring',()=>{
 const {s,nav}=populated();
 assert(Game.buildWallChain(s,'walls','zarzas',perimeter,nav,options));
 assert.equal(s.structures.filter(p=>p.autoGate).length,1);
 const wall=s.structures.find(p=>p.kind==='wall'&&!p.gate&&p.x<74&&Math.abs(p.z)<10);
 assert(wall);
 const worker=s.workers[0],oldId=worker.id;
 worker.x=wall.x;worker.z=wall.z;worker.status='returning';worker.path=null;
 assert.equal(nav.walkable(worker.x,worker.z,.28,null,true),false);
 const loaded=deserialize(serialize(s));nav.setState(loaded);
 const restored=loaded.workers[0];
 for(let i=0;i<150&&restored.status!=='home';i++)Game.tick(loaded,.5,nav);
 assert.equal(restored.status,'home');
 loaded.day=2;loaded.time=0;loaded.pauses=[];
 Game.openInitialHiring(loaded);Game.hire(loaded,'next-hire',{olderFemale:1});
 assert(!loaded.workers.some(w=>w.id===oldId));
 assert.equal(loaded.workers.length,1);
});
