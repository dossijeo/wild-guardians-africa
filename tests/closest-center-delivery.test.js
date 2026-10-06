import test from 'node:test';
import assert from 'node:assert/strict';
import {centerDeliveryPoint,centerFootprint} from '../src/world/centers.js';
import {footprintDistance} from '../src/world/footprints.js';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
for(const culture of Game.CULTURES)test(`${culture}: rotated authored hull has the closest safe delivery edge in every direction`,()=>{
 for(const yaw of [0,.73,2.4]){
  const center={id:'center',kind:'center',culture,x:12,z:-8,yaw,hp:100,maxHp:100,status:'intact'},s=Game.newGame({culture});s.structures=[center];
  const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
  const hull=centerFootprint(center,s).footprint;
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12,source={x:center.x+Math.sin(a)*20,z:center.z+Math.cos(a)*20},edge=centerDeliveryPoint(center,source,s,0),point=centerDeliveryPoint(center,source,s);
   assert.ok(Math.abs(Math.hypot(source.x-edge.x,source.z-edge.z)-footprintDistance(hull,source.x,source.z))<1e-8);
   assert.ok(footprintDistance(hull,point.x,point.z)>=.6-1e-8);assert.ok(nav.segmentClear(source,point,.28,null,true));
  }
 }
});
test('a western crop delivers on the near western edge, survives reload, and credits only after physical arrival',()=>{
 const s=Game.newGame({seed:712});s.ledger.balance=rational(10000);const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},terrainValid:()=>true,walkable:()=>true,path:(a,b)=>[{x:b.x,z:b.z}]};
 Game.placeStructure(s,'center',{x:10,z:0},nav);Game.plant(s,'seed','mijo',-10,0,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderFemale:1});
 for(let i=0;i<4000&&!s.crates.length;i++)Game.tick(s,.05,nav);
 assert.equal(s.crates.length,1);const before=numberOf(s.ledger.balance);Game.tick(s,.05,nav);
 const w=s.workers[0],point={...w.deliveryApproach};assert.ok(point.x<s.structures[0].x);assert.equal(numberOf(s.ledger.balance),before);assert.equal(s.crates[0].delivered,false);
 const loaded=deserialize(serialize(s));Game.tick(loaded,.05,nav);assert.deepEqual(loaded.workers[0].deliveryApproach,point);
 for(let i=0;i<1000&&!loaded.crates[0].delivered;i++)Game.tick(loaded,.05,nav);
 assert.equal(loaded.crates[0].delivered,true);assert.ok(Math.hypot(loaded.workers[0].x-point.x,loaded.workers[0].z-point.z)<1e-8);assert.equal(numberOf(loaded.ledger.balance),before+11);
 Game.tick(loaded,.1,nav);assert.equal(numberOf(loaded.ledger.balance),before+11);
});
