import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeChunkStream} from '../src/rendering/chunk-stream.js';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(){
 const loaded=new Map(),prepared=[],generated=[],discarded=[],errors=[];
 const stream=new NativeChunkStream({}, {},{workerFactory:()=>null,loaded:()=>loaded,onData:d=>loaded.set(d.cx+','+d.cz,d),onError:e=>errors.push(e),buildAsync:async r=>{generated.push(r.cx);return {cx:r.cx,cz:r.cz};},prepareAsync:(data,current)=>new Promise(resolve=>prepared.push({data,current,resolve})),discardData:d=>discarded.push(d)});
 const plan=(xs,force=false)=>stream.plan(new Map(xs.map(cx=>[cx+',0',{cx,cz:0,score:cx}])),force);
 return {loaded,prepared,generated,discarded,errors,stream,plan};
}
test('native producer overlaps private preparation, with bounded backpressure and complete publication',async()=>{
 const f=fixture();f.plan([0,1,2]);await flush();assert.deepEqual(f.generated,[0,1]);assert.equal(f.loaded.size,0);assert.equal(f.stream.summary().preparing,2);
 let idle=false;const done=f.stream.whenIdle().then(()=>idle=true);await flush();assert.equal(idle,false);
 f.prepared[0].resolve(f.prepared[0].data);await flush();assert.deepEqual(f.generated,[0,1,2]);assert.equal(f.loaded.size,1);
 f.prepared[1].resolve(f.prepared[1].data);f.prepared[2].resolve(f.prepared[2].data);await done;assert.equal(f.loaded.size,3);assert.equal(f.stream.summary().busy,false);
});
test('camera cancellation discards pending graphics and prevents late publication',async()=>{
 const f=fixture();f.plan([0]);await flush();const old=f.prepared[0];f.plan([1]);assert.equal(old.current(),false);old.resolve(old.data);await flush();assert.equal(f.loaded.size,0);assert.equal(f.discarded.length,1);f.prepared[1].resolve(f.prepared[1].data);await f.stream.whenIdle();assert.equal(f.loaded.size,1);
});
test('forced revision and disposal reject obsolete completed groups',async()=>{
 const f=fixture();f.plan([0]);await flush();const old=f.prepared[0];f.plan([0],true);await flush();assert.equal(old.current(),false);old.resolve(old.data);await flush();assert.equal(f.loaded.size,0);
 f.stream.dispose();f.prepared[1].resolve(f.prepared[1].data);await flush();assert.equal(f.loaded.size,0);assert.equal(f.discarded.length,2);assert.deepEqual(await f.stream.whenIdle(),{cancelled:true});
});

test('spatial pipeline rereads edits without repeating native generation',async()=>{
 const {createSpatialChunkStream}=await import('../src/world/wild-engine/spatial-chunk-stream.js');
 let selected=0,revision=0,starts=0;const resident=new Set([0]),loaded=new Map(),pending=[];
 const core={currentChunk:()=>({cx:0,cz:0}),selectChunk(cx){if(!resident.has(cx))return -1;selected=cx;return 0;},chunkPayload:()=>({cx:selected,cz:0,revision}),removeChunk:cx=>resident.delete(cx),preparation:{start(){starts++;return starts;},status:()=>3,publish(id,cx){resident.add(cx);selected=cx;return 1;},release(){}}};
 const stream=createSpatialChunkStream(core,{loaded:()=>loaded,onData:d=>loaded.set(d.cx+','+d.cz,d),pipeline:true,preparationRevision:()=>revision,prepareData:(data,current)=>new Promise(resolve=>pending.push({data,current,resolve}))});
 stream.plan(new Map([['1,0',{cx:1,cz:0,score:0}],['2,0',{cx:2,cz:0,score:1}]]));
 await flush();await flush();assert.equal(starts,2);assert.equal(pending.length,2);
 revision++;assert.equal(pending[0].current(),false);pending[0].resolve(null);pending[1].resolve(null);await flush();assert.equal(starts,2);assert.equal(pending.length,4);
 for(const entry of pending.slice(2)){assert.equal(entry.data.revision,1);entry.resolve(entry.data);}
 await stream.whenIdle();assert.equal(loaded.size,2);assert.equal(starts,2);stream.dispose();
});
