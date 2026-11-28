import test from 'node:test';import assert from 'node:assert/strict';
import {pickReadyTerrainStroke} from '../src/app/webgpu-wall-stroke-ready.js';
import {createWebGpuWorldClient} from '../src/rendering/webgpu-world-client.js';
import {WallDrawing} from '../src/rendering/wall-drawing.js';
import vm from 'node:vm';import {readFileSync} from 'node:fs';
const turn=()=>new Promise(r=>setImmediate(r));
async function fixture(){
 const worker={messages:[],postMessage(m){this.messages.push(m);},terminate(){}},client=createWebGpuWorldClient({canvas:{transferControlToOffscreen:()=>({})},session:'s',snapshot:'{}',presentationInputs:true,workerFactory:()=>worker,channelFactory:()=>({port1:{close(){}},port2:{close(){}}})});
 worker.onmessage({data:{kind:'ready',backend:'WebGPU'}});await client.ready;
 const frames=new Map();let id=0,current=true;
 const opts={client,samples:[[0,0],[.2,.3]],minSequence:128,isCurrent:()=>current,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id)};
 return {client,worker,frames,opts,invalidate(){current=false;for(const [id,fn]of frames){frames.delete(id);fn();}},frame(sequence){worker.onmessage({data:{kind:'rendered-frame',sequence,terrainGeneration:1,selectableGeneration:1,cameraVersion:0,viewportVersion:0}});},picks:()=>worker.messages.filter(m=>m.kind==='pickTerrainStroke'),reply(sequence=128){const m=this.picks().at(-1);worker.onmessage({data:{kind:'pickResult',id:m.id,result:{sequence,points:[[1,2],[3,4]]}}});},close(){client.dispose();}};
}
test('negative control reproduces old sequence rejection; new barrier issues one pick only after captured floor',async()=>{
 const f=await fixture();try{
  const old=f.client.pickTerrainStroke(f.opts.samples,{minSequence:128}),reject=assert.rejects(old,/Stale WebGPU pick/);f.reply(31);await reject;assert.equal(f.picks().length,1);
  const waiting=pickReadyTerrainStroke(f.opts);await turn();f.frame(31);await turn();f.frame(127);await turn();assert.equal(f.picks().length,1);
  f.frame(128);await turn();assert.equal(f.picks().length,2);f.reply();assert.equal((await waiting).sequence,128);assert.equal(f.frames.size,0);
 }finally{f.close();}
});
test('guard cancellation removes wait and never sends a late pick',async()=>{
 const f=await fixture();try{const waiting=pickReadyTerrainStroke(f.opts),reject=assert.rejects(waiting,/Stale/);f.invalidate();await reject;f.frame(128);await turn();assert.equal(f.picks().length,0);assert.equal(f.frames.size,0);}finally{f.close();}
});
test('deadline bounds missing presentation and late frames cannot build',async()=>{
 const f=await fixture();try{await assert.rejects(pickReadyTerrainStroke({...f.opts,timeoutMs:15}),e=>e.name==='TimeoutError');f.frame(128);await turn();assert.equal(f.picks().length,0);assert.equal(f.frames.size,0);}finally{f.close();}
});
test('AbortSignal cancellation and disposal release the original waiter',async()=>{
 for(const action of ['abort','dispose']){const f=await fixture(),abort=new AbortController();try{const p=pickReadyTerrainStroke({...f.opts,signal:abort.signal}),reject=assert.rejects(p);if(action==='abort')abort.abort();else f.client.dispose();await reject;f.frame(128);await turn();assert.equal(f.picks().length,0);assert.equal(f.frames.size,0);}finally{f.close();}}
});
test('context lost while pick is in flight discards result, without retry',async()=>{
 const f=await fixture();try{f.frame(128);const waiting=pickReadyTerrainStroke(f.opts),reject=assert.rejects(waiting,/Stale/);await turn();assert.equal(f.picks().length,1);f.invalidate();f.reply();await reject;assert.equal(f.picks().length,1);}finally{f.close();}
});
test('existing post-pick sequence/camera guards remain strict and no automatic retry occurs',async()=>{
 for(const kind of ['sequence','camera']){const f=await fixture();try{f.frame(128);const p=pickReadyTerrainStroke(f.opts),reject=assert.rejects(p,/Stale/);await turn();if(kind==='camera')f.client.setCamera({x:5});f.reply(kind==='sequence'?127:128);await reject;assert.equal(f.picks().length,1);}finally{f.close();}}
});
test('WallDrawing captures floor synchronously at release, preserves it as authority advances, cancels pending on disable',async()=>{
 const f=await fixture(),handlers={},strokes=[],errors=[];let sequence=128,captured;
 const canvas={addEventListener:(n,fn)=>handlers[n]=fn,removeEventListener(){},setPointerCapture(){},releasePointerCapture(){}};
 const drawing=new WallDrawing(canvas,{screenSpace:true,stroke:p=>strokes.push(p),tap(){},strokeContext:()=> 'same',onResolveError:e=>errors.push(e),resolveStroke:(samples,options)=>{captured=sequence;return pickReadyTerrainStroke({...f.opts,minSequence:sequence,signal:options.signal}).then(r=>r.points);}});drawing.setEnabled(true);
 const event=(n,x)=>handlers[n]({pointerId:1,button:0,clientX:x,clientY:0,preventDefault(){},stopImmediatePropagation(){}});
 try{event('pointerdown',0);event('pointerup',40);assert.equal(captured,128);sequence=258;f.frame(128);await turn();assert.equal(f.picks().length,1);f.reply(128);await drawing.resolveTail;assert.equal(strokes.length,1);
  event('pointerdown',0);event('pointerup',40);assert.equal(captured,258);drawing.setEnabled(false);await drawing.resolveTail;f.frame(300);await turn();assert.equal(f.picks().length,1);assert.equal(strokes.length,1);assert.equal(errors.length,0);
 }finally{drawing.dispose();f.close();}
});
test('actual main adapter starts feedback before waiting and rejects each changed context without issuing a pick',async()=>{
 const source=readFileSync('src/app/main.js','utf8'),a=source.indexOf('strokeOwner.wallDrawing.resolveStroke='),b=source.indexOf(';strokeOwner.wallDrawing.onResolveError=',a),adapter=source.slice(a,b);
 assert(a>0&&b>a);
 for(const change of ['world','state','tool','binding','generation','enabled','pose']){
  const f=await fixture();let started=0,cancelled=0,pose='a';
  const owner={canvas:{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})},wallDrawing:{enabled:true,resolveGeneration:0,strokeContext:()=>pose},workerRuntime:{status:()=>({confirmedSequence:128})},webGpuWorld:{client:f.client,sync(){}},structureInputFeedback:{start(){started++;return {cancel(){cancelled++;}};}}};
  const context=vm.createContext({strokeOwner:owner,world:owner,state:{},tool:{kind:'wall'},pickReadyTerrainStroke:opts=>pickReadyTerrainStroke({...opts,requestFrame:f.opts.requestFrame,cancelFrame:f.opts.cancelFrame})});vm.runInContext(adapter,context);
  try{const pending=owner.wallDrawing.resolveStroke([[10,10],[40,10]],{strokeContext:'a'}),reject=assert.rejects(pending,/Stale/);assert.equal(started,1);assert.equal(f.picks().length,0);
   if(change==='world'||change==='state'||change==='tool')context[change]={};else if(change==='binding')owner.webGpuWorld={};else if(change==='generation')owner.wallDrawing.resolveGeneration++;else if(change==='enabled')owner.wallDrawing.enabled=false;else pose='b';
   for(const [id,fn]of f.frames){f.frames.delete(id);fn();}await reject;assert.equal(cancelled,1);assert.equal(f.picks().length,0);
  }finally{f.close();}
 }
});
