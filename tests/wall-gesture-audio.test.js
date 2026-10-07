import test from 'node:test';
import assert from 'node:assert/strict';
import {WallDrawing} from '../src/rendering/wall-drawing.js';
import {UiAudio} from '../src/audio/ui-audio.js';

function fixture({deferred=false,screenSpace=true}={}){
 const calls=[],pending=[],phases=[],strokes=[],taps=[],listeners=new Map();let now=0,stops=0,terrainQueries=0;
 const ui=new UiAudio((id,options)=>{calls.push({id,options});if(deferred)return new Promise(resolve=>pending.push(resolve));return {stop(){stops++;}};},()=>now);
 const canvas={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),setPointerCapture(){},releasePointerCapture(){}};
 const drawing=new WallDrawing(canvas,{screenSpace,requestFrame:null,point:e=>{terrainQueries++;return {x:e.clientX,z:e.clientY};},stroke:points=>strokes.push(points),tap:e=>taps.push(e),activity:phase=>{phases.push(phase);ui.wallGesture(phase);}});
 drawing.setEnabled(true);
 const event=(name,x,y,id=1)=>listeners.get(name)({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
 return {ui,drawing,calls,pending,phases,strokes,taps,event,time:value=>now=value,stops:()=>stops,queries:()=>terrainQueries};
}

test('many motion samples yield one drag and one release without terrain work while drawing',async()=>{
 const f=fixture();f.event('pointerdown',0,0);for(let i=1;i<=300;i++)f.event('pointermove',i,20);
 assert.equal(f.queries(),0);assert.deepEqual(f.calls.map(c=>c.id),['spirit_drag']);
 await new Promise(resolve=>setImmediate(resolve));f.event('pointerup',300,20);
 assert.deepEqual(f.calls.map(c=>c.id),['spirit_drag','spirit_drop']);assert.equal(f.stops(),1);assert.equal(f.strokes.length,1);
 assert.ok(f.calls.every(c=>c.options.bus==='ui'&&c.options.emitter==='ui:wall-stroke'));
});
test('tap is silent and release-only displacement drops once without invented dragging',()=>{
 const f=fixture();f.event('pointerdown',10,10);f.event('pointerup',11,12);assert.equal(f.calls.length,0);assert.equal(f.taps.length,1);
 f.event('pointerdown',0,0);f.event('pointerup',100,10);assert.deepEqual(f.calls.map(c=>c.id),['spirit_drop']);assert.equal(f.strokes.length,1);
});
test('cancel, two-finger pan, disable and disposal never drop or submit a partial wall',async()=>{
 for(const action of ['cancel','multi','disable','dispose']){
  const f=fixture();f.event('pointerdown',0,0);f.event('pointermove',80,20);await new Promise(resolve=>setImmediate(resolve));
  if(action==='cancel')f.event('pointercancel',80,20);else if(action==='multi')f.event('pointerdown',100,0,2);else if(action==='disable')f.drawing.setEnabled(false);else f.drawing.dispose();
  assert.equal(f.stops(),1,action);assert.deepEqual(f.calls.map(c=>c.id),['spirit_drag']);assert.equal(f.calls[0].options.isCurrent(),false);assert.equal(f.strokes.length,0);
 }
});
test('late decode never revives cancelled, expired, superseded or reset drag and drop requests',async()=>{
 for(const action of ['cancel','release','expired','reset']){
  const f=fixture({deferred:true});f.event('pointerdown',0,0);f.event('pointermove',80,20);
  if(action==='cancel')f.event('pointercancel',80,20);else if(action==='release')f.event('pointerup',80,20);else if(action==='expired')f.time(.501);else f.ui.reset();
  assert.equal(f.calls[0].options.isCurrent(),false);f.pending[0]({stop(){f.ui.lateStopped=true;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(f.ui.lateStopped,true);
  if(action==='release'){assert.equal(f.calls[1].options.isCurrent(),true);f.event('pointerdown',0,0);assert.equal(f.calls[1].options.isCurrent(),false);}
 }
});
test('audio failures leave the completed curve and task submission unchanged',()=>{
 const f=fixture();f.ui.play=()=>{throw Error('audio unavailable');};f.event('pointerdown',0,0);f.event('pointermove',80,20);f.event('pointerup',90,30);
 assert.deepEqual(f.strokes,[[[0,0],[80,20],[90,30]]]);assert.equal(f.drawing.active,false);
});
