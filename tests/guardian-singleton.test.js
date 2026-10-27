import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GuardianSummons} from '../src/rendering/guardian-summons.js';
test('consecutive spells reuse exactly one body and clear the previous presentation',async()=>{
 const world={state:{events:[],elapsed:1,time:150},scene:new THREE.Scene(),assets:{model:async()=>({scene:new THREE.Group(),animations:[]})},vfxLibrary:{create:()=>Object.assign(new THREE.Group(),{sprites:{material:{}},ribbons:{material:{}},localLights:[],clear(){this.clears=(this.clears??0)+1;},seek(){},advance(){},prepare(){return false;},dispose(){}})}};
 const summons=new GuardianSummons(world);await summons.ready;
 assert.equal(summons.slots.length,1);const slot=summons.slots[0];
 for(let i=0;i<20;i++){
  const event={type:'SpellActivated',kind:i%2?'attack':'growth',x:i,z:0,presentation:{origin:{x:i+2,y:2,z:0},contact:{x:i,y:1,z:0},elapsed:world.state.elapsed}};
  world.state.events.push(event);summons.update();
  assert.equal(summons.slots[0],slot);assert.equal(summons.slots.filter(s=>s.group.visible).length,1);assert.equal(summons.stats.active,1);assert.equal(slot.event,event);assert.equal(slot.group.position.x,i+2);world.state.elapsed+=.1;
 }
 assert.equal(summons.stats.reused,19);assert.equal(slot.aura.clears,20);
 world.state.elapsed+=3;summons.update();assert.equal(summons.stats.active,0);assert.ok([slot.group,slot.aura,slot.beam,slot.core,slot.impact,slot.vortex].every(o=>!o.visible));
 summons.dispose();assert.equal(world.scene.children.length,0);
});
