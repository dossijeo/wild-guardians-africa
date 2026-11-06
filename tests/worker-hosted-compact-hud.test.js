import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {projectConfirmedHud} from '../src/simulation/confirmed-hud-projection.js';
import {createMainThreadHudDeltaEncoder} from '../src/simulation/main-thread-hud-delta.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

test('hosted compact HUD reaches the consumer in order while legacy state remains authoritative',async()=>{
 const state=newGame({seed:819}),wire=createMainThreadHudDeltaEncoder(),sent=[],seen=[],order=[],worker={postMessage:value=>sent.push(value),terminate(){}},receiver={accept(p){order.push('state-'+p.sequence);this.sequence=p.sequence;return {accepted:true};},acceptUnchanged(p){order.push('state-'+p.sequence);this.sequence=p.sequence;return {accepted:true};},status(){return {sequence:this.sequence??0,lastElapsed:state.elapsed};}};
 const runtime=createWorkerHostedRuntime({confirmedReceiver:receiver,session:'s',clientOptions:{},runtimeOptions:{coalescePublications:true,mainThreadProjection:true,hudEntityDeltas:true},workerFactory:()=>worker,onConfirmedState:(sequence,view)=>{order.push('hud-'+sequence);seen.push(view);}});
 const send=publication=>worker.onmessage({data:wire.encode({kind:'publication',session:'s',publication})});
 const ready=runtime.start();send({sequence:1,elapsed:state.elapsed,events:[],snapshot:'{}',hudProjection:projectConfirmedHud(state,1)});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await ready;
 send({sequence:2,unchanged:true,slotId:state.slotId,elapsed:state.elapsed,pauses:[...state.pauses],events:[]});state.time=2;send({sequence:3,elapsed:state.elapsed,events:[],snapshot:'{}',hudProjection:projectConfirmedHud(state,3)});
 assert.deepEqual(order,['state-1','hud-1','state-2','hud-2','state-3','hud-3']);assert.deepEqual(seen.map(view=>view.sequence),[1,1,3]);assert.equal(seen[2].time,2);assert.deepEqual(sent.filter(item=>item.kind==='publicationAck').map(item=>item.sequence),[1,2,3]);assert.equal(runtime.status().fault,null);runtime.dispose();
});

test('a rejected legacy publication closes the compact HUD path without delivering or acknowledging it',async()=>{
 const state=newGame({seed:820}),wire=createMainThreadHudDeltaEncoder(),sent=[],seen=[],errors=[],worker={postMessage:value=>sent.push(value),terminate(){this.terminated=true;}},receiver={accept(){return {accepted:false,reason:'gap'};},acceptUnchanged(){throw Error('unexpected');},status(){return {sequence:0,lastElapsed:state.elapsed};}},runtime=createWorkerHostedRuntime({confirmedReceiver:receiver,session:'s',clientOptions:{},runtimeOptions:{coalescePublications:true,mainThreadProjection:true,hudEntityDeltas:true},workerFactory:()=>worker,onConfirmedState:(...args)=>seen.push(args),onError:error=>errors.push(error.message)});
 const ready=runtime.start(),rejected=assert.rejects(ready,/Hosted publication rejected/);worker.onmessage({data:wire.encode({kind:'publication',session:'s',publication:{sequence:1,elapsed:state.elapsed,events:[],snapshot:'{}',hudProjection:projectConfirmedHud(state,1)}})});await rejected;assert.equal(seen.length,0);assert.equal(sent.some(item=>item.kind==='publicationAck'),false);assert.equal(worker.terminated,true);assert.match(errors[0],/gap/);runtime.dispose();
});
