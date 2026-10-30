import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {createPlant} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {beginAwakening,revealAwakening,awakeningVisible,RITUAL} from '../src/rendering/awakening-presentation.js';
import {GuardianSummons} from '../src/rendering/guardian-summons.js';
test('confirmed blessing persists before the pulse, duplicate commands spend nothing, reload reveals it',()=>{
 const s=Game.newGame({seed:712,slotId:'ritual'});s.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:10,z:10});const p=createPlant('plant-2','maiz',0,0,'center');s.plants.push(p);awakeningState(s).progress=100;
 const before=serialize(s);Game.previewBlessing(s,p.id);assert.equal(serialize(s),before,'preview/cancel is read-only');
 Game.bless(s,'ritual',p.id);beginAwakening(p,s.elapsed);assert.ok(p.blessing);assert.equal(s.awakenings.progress,0);assert.equal(awakeningVisible(p,s.elapsed),false);assert.equal(Game.bless(s,'ritual',p.id),false);assert.equal(s.awakenings.total,1);
 const restored=deserialize(serialize(s));assert.ok(restored.plants[0].blessing);assert.equal(restored.awakenings.progress,0);assert.equal(awakeningVisible(restored.plants[0],restored.elapsed),true);
 assert.equal(awakeningVisible(p,s.elapsed+RITUAL.pulse-.001),false);assert.equal(awakeningVisible(p,s.elapsed+RITUAL.pulse),true);
});
test('single-actor interruption finalizes presentation without mutating the committed target',()=>{
 const p={blessing:{at:10}},s={event:{kind:'awakening'},ritualTarget:p,aura:{clear(){}},group:{},beam:{},impact:{},core:{},vortex:{}};beginAwakening(p,10);const before=JSON.stringify(p);
 GuardianSummons.prototype.hide.call({world:{state:{elapsed:10.5}},ritual:{hide(){}}},s);
 assert.equal(awakeningVisible(p,10.5),true);assert.equal(JSON.stringify(p),before);assert.equal(s.event,null);for(const key of ['group','beam','impact','core','vortex'])assert.equal(s[key].visible,false);
 beginAwakening(p,11);assert.equal(awakeningVisible(p,11),true,'late duplicate event does not hide an already revealed blessing');
});
