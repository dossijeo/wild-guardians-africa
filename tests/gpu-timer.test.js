import test from 'node:test';
import assert from 'node:assert/strict';
import {GpuTimer} from './browser/gpu-timer.js';

function context({extension=true,bits=64}={}){
 const ext={TIME_ELAPSED_EXT:1,QUERY_COUNTER_BITS_EXT:2,GPU_DISJOINT_EXT:3};
 const gl={CURRENT_QUERY:4,QUERY_RESULT_AVAILABLE:5,QUERY_RESULT:6,current:null,lost:false,disjoint:false,queries:[],deleted:[],reads:0,ends:0,
 getExtension(){return extension?ext:null;},getQuery(target,name){return name===2?bits:this.current;},isContextLost(){return this.lost;},
 getParameter(){const value=this.disjoint;this.disjoint=false;return value;},createQuery(){const q={ready:false,ns:5_000_000};this.queries.push(q);return q;},
 beginQuery(target,query){assert.equal(this.current,null);this.current=query;},endQuery(){this.current=null;this.ends++;},
 getQueryParameter(q,name){if(name===5)return q.ready;assert.ok(q.ready,'unavailable results must not be read');this.reads++;return q.ns;},deleteQuery(q){assert.ok(!this.deleted.includes(q),'query deleted twice');this.deleted.push(q);}};
 return gl;
}
test('unsupported extension or counter leaves the renderer untouched',()=>{
 for(const options of [{extension:false},{bits:0}]){const gl=context(options),timer=new GpuTimer(gl);assert.equal(timer.begin(0),false);assert.equal(timer.report().supported,false);assert.equal(gl.queries.length,0);timer.dispose();}
});
test('pending queries never read a result early and retain full numeric precision',()=>{
 const gl=context(),timer=new GpuTimer(gl);assert.ok(timer.begin(7));timer.end();assert.ok(timer.poll());assert.equal(gl.reads,0);assert.equal(timer.report().pending,1);
 gl.queries[0].ready=true;gl.queries[0].ns=4_294_967_296;timer.poll();assert.deepEqual(timer.report().samples,[{frame:7,ms:4294.967296}]);assert.equal(gl.deleted.length,1);timer.dispose();
});
test('disjoint clears previously collected samples and outstanding queries',()=>{
 const gl=context(),timer=new GpuTimer(gl);timer.begin(0);timer.end();gl.queries[0].ready=true;timer.poll();timer.begin(1);timer.end();gl.disjoint=true;
 assert.equal(timer.poll(),false);assert.equal(timer.report().samples.length,0);assert.equal(timer.report().pending,0);assert.equal(timer.report().disjointEvents,1);assert.equal(timer.report().discarded,2);assert.equal(gl.deleted.length,2);timer.dispose();
});
test('backpressure bounds resources without blocking and does not steal another timer',()=>{
 const gl=context(),timer=new GpuTimer(gl,1);timer.begin(0);timer.end();assert.equal(timer.begin(1),false);assert.equal(timer.report().overflowSkipped,1);
 gl.queries[0].ready=true;gl.current={foreign:true};assert.equal(timer.begin(2),false);assert.equal(timer.report().foreignQuerySkipped,1);assert.deepEqual(gl.current,{foreign:true});timer.dispose();assert.deepEqual(gl.current,{foreign:true});
});
test('allocation failures skip timing without creating a pending measurement',()=>{
 const gl=context(),timer=new GpuTimer(gl);gl.createQuery=()=>null;assert.equal(timer.begin(0),false);assert.equal(timer.report().allocationFailures,1);assert.equal(timer.report().pending,0);timer.dispose();
});
test('context loss invalidates samples and does not end a lost-context query',()=>{
 const gl=context(),timer=new GpuTimer(gl);timer.begin(0);gl.lost=true;timer.end();assert.equal(gl.ends,0);assert.equal(timer.report().reason,'context-lost');assert.equal(timer.report().contextLost,true);assert.equal(timer.report().samples.length,0);assert.equal(gl.deleted.length,1);timer.dispose();
});
test('dispose closes active queries, releases pending resources exactly once, and blocks later polling',()=>{
 const gl=context(),timer=new GpuTimer(gl);timer.begin(0);timer.end();timer.begin(1);timer.dispose();timer.dispose();assert.equal(gl.ends,2);assert.equal(gl.deleted.length,2);assert.equal(timer.report().unresolvedAtDispose,2);assert.equal(timer.poll(),false);assert.equal(timer.begin(2),false);
});
test('invalid numeric results are discarded rather than shown as zero',()=>{
 const gl=context(),timer=new GpuTimer(gl);timer.begin(0);timer.end();gl.queries[0].ready=true;gl.queries[0].ns=NaN;timer.poll();assert.equal(timer.report().samples.length,0);assert.equal(timer.report().discarded,1);timer.dispose();
});

test('explicitly disabled profiling performs no extension or query calls',()=>{
 const gl=context();gl.getExtension=()=>{throw new Error('disabled profiler touched GL');};const timer=new GpuTimer(gl,16,false);assert.equal(timer.begin(0),false);assert.equal(timer.report().reason,'disabled');assert.equal(timer.report().supported,null);timer.dispose();assert.equal(gl.queries.length,0);
});
