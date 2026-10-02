import test from 'node:test';
import assert from 'node:assert/strict';
import {WallDrawing} from '../src/rendering/wall-drawing.js';
function fixture(){
  const listeners=new Map(),captured=new Set(),canvas={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name),setPointerCapture:id=>captured.add(id),releasePointerCapture:id=>captured.delete(id)},strokes=[],taps=[],previews=[],gestures=[];
  const drawing=new WallDrawing(canvas,{point:e=>({x:e.clientX/10,z:e.clientY/10}),stroke:p=>strokes.push(p),tap:e=>taps.push(e),preview:p=>previews.push(p.map(q=>q.slice())),gesture:(a,b)=>gestures.push([a,b])});drawing.setEnabled(true);
  const event=(type,x,y,id=1,extra={})=>{const e={pointerId:id,button:0,clientX:x,clientY:y,shiftKey:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};listeners.get(type)(e);return e;};
  return {drawing,strokes,taps,previews,gestures,listeners,captured,event};
}
test('Dragging submits only the completed world-space stroke and preserves curved samples',()=>{
  const f=fixture();f.event('pointerdown',10,10);f.event('pointermove',40,50);f.event('pointermove',70,20);
  assert.equal(f.strokes.length,0);f.event('pointerup',70,20);assert.deepEqual(f.strokes,[[[1,1],[4,5],[7,2]]]);assert.equal(f.taps.length,0);assert.equal(f.captured.size,0);
});
test('Pointer cancellation and disabling cannot submit a partial chain',()=>{
  for(const action of ['cancel','disable']){const f=fixture();f.event('pointerdown',0,0);f.event('pointermove',100,0);if(action==='cancel')f.event('pointercancel',100,0);else f.drawing.setEnabled(false);f.event('pointerup',100,0);assert.equal(f.strokes.length,0);assert.equal(f.taps.length,0);assert.equal(f.captured.size,0);assert.deepEqual(f.previews.at(-1),[]);}
});
test('Two-finger pan and zoom cancel drawing and never build on finger release',()=>{
  const f=fixture();f.event('pointerdown',0,0);f.event('pointermove',40,0);f.event('pointerdown',100,0,2);f.event('pointermove',140,0,2);assert.equal(f.gestures.length,1);
  f.event('pointerup',140,0,2);f.event('pointermove',100,0);f.event('pointerup',100,0);assert.equal(f.strokes.length,0);assert.equal(f.taps.length,0);assert.equal(f.captured.size,0);
  f.event('pointerdown',0,0);f.event('pointermove',40,0);f.event('pointerup',40,0);assert.equal(f.strokes.length,1);
});
test('Short tap stays a tap while alternate camera buttons and Shift pass through',()=>{
  const f=fixture();f.event('pointerdown',10,10);f.event('pointermove',13,12);f.event('pointerup',13,12);assert.equal(f.taps.length,1);assert.equal(f.strokes.length,0);
  assert.equal(f.event('pointerdown',0,0,2,{button:2}).stopped,undefined);assert.equal(f.event('pointerdown',0,0,3,{shiftKey:true}).stopped,undefined);
});
test('Coalesced input keeps the native minimum spacing and disposal removes all handlers',()=>{
  const f=fixture();f.event('pointerdown',0,0);f.event('pointermove',100,0,1,{getCoalescedEvents:()=>[{clientX:.2,clientY:0},{clientX:30,clientY:30},{clientX:100,clientY:0}]});f.event('pointerup',100,0);assert.deepEqual(f.strokes[0],[[0,0],[3,3],[10,0]]);
  f.drawing.dispose();assert.equal(f.listeners.size,0);assert.equal(f.captured.size,0);
});
