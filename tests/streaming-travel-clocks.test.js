import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const fixture=readFileSync(new URL('./browser/streaming-travel.html',import.meta.url),'utf8');
const start=fixture.indexOf(' const frame=timestamp=>'),end=fixture.indexOf(" output({ready:true",start),callbackSource=fixture.slice(start,end)+'\n globalThis.testFrame=frame;';
function context(duration){
 let clock=1000,exports=0,scheduled=0;const microtasks=[];
 const vector={x:0,z:0,copy(){},toArray:()=>[0,0,0]},world={controls:{target:{...vector}},camera:{position:{...vector}},render(){clock+=10;},chunks:new Map(),chunkStream:{stats:{created:25},queue:[],busy:false,summary:()=>({})},renderer:{info:{memory:{geometries:1,textures:1},programs:[]}},farIsolatedPreparation:true};
 const state={document:{hidden:false},dead:false,running:true,started:900,last:900,previous:0,angle:0,speed:12,duration,world,startEye:vector,startTarget:vector,frames:[],params:{has:key=>key==='trace'},performance:{now:()=>clock},timer:{begin(){clock++;return true;},end(){clock++;},poll(){clock+=2;},report:()=>({}),pending:[]},capturePrograms(){clock++;},resourceStage(){},requestAnimationFrame(){scheduled++;return 1;},queueMicrotask:fn=>microtasks.push(fn),output(report){exports++;assert.ok(report.frames.at(-1).callbackEndMs!==undefined);},summarize:()=>({}),residentPreparation:null,residentTexturePreparation:null,residentShadowPreparation:null,actorReadiness:null,report:null,finishedAt:0,resourceStages:[],farm:{},device:{},initialStream:{},state:{seed:712},biome:'gran-rio',culture:'suajili',quality:'media',serialize:()=>'',snapshot:'',installs:[],longTasks:[],segments:[],programEvents:[],errors:[],resources:null,dispose(){throw Error('Unexpected disposal: '+state.errors.join('; '));}};
 runInNewContext(callbackSource,state);return {state,run:()=>state.testFrame(950),exports:()=>exports,scheduled:()=>scheduled,flush:()=>microtasks.splice(0).forEach(fn=>fn())};
}
test('real fixture callback separates stale RAF clock, world.render span and query bookkeeping',()=>{
 const h=context(100);h.run();const frame=h.state.frames[0];assert.equal(frame.at,50);assert.equal(frame.callbackStartMs,100);assert.equal(frame.worldRenderStartMs,101);assert.equal(frame.worldRenderEndMs,111);assert.equal(frame.cpuMeasuredEndMs,112);assert.equal(frame.cpuMs,11);assert.equal(frame.callbackEndMs,115);assert.equal(h.scheduled(),1);assert.equal(h.exports(),0);
});
test('final fixture export waits for actual callback clock without another render/frame/query',()=>{
 const h=context(.05);h.run();assert.equal(h.exports(),0);assert.equal(h.state.frames.length,1);assert.equal(h.scheduled(),1);assert.equal(h.state.frames[0].callbackEndMs,115);h.flush();assert.equal(h.exports(),1);assert.equal(h.state.frames.length,1);assert.equal(h.scheduled(),1);
});
