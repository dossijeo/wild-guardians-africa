import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {WallDrawing} from '../src/rendering/wall-drawing.js';
const source=readFileSync('src/app/main.js','utf8');
const start=source.indexOf('strokeOwner.wallDrawing.resolveStroke='),end=source.indexOf(';strokeOwner.wallDrawing.onResolveError=',start),adapter=source.slice(start,end),turn=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const listeners={},tasks=[],strokes=[],feedback=[],errors=[],canvas={getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){},setPointerCapture(){},releasePointerCapture(){}};
 const drawing=new WallDrawing(canvas,{screenSpace:true,stroke:p=>strokes.push(p),tap(){},strokeContext:()=> 'same-camera-and-viewport',onResolveError:e=>errors.push(e.message)});drawing.setEnabled(true);
 const owner={canvas,wallDrawing:drawing,workerRuntime:{status:()=>({confirmedSequence:128})},webGpuWorld:{client:{},sync(){}},structureInputFeedback:{start(){const f={cancelled:false,cancel(){this.cancelled=true;}};feedback.push(f);return f;}}};
 const context=vm.createContext({strokeOwner:owner,world:owner,state:{},tool:{kind:'wall',material:'bramble'},pickReadyTerrainStroke:opts=>new Promise((resolve,reject)=>tasks.push({opts,resolve,reject}))});vm.runInContext(adapter,context);
 function release(y){const event=x=>({pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});listeners.pointerdown(event(0));listeners.pointerup(event(40));}
 return {owner,drawing,context,tasks,strokes,feedback,errors,release};
}
for(const changed of ['wall-material','binding'])test('ready second stroke rechecks '+changed+' at ordered delivery',async()=>{
 const f=fixture();try{f.release(0);f.release(10);assert.equal(f.tasks.length,2);f.tasks[1].resolve({points:[[0,1],[4,1]]});await turn();assert.equal(f.strokes.length,0);
  if(changed==='wall-material')f.context.tool={kind:'wall',material:'stone'};else f.owner.webGpuWorld={client:{},sync(){}};
  assert.equal(f.drawing.enabled,true);assert.equal(f.drawing.resolveGeneration,0);assert.equal(f.drawing.strokeContext(),'same-camera-and-viewport');
  f.tasks[0].reject(Error('Stale WebGPU pick'));await f.drawing.resolveTail;assert.equal(f.strokes.length,0);assert(f.feedback.every(f=>f.cancelled));assert.deepEqual(f.errors,['Stale WebGPU pick']);
 }finally{f.drawing.dispose();}
});
test('two valid strokes still deliver exactly once in release order',async()=>{
 const f=fixture();try{f.release(0);f.release(10);f.tasks[1].resolve({points:[[0,1],[4,1]]});await turn();assert.equal(f.strokes.length,0);f.tasks[0].resolve({points:[[0,0],[4,0]]});await f.drawing.resolveTail;assert.deepEqual(f.strokes.map(p=>p.map(q=>[...q])),[[[0,0],[4,0]],[[0,1],[4,1]]]);assert.equal(f.feedback.some(f=>f.cancelled),false);assert.deepEqual(f.errors,[]);}finally{f.drawing.dispose();}
});
