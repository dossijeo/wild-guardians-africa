import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry} from 'three';
import {LoadingDiorama} from '../src/rendering/loading-diorama.js';
test('a held pointer is captured and losing capture resumes orbit without planting',()=>{
 const canvas=new EventTarget(),captured=[];canvas.setPointerCapture=id=>captured.push(id);
 const geometry=new BufferGeometry(),d=new LoadingDiorama({assets:{},canvas,sky:{geometry,uniforms:{}}});d.interactive=true;let plants=0;d.plantAt=()=>plants++;
 const down=new Event('pointerdown',{cancelable:true});Object.assign(down,{button:0,pointerId:7,clientX:20,clientY:30,pointerType:'touch'});canvas.dispatchEvent(down);assert.deepEqual(captured,[7]);assert.equal(d.orbit.held,true);assert.equal(down.defaultPrevented,true);
 canvas.dispatchEvent(new Event('lostpointercapture'));assert.equal(d.orbit.held,false);assert.equal(plants,0);for(let i=0;i<180;i++)d.orbit.step(1/60);assert.ok(d.orbit.angle>0);
 d.dispose();geometry.dispose();
});
