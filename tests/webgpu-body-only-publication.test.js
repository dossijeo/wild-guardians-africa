import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene} from 'three';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture({fail=false,waiting=false}={}){
 const scene=new Scene(),terrain=new Group(),actor=new Group(),motor=new Group(),events=[],tickets=[];scene.add(terrain,actor,motor);let selected='live',release;
 const admission={prepareManyAndPublish(){},async prepareTicket(object,{signal}){tickets.push(object);if(waiting)await new Promise(resolve=>{release=resolve;});return {valid:()=>!signal.aborted};}},coordinator=createChunkPublicationCoordinator({admission});
 const part=object=>{const controller=new AbortController();return {object,signal:controller.signal,valid:()=>true,eventRoots:()=>[object],presentation:()=>({show:[object],hide:[]}),capturePresentation(record){const previous=selected;selected='prepared';try{return record();}finally{selected=previous;}},activate(){events.push('activate '+object.uuid);return true;},attach(){events.push('attach '+object.uuid);},rollback(){events.push('rollback '+object.uuid);},finalize(){events.push('finalize '+object.uuid);if(fail&&object===motor)throw Error('motor failed');return {retire(){events.push('retire '+object.uuid);},notify(){events.push('notify '+object.uuid);}};},rollbackFinalized(){events.push('undo '+object.uuid);},cancel(){events.push('cancel '+object.uuid);controller.abort();}};};
 return {scene,terrain,actor,motor,events,tickets,coordinator,parts:[part(actor),part(motor)],selected:()=>selected,release:()=>release()};
}

test('body/motor-only batch captures then restores the live graph and retires after both owners publish',async()=>{
 const f=fixture();try{
  const children=[...f.scene.children],batch=await f.coordinator.prepareBatch([],{scene:f.scene,dependents:f.parts});assert.deepEqual(f.tickets,[f.actor,f.motor]);assert.equal(batch.capturePresentation(()=>{assert.equal(f.selected(),'prepared');assert.deepEqual(f.scene.children,children);return 7;}),7);assert.equal(f.selected(),'live');assert.deepEqual(f.scene.children,children);assert.equal(batch.commit(),true);assert.equal(batch.valid(),false);assert.deepEqual(f.events.map(s=>s.split(' ')[0]),['activate','activate','attach','attach','finalize','finalize','retire','retire','notify','notify']);assert.deepEqual(f.scene.children,children);
 }finally{f.coordinator.dispose();}
});

test('failed body-only publication rolls back both owners before cancellation without retiring live resources',async()=>{
 const f=fixture({fail:true});try{const children=[...f.scene.children],batch=await f.coordinator.prepareBatch([],{scene:f.scene,dependents:f.parts});assert.throws(()=>batch.commit(),/motor failed/);assert.deepEqual(f.events.map(s=>s.split(' ')[0]),['activate','activate','attach','attach','finalize','finalize','undo','undo','rollback','rollback','cancel','cancel']);assert.deepEqual(f.scene.children,children);}finally{f.coordinator.dispose();}
});

test('disposal aborts an in-flight body-only reservation and prevents another ticket',async()=>{
 const f=fixture({waiting:true});const pending=f.coordinator.prepareBatch([],{scene:f.scene,dependents:f.parts});await Promise.resolve();f.coordinator.dispose();f.release();await assert.rejects(pending,/stale|cancel/i);assert.deepEqual(f.tickets,[f.actor]);assert.deepEqual(f.events.map(s=>s.split(' ')[0]),['cancel','cancel']);
});

test('body-only capture restores the selected live state when recording throws',async()=>{
 const f=fixture();try{const batch=await f.coordinator.prepareBatch([],{scene:f.scene,dependents:f.parts});assert.throws(()=>batch.capturePresentation(()=>{throw Error('record failed');}),/record failed/);assert.equal(f.selected(),'live');assert.equal(batch.valid(),false);assert(f.events.every(s=>s.startsWith('cancel ')));}finally{f.coordinator.dispose();}
});
