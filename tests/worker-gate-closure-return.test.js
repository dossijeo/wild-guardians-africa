import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fixture(material,origin=.1){
 const nav=new Navigation(712,'sabana',{});nav.field={slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
 const s=Game.newGame({seed:712});s.villages[0].entry={x:-4,z:4};s.villages[0].buildings=[];
 Game.placeStructure(s,'center',{x:-10,z:-10},nav);s.ledger.balance=rational(20000);
 Game.pause(s,'hiring');Game.hire(s,'hire-one',{olderMale:1});
 const w=s.workers[0];Object.assign(w,{x:origin,z:4,status:'idle',path:null});
 Game.buildWallChain(s,'first',material,[[0,0],[8,0],[8,8],[0,8]],nav,{smooth:false,snap:false});
 Game.buildWallChain(s,'close',material,[[0,8],[0,0]],nav,{smooth:false,snap:false});
 s.pauses=[];s.time=251;s.elapsed=251;s.nightPlan={done:true,group:[]};
 return {s,nav,w};
}
for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])for(const origin of [.1,4])test(`${material}: existing worker ${origin===4?'inside':'at a module seam'} exits the new automatic gate`,()=>{
 let {s,nav,w}=fixture(material,origin);
 const gate=s.structures.find(p=>p.autoGate);assert(gate);
 const ledger=structuredClone(s.ledger),walls=structuredClone(s.structures);
 let crossed=false;
 for(let i=0;i<600&&w.status!=='home';i++){
  const before={x:w.x,z:w.z};Game.tick(s,.1,nav);
  assert(Math.hypot(w.x-before.x,w.z-before.z)<.8,'No relocation or teleport');
  if(before.x>=0&&w.x<0){crossed=true;assert(Math.abs(w.z-gate.z)<1.3,'Exit uses the automatic gate');}
  if(i===1){s=deserialize(serialize(s));nav.setState(s);w=s.workers[0];}
 }
 assert.equal(w.status,'home');assert(crossed);
 assert.deepEqual(s.ledger,ledger,'Recovery does not debit or refund money');
 assert.equal(JSON.stringify(s.structures.map(p=>({...p,gateOpen:0}))),JSON.stringify(walls.map(p=>({...p,gateOpen:0}))),'No wall removal or hidden opening; JSON roundtrip normalizes negative zero');
 s.time=599;s.elapsed=599;Game.tick(s,1,nav);assert.equal(s.day,2);assert(s.pauses.includes('hiring'));
 Game.hire(s,'hire-two',{olderMale:1});assert.equal(s.workers.length,1);
 assert.equal(s.workers[0].contractDay,2);assert.equal(s.workers[0].personId,w.personId,'Person returns to the available pool');
});

test('a blocked return origin does not start a fresh broad search every tick',()=>{
 const {s,nav,w}=fixture('zarzas');w.status='returning';
 // A new perpendicular solid makes the bounded overlap exit impossible.
 s.structures.push({id:'blocked',created:s.nextId++,kind:'wall',material:'zarzas',x:.1,z:4,yaw:0,baseScaleX:1,hp:100,maxHp:100,cost:10,status:'intact',collapseRemaining:0,villageId:s.villages[0].id});nav.setState(s);
 let wideSearches=0;const search=nav.findPathSteps;nav.findPathSteps=function*(...args){if(args[5]===32)wideSearches++;return yield* search.call(this,...args);};
 for(let i=0;i<200;i++)Game.tick(s,.1,nav);
 assert.equal(wideSearches,0);assert.equal(w.x,.1);assert.equal(w.z,4);
 Game.removeWall(s,'unblock','blocked',nav);
 for(let i=0;i<600&&w.status!=='home';i++)Game.tick(s,.1,nav);
 assert.equal(w.status,'home','Geometry changes invalidate the failure and permit recovery');
});
