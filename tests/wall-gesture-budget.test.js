import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {WallDrawing} from '../src/rendering/wall-drawing.js';
import {BALANCE as B} from '../src/simulation/balance.js';
import {rational,numberOf,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
const nav=clearNavigation();
function fixture(balance){const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:-20,z:0},nav);s.day=101;s.postgame=true;s.initialPreparation=false;s.ledger.balance=rational(balance);return s;}
for(const spec of B.walls)test(`${spec.id}: a long visible native stroke stops at the affordable modules and keeps the wage reserve`,()=>{
 const s=fixture(30+spec.cost*3+spec.cost-1),points=[[0,0],[100,0]],before=serialize(s),draft=Game.affordableWallStroke(s,spec.id,points);
 assert.equal(draft.maxPieces,3);assert.equal(draft.slots.length,3);assert.ok(draft.points.at(-1)[0]<=3*2.18+1e-8);assert.equal(serialize(s),before);
 Game.buildWallChain(s,'release',spec.id,points,nav,{maxPieces:draft.maxPieces});assert.equal(s.structures.filter(p=>p.kind==='wall').length,3);assert.equal(numberOf(s.ledger.balance),30+spec.cost-1);assert.equal(Game.buildWallChain(s,'release',spec.id,points,nav,{maxPieces:3}),false);
});
test('real pointer release builds immediately without a confirmation step; pointer cancellation never spends',()=>{
 const s=fixture(110),handlers=new Map(),canvas={addEventListener:(n,fn)=>handlers.set(n,fn),removeEventListener(){},setPointerCapture(){},releasePointerCapture(){}};let visible=[];
 const drawing=new WallDrawing(canvas,{point:e=>({x:e.clientX,z:e.clientY}),tap:()=>{},preview:p=>visible=Game.affordableWallStroke(s,'adobe',p).points,stroke:p=>Game.buildWallChain(s,'release','adobe',p,nav,{maxPieces:Game.wallCapacity(s,'adobe')})});drawing.setEnabled(true);
 const event=(name,x)=>handlers.get(name)({pointerId:1,button:0,clientX:x,clientY:0,preventDefault(){},stopImmediatePropagation(){}});
 event('pointerdown',0);event('pointermove',100);assert.ok(visible.at(-1)[0]<=4.36);assert.equal(numberOf(s.ledger.balance),110);assert.equal(s.structures.length,1);
 event('pointerup',100);assert.equal(s.structures.length,3);assert.equal(numberOf(s.ledger.balance),40);assert.deepEqual(visible,[]);
 event('pointerdown',20);event('pointermove',40);event('pointercancel',40);assert.equal(s.structures.length,3);assert.equal(numberOf(s.ledger.balance),40);drawing.dispose();
});
test('existing modules do not spend the new stroke budget twice',()=>{
 const s=fixture(1000);Game.buildWallChain(s,'old','zarzas',[[0,0],[4,0]],nav,{smooth:false,snap:false});s.ledger.balance=rational(80);
 const draft=Game.affordableWallStroke(s,'zarzas',[[0,0],[16,0]]);assert.equal(draft.slots.length,5);assert.ok(draft.points[0][0]>=4-1e-8);
 Game.buildWallChain(s,'extend','zarzas',[[0,0],[16,0]],nav,{maxPieces:draft.maxPieces});assert.equal(s.structures.filter(p=>p.kind==='wall').length,7);assert.equal(numberOf(s.ledger.balance),30);
});
test('healthy, damaged, fractional-health gate and ruined pieces refund their remaining whole-coin value once',()=>{
 for(const damage of [1,.73,0]){
  const s=fixture(1000);Game.placeStructure(s,'wall',{kind:'wall',material:'adobe',x:10,z:0},nav);const wall=s.structures.at(-1);wall.hp=wall.maxHp*damage;if(!damage)wall.status='ruined';const before=numberOf(s.ledger.balance),expected=Math.ceil(wall.cost*damage);
  assert.equal(numberOf(Game.wallRefund(wall)),expected);Game.removeWall(s,'remove',wall.id,nav);assert.equal(numberOf(s.ledger.balance),before+expected);assert.equal(Game.removeWall(s,'remove',wall.id,nav),false);assert.throws(()=>Game.removeWall(s,'remove-again',wall.id,nav));assert.equal(numberOf(deserialize(serialize(s)).ledger.balance),before+expected);
 }
 const s=fixture(1000);Game.placeStructure(s,'gate',{kind:'wall',material:'empalizada',gate:true,x:10,z:0},nav);const gate=s.structures.at(-1);gate.hp=gate.maxHp*.73;assert.equal(numberOf(Game.wallRefund(gate)),Math.ceil(gate.cost*.73));
});
