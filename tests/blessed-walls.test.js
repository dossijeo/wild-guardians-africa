import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {BALANCE} from '../src/simulation/balance.js';
import {awakeningState,activeBlessings} from '../src/simulation/awakenings.js';
import {wallDamageReduction,wallsContiguous} from '../src/simulation/blessed-walls.js';
import {hitStructure} from '../src/simulation/rules.js';
import {wallCollisionFrame,wallCollisionPolygon} from '../src/world/wall-collision-frame.js';
import {wallLayout,WALL_UNIT,gateScale} from '../src/world/wall-layout.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {clearNavigation} from './clear-navigation.js';
const bless=(s,w,id='bless')=>{awakeningState(s).progress=100;Game.bless(s,id,w.id);};
function fixture(material='zarzas',gate=false){
  const s=Game.newGame({seed:712,slotId:'blessed-walls'}),nav=clearNavigation();
  Game.placeStructure(s,'center',{x:4,z:0},nav);
  Game.placeStructure(s,'wall',{kind:'wall',material,gate,x:10,z:0},nav);
  return {s,nav,wall:s.structures[1]};
}
test('all existing wall materials and gates get exactly 25% protection without changing collision, HP capacity or layout',()=>{
  for(const spec of BALANCE.walls)for(const gate of [false,true]){
    const {s,wall,nav}=fixture(spec.id,gate),max=wall.maxHp;
    const shape=wallCollisionFrame(wall),polygon=JSON.stringify(wallCollisionPolygon(wall,.28));
    const layout=wallLayout(s.structures,{}),before=layout.pieces.map(p=>layout.endpoints(p));
    let navWrites=0;nav.setState=()=>navWrites++;
    bless(s,wall);assert.equal(navWrites,0);assert.strictEqual(wallCollisionFrame(wall),shape);
    assert.equal(JSON.stringify(wallCollisionPolygon(wall,.28)),polygon);
    const after=wallLayout(s.structures,{});assert.deepEqual(after.pieces.map(p=>after.endpoints(p)),before);
    assert.equal(wall.maxHp,max);assert.equal(wallDamageReduction(wall,s),.25);
    hitStructure(wall,40,s.elapsed,s);assert.equal(wall.hp,max-30);
    assert.equal(wall.material,spec.id);assert.equal(wall.gate,gate);assert.ok(wall.blessing);
    assert.doesNotThrow(()=>serialize(s));
  }
});
test('only directly connected segments receive 10%: near isolated pieces and the next chain link receive none',()=>{
  const {s,wall,nav}=fixture();
  Game.placeStructure(s,'neighbor',{kind:'wall',x:10+WALL_UNIT,z:0},nav);
  Game.placeStructure(s,'farther',{kind:'wall',x:10+WALL_UNIT*2,z:0},nav);
  Game.placeStructure(s,'isolated',{kind:'wall',x:10,z:1},nav);
  const [neighbor,farther,isolated]=s.structures.slice(2);bless(s,wall);
  assert.equal(wallsContiguous(wall,neighbor),true);assert.equal(wallDamageReduction(neighbor,s),.1);
  assert.equal(wallDamageReduction(farther,s),0);assert.equal(wallDamageReduction(isolated,s),0);
  hitStructure(neighbor,40,0,s);assert.equal(neighbor.hp,neighbor.maxHp-36);
  bless(s,farther,'other-source');assert.equal(wallDamageReduction(neighbor,s),.1,'two sources never stack');
  bless(s,neighbor,'own-source');assert.equal(wallDamageReduction(neighbor,s),.25,'own protection never stacks with neighbors');
});
test('the same physical segment graph supports T junctions, crossings, scaled modules and gate widths',()=>{
  const {s,wall,nav}=fixture('piedra',true),half=WALL_UNIT*gateScale('piedra')/2;
  Game.placeStructure(s,'junction',{kind:'wall',x:10,z:WALL_UNIT/2,yaw:-Math.PI/2},nav);
  const junction=s.structures.at(-1);assert.equal(wallsContiguous(wall,junction),true);
  Game.placeStructure(s,'crossing',{kind:'wall',x:10,z:0,yaw:Math.PI/2},nav);
  const crossing=s.structures.at(-1);assert.equal(wallsContiguous(wall,crossing),true);
  Game.placeStructure(s,'gate-neighbor',{kind:'wall',x:10+half+WALL_UNIT/2,z:0},nav);
  assert.equal(wallsContiguous(wall,s.structures.at(-1)),true);
  bless(s,wall);assert.equal(wallDamageReduction(junction,s),.1);
  wall.baseScaleX=.4;assert.equal(wallDamageReduction(s.structures.at(-1),s),0,'geometry is read after a real scale change');
});
test('ordinary paid repair retains the blessing and never creates regeneration',()=>{
  const {s,wall,nav}=fixture('adobe');bless(s,wall);
  hitStructure(wall,40,0,s);const wounded=wall.hp,provenance=structuredClone(wall.blessing);
  Game.tick(s,15,nav);assert.equal(wall.hp,wounded,'a blessing has no automatic regeneration');
  Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:1});
  const before=numberOf(s.ledger.balance),expected=Math.ceil(numberOf(Game.repairCost(wall)));
  Game.requestRepair(s,'repair',wall.id);Game.tick(s,100,nav);
  assert.equal(wall.hp,wall.maxHp);assert.deepEqual(wall.blessing,provenance);
  assert.equal(numberOf(s.ledger.balance),before-expected);
  const saved=serialize(s);assert.equal(serialize(deserialize(saved)),saved);
});
test('destruction and rebuilding never restore a lost blessing, reduce progress or remove another source',()=>{
  const {s,wall,nav}=fixture();
  Game.placeStructure(s,'other',{kind:'wall',x:20,z:0},nav);const other=s.structures.at(-1);
  bless(s,wall);bless(s,other,'bless-other');s.awakenings.progress=42;
  hitStructure(wall,1000,0,s);assert.equal(wall.status,'collapsing');
  assert.equal(wallDamageReduction(wall,s),0);Game.tick(s,2,nav);
  assert.equal(wall.status,'ruined');assert.equal(wall.blessing,undefined);
  assert.equal(s.awakenings.progress,42);assert.equal(s.awakenings.destroyed,1);
  assert.equal(activeBlessings(s).length,1);assert.ok(other.blessing);
  Game.pause(s,'hiring');Game.hire(s,'hire',{olderFemale:1});
  Game.requestRepair(s,'rebuild',wall.id);Game.tick(s,100,nav);
  assert.equal(wall.status,'intact');assert.equal(wall.blessing,undefined);
  assert.equal(wallDamageReduction(wall,s),0);assert.doesNotThrow(()=>serialize(s));
  assert.equal(s.events.filter(e=>e.type==='BlessingDestroyed').length,1);
});
test('manual removal returns only the ordinary material refund, loses the source once and updates neighbors',()=>{
  const {s,wall,nav}=fixture();Game.placeStructure(s,'neighbor',{kind:'wall',x:10+WALL_UNIT,z:0},nav);
  const neighbor=s.structures.at(-1);wall.hp=wall.maxHp*.6;
  const expected=numberOf(Game.wallRefund(wall));bless(s,wall);s.awakenings.progress=37;
  const before=numberOf(s.ledger.balance);assert.equal(wallDamageReduction(neighbor,s),.1);
  Game.removeWall(s,'remove',wall.id,nav);assert.equal(numberOf(s.ledger.balance),before+expected);
  assert.equal(s.awakenings.progress,37);assert.equal(s.awakenings.destroyed,1);
  assert.equal(wallDamageReduction(neighbor,s),0);assert.equal(s.events.at(-1).type,'WallRemoved');
  const saved=serialize(s);assert.equal(Game.removeWall(s,'remove',wall.id,nav),false);assert.equal(serialize(s),saved);
});
test('unblessed walls and centers retain their original damage model',()=>{
  const {s,wall}=fixture();hitStructure(wall,40,0,s);assert.equal(wall.hp,60);
  const center=s.structures[0];hitStructure(center,40,0,s);assert.equal(center.hp,center.maxHp-40);
  awakeningState(s).enabled=false;awakeningState(s).progress=100;
  assert.throws(()=>Game.bless(s,'disabled',wall.id));assert.equal(s.awakenings.progress,100);
});
