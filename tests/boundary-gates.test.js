import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {centerServicePoint} from '../src/world/centers.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {wallSpec} from '../src/simulation/rules.js';
import {rational} from '../src/simulation/money.js';
import {wallLayout} from '../src/world/wall-layout.js';
import {ensureBoundaryGates} from '../src/world/boundary-gates.js';
import {BALANCE} from '../src/simulation/balance.js';
const options={smooth:false,snap:false};
function flat(){
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
 const s=Game.newGame({seed:712});Game.placeStructure(s,'center',{x:-10,z:-10},nav);return {s,nav};
}
function house(s,nav){s.villages[0].buildings=[{key:'boundary-house',kind:'Casa',x:10,z:4,radius:4,footprint:[{x:8,z:0},{x:12,z:0},{x:12,z:8},{x:8,z:8}]}];nav.setState(s);}
const ushape=[[10,0],[0,0],[0,8],[10,8]];
test('a building completes an open wall stroke and the door is on the village-to-crop side',()=>{
 const {s,nav}=flat();s.villages[0].entry={x:-4,z:4};house(s,nav);Game.plant(s,'crop','mijo',4,4,nav);
 assert.ok(nav.path(s.villages[0].entry,s.plants[0],.28,null,true));const before=serialize(s),plan=Game.previewWallChain(s,'zarzas',ushape,nav,options);
 assert.equal(serialize(s),before);assert.equal(plan.gates,1);Game.buildWallChain(s,'walls','zarzas',ushape,nav,options);
 const gate=s.structures.find(c=>c.autoGate);assert.equal(gate.x,0);assert.ok(Math.abs(gate.z-4)<=1.1);
 assert.ok(nav.path(s.villages[0].entry,s.plants[0],.28,null,true));assert.ok(nav.path(s.plants[0],s.villages[0].entry,.28,null,true));
 assert.equal(s.ledger.entries.walls.n,String(-plan.cost));assert.equal(serialize(deserialize(serialize(s))),serialize(s));
});
test('a natural canyon cliff completes the enclosure without placing a gate into the cliff',()=>{
 const {s,nav}=flat();nav.field={canyon:true,riverLevel:0,surface:x=>Math.max(0,x-9)*20,blocked:()=>false,slope:()=>0};nav.setState(s);s.villages[0].entry={x:-4,z:4};Game.plant(s,'crop','mijo',4,4,nav);
 Game.buildWallChain(s,'cliff-wall','zarzas',ushape,nav,options);const gates=s.structures.filter(c=>c.autoGate);
 assert.equal(gates.length,1);assert.equal(gates[0].x,0);assert.equal(gatePortalPoints(gates[0]).length,2);
 assert.ok(gatePortalPoints(gates[0]).every(p=>nav.walkable(p.x,p.z,.28,null,true)));assert.ok(nav.path(s.villages[0].entry,s.plants[0],.28,null,true));
});
test('the native Grand Canyon cliff closes a paid perimeter with a traversable door',()=>{
 const {s,nav}=createOpeningWorld({biome:'gran-canon'}),points=[[-25,-8],[-40,-8],[-40,8],[-25,8]];
 assert.equal(nav.terrainValid(-25,0,.28,true),false);
 Game.buildWallChain(s,'native-cliff','zarzas',points,nav,options);
 const gates=s.structures.filter(p=>p.autoGate);assert.equal(gates.length,1);
 const portals=gatePortalPoints(gates[0]);assert.ok(portals.every(p=>nav.walkable(p.x,p.z,.28,null,true)));
 assert.ok(nav.path(portals[0],portals[1],.28,null,true));assert.ok(nav.path(portals[1],portals[0],.28,null,true));
 assert.equal(s.ledger.entries['native-cliff'].n,String(-10*s.structures.filter(p=>p.kind==='wall').length));
});
test('a genuinely open wall beside a building does not receive an unnecessary gate',()=>{
 const {s,nav}=flat();house(s,nav);Game.buildWallChain(s,'open','zarzas',[[6,0],[0,0],[0,8],[6,8]],nav,options);
 assert.equal(s.structures.filter(c=>c.autoGate).length,0);
});
test('closing a mixed-material perimeter converts the latest new piece and preserves every older piece',()=>{
 const {s,nav}=flat();Game.buildWallChain(s,'first','zarzas',[[0,0],[8,0],[8,8],[0,8]],nav,options);
 const older=structuredClone(s.structures),plan=Game.previewWallChain(s,'piedra',[[0,8],[0,0]],nav,options);assert.equal(plan.gates,1);
 assert.equal(plan.pieces.at(-1).gate,true);Game.buildWallChain(s,'close','piedra',[[0,8],[0,0]],nav,options);
 assert.deepEqual(s.structures.slice(0,older.length),older);const gate=s.structures.find(c=>c.autoGate);
 assert.equal(gate.material,'piedra');assert.equal(gate.maxHp,wallSpec('piedra').gate_hp);assert.equal(gate.cost,wallSpec('piedra').cost);assert.equal(s.ledger.entries.close.n,String(-plan.cost));
 const unchanged=structuredClone(s.structures.filter(c=>c.id!==gate.id));Game.removeWall(s,'remove',gate.id,nav);
 assert.equal(s.structures.filter(c=>c.autoGate).length,0);assert.deepEqual(s.structures,unchanged);
 Game.placeStructure(s,'rebuild',{kind:'wall',material:'piedra',x:gate.x,z:gate.z,yaw:gate.yaw},nav);
 assert.deepEqual(s.structures.slice(0,unchanged.length),unchanged);assert.equal(s.structures.at(-1).autoGate,true);assert.equal(s.structures.at(-1).material,'piedra');
 const snapshot=serialize(s);Game.placeStructure(s,'rebuild',{kind:'wall',material:'piedra',x:gate.x,z:gate.z,yaw:gate.yaw},nav);assert.equal(serialize(s),snapshot);
});
test('the recorded native perimeter keeps skipped rock modules and creates one accessible gate',()=>{
 const {s,nav}=createOpeningWorld(),point=centerServicePoint(s.structures[0],s,.8),points=[[73,-15.5],[102.5,-15.5],[102.5,15.5],[73,15.5],[73,-15.5]];
 Game.buildWallChain(s,'perimeter','zarzas',points,nav,options);const walls=s.structures.filter(c=>c.kind==='wall'),gates=walls.filter(c=>c.autoGate);
 assert.equal(walls.length,50);assert.equal(gates.length,1);assert.equal(gates[0].x,73);assert.ok(nav.path(s.villages[0].entry,point,.28,null,true));assert.equal(s.ledger.entries.perimeter.n,'-500');
});

for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])test(`incremental ${material} closure and rebuilding preserve the other materials`,()=>{
 const {s,nav}=flat();s.ledger.balance=rational(20000);
 Game.buildWallChain(s,'south','zarzas',[[0,0],[8,0]],nav,options);
 Game.buildWallChain(s,'east','adobe',[[8,0],[8,8]],nav,options);
 Game.buildWallChain(s,'north','empalizada',[[8,8],[0,8]],nav,options);
 const older=structuredClone(s.structures),plan=Game.previewWallChain(s,material,[[0,8],[0,0]],nav,options);
 assert.equal(plan.gates,1);assert.equal(plan.pieces.at(-1).autoGate,true);
 Game.buildWallChain(s,'close',material,[[0,8],[0,0]],nav,options);
 assert.deepEqual(s.structures.slice(0,older.length),older);
 const gate=s.structures.at(-1);assert.equal(gate.material,material);assert.equal(gate.maxHp,wallSpec(material).gate_hp);
 assert.ok(gatePortalPoints(gate).every(p=>nav.walkable(p.x,p.z,.28,null,true)));
 Game.removeWall(s,'remove',gate.id,nav);const remaining=structuredClone(s.structures);
 Game.placeStructure(s,'rebuild',{kind:'wall',material,x:gate.x,z:gate.z,yaw:gate.yaw},nav);
 assert.deepEqual(s.structures.slice(0,remaining.length),remaining);assert.equal(s.structures.at(-1).autoGate,true);
 const unchanged=serialize(s);Game.buildWallChain(s,'close',material,[[0,8],[0,0]],nav,options);assert.equal(serialize(s),unchanged);
});

test('rebuilding several removed blocks adds a door only when the final gap closes',()=>{
 const {s,nav}=flat();Game.buildWallChain(s,'ring','zarzas',[[0,0],[8,0],[8,8],[0,8],[0,0]],nav,options);
 const gate=s.structures.find(p=>p.autoGate),neighbor=s.structures.find(p=>p.kind==='wall'&&p.id!==gate.id&&Math.hypot(p.x-gate.x,p.z-gate.z)<2.2);
 assert.ok(neighbor);Game.removeWall(s,'remove-gate',gate.id,nav);Game.removeWall(s,'remove-neighbor',neighbor.id,nav);
 const remaining=structuredClone(s.structures);
 Game.placeStructure(s,'restore-first',{kind:'wall',material:'adobe',x:gate.x,z:gate.z,yaw:gate.yaw},nav);
 assert.equal(s.structures.filter(p=>p.autoGate).length,0);
 const first=structuredClone(s.structures.at(-1));
 Game.placeStructure(s,'restore-last',{kind:'wall',material:'piedra',x:neighbor.x,z:neighbor.z,yaw:neighbor.yaw},nav);
 assert.equal(s.structures.at(-1).autoGate,true);assert.deepEqual(s.structures.at(-2),first);
 assert.deepEqual(s.structures.slice(0,remaining.length),remaining);
});

test('an existing usable gate survives later perimeter edits without adding another door',()=>{
 const {s,nav}=flat();Game.buildWallChain(s,'ring','zarzas',[[0,0],[8,0],[8,8],[0,8],[0,0]],nav,options);
 const gate=structuredClone(s.structures.find(p=>p.autoGate)),wall=s.structures.find(p=>p.kind==='wall'&&!p.gate);
 Game.removeWall(s,'remove',wall.id,nav);Game.placeStructure(s,'restore',{kind:'wall',material:'adobe',x:wall.x,z:wall.z,yaw:wall.yaw},nav);
 assert.deepEqual(s.structures.find(p=>p.id===gate.id),gate);assert.equal(s.structures.filter(p=>p.autoGate).length,1);assert.equal(s.structures.at(-1).gate,false);
});

for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])test(`an existing ${material} door is preserved when multiple gaps are rebuilt with other materials`,()=>{
 const {s,nav}=flat();s.ledger.balance=rational(20000);
 Game.buildWallChain(s,'ring',material,[[0,0],[12,0],[12,12],[0,12],[0,0]],nav,options);
 const originalGate=s.structures.find(p=>p.autoGate);assert.ok(originalGate);
 originalGate.hp=originalGate.maxHp*.5;originalGate.status='damaged';nav.setState(s);
 const gate=structuredClone(originalGate),walls=s.structures.filter(p=>p.kind==='wall'&&!p.gate).slice(-2);
 assert.equal(walls.length,2);
 for(const wall of walls)Game.removeWall(s,'remove-'+wall.id,wall.id,nav);
 for(const [i,wall] of walls.entries()){
  Game.placeStructure(s,'restore-'+wall.id,{kind:'wall',material:['adobe','piedra'][i],x:wall.x,z:wall.z,yaw:wall.yaw},nav);
  assert.equal(s.structures.filter(p=>p.gate).length,1);assert.deepEqual(s.structures.find(p=>p.id===gate.id),gate);
 }
 const loaded=deserialize(serialize(s));assert.equal(loaded.structures.filter(p=>p.gate).length,1);assert.equal(JSON.stringify(loaded.structures.find(p=>p.id===gate.id)),JSON.stringify(gate));
});

test('an obstructed approach to an existing door does not make the planner create a second door',()=>{
 const {s,nav}=flat();Game.buildWallChain(s,'ring','zarzas',[[0,0],[8,0],[8,8],[0,8],[0,0]],nav,options);
 const layout=wallLayout(s.structures,Object.fromEntries(BALANCE.walls.map(p=>[p.id,p.hp]))),before=structuredClone(layout.pieces);
 // Simulate a blocked approach without changing the already built door.
 const canHost=p=>p.kind!=='gate';
 assert.equal(ensureBoundaryGates(layout,nav,canHost,()=>true),0);assert.deepEqual(layout.pieces,before);
});
