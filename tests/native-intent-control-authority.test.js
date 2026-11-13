import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {MessageChannel} from 'node:worker_threads';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const snapshot=gunzipSync(readFileSync(new URL(
  './fixtures/sabana712-d1-native-active-raid.json.gz',import.meta.url))).toString();
const chunks=Array.from({length:9},(_,i)=>`${i%3+1},${Math.floor(i/3)-1}`);

function receiver(session='control-session',{autoDrain=true}={}){
  const {port1,port2}=new MessageChannel(),messages=[],errors=[];
  let control,resolveClosed;
  const closed=new Promise(resolve=>{resolveClosed=resolve;});
  port2.onmessage=({data})=>{
    messages.push(data);
    try{
      assert.equal(data.session,session);
      if(data.type==='IntentControlRetire'){
        control.dispose();if(autoDrain)port2.postMessage({...data,type:'intent-control-drained',accepted:true});return;
      }
      if(data.type==='IntentBaseline')control=createNativeRouteControl({
        authorityEpoch:data.authorityEpoch,initialSequence:data.sequence,
        initialTime:data.effectiveTime,routes:data.routes});
      else if(data.type==='IntentControlClosed'){
        control.dispose();resolveClosed(data);return;
      }else control.accept(data);
      port2.postMessage({type:'intent-control-applied',session,authorityEpoch:data.authorityEpoch,
        sequence:data.sequence,accepted:true});
    }catch(error){
      errors.push(error);port2.postMessage({type:'intent-control-applied',session,
        authorityEpoch:data.authorityEpoch,sequence:data.sequence,accepted:false});
    }
  };
  return {port:port1,messages,errors,closed,drain:request=>port2.postMessage({...request,type:'intent-control-drained',accepted:true}),get control(){return control;},
    dispose(){port1.close();port2.close();}};
}

test('real simulation authority bootstraps native permissions without changing commands, saves or events',async()=>{
  const authority=createSimulationAuthority(module,snapshot,chunks),
    reference=createSimulationAuthority(module,snapshot,chunks),draw=receiver();
  try{
    const ready=await authority.attachNativeIntentControl(draw.port,'control-session');
    const baseline=draw.messages[0];
    assert(baseline.routes.length>0,'the real saved raid must contain a native active route');
    assert.equal(ready.authorityEpoch,baseline.authorityEpoch);
    assert.equal(ready.sequence,baseline.sequence);
    for(const route of baseline.routes)assert(draw.control.admit(route));
    for(let sequence=1;sequence<=5;sequence++){
      const command=sequence===1?{kind:'snapshot',sequence}:
        {kind:'advance',sequence,seconds:.05,nightFastForward:false,steps:2};
      const actual=authority.execute(command),expected=reference.execute(command);
      assert.equal(actual.snapshot,expected.snapshot);
      assert.deepEqual(actual.events,expected.events);
    }
    assert.deepEqual(draw.errors,[]);
    assert.equal(authority.nativeIntentControlStatus().current.closed,false);
  }finally{authority.dispose();reference.dispose();draw.dispose();}
});

test('the real authority keeps both graphics owners registered until the predecessor GPU is drained',async()=>{
 const authority=createSimulationAuthority(module,snapshot,chunks),first=receiver('control-session',{autoDrain:false}),second=receiver(),third=receiver();
 try{
  await authority.attachNativeIntentControl(first.port,'control-session');
  let ready=false;const replacing=authority.attachNativeIntentControl(second.port,'control-session').then(r=>{ready=true;return r;});
  for(let i=0;i<100&&!first.messages.some(m=>m.type==='IntentControlRetire');i++)await new Promise(resolve=>setImmediate(resolve));
  const request=first.messages.find(m=>m.type==='IntentControlRetire');assert(request);
  assert.equal(ready,false);assert.equal(authority.nativeIntentControlStatus().cohort.consumers,2);
  assert(authority.nativeIntentControlStatus().pending);assert.equal(authority.nativeIntentControlStatus().cohort.coherent,false);
  await assert.rejects(authority.attachNativeIntentControl(third.port,'control-session'),/unavailable/);
  first.drain(request);await replacing;await first.closed;
  assert.equal(authority.nativeIntentControlStatus().cohort.consumers,1);assert.equal(authority.nativeIntentControlStatus().cohort.coherent,true);
  assert.equal(authority.nativeIntentControlStatus().pending,null);assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);
 }finally{authority.dispose();first.dispose();second.dispose();third.dispose();}
});

test('a replacement draw connection receives a fresh native baseline and retires its predecessor',async()=>{
  const authority=createSimulationAuthority(module,snapshot,chunks),first=receiver(),second=receiver();
  try{
    await authority.attachNativeIntentControl(first.port,'control-session');
    authority.execute({kind:'snapshot',sequence:1});
    const original=first.messages[0],ready=await authority.attachNativeIntentControl(second.port,'control-session');
    const retired=await first.closed;
    assert.equal(retired.reason,'replaced');
    assert.equal(first.control.status().closed,true);
    assert.equal(second.messages[0].type,'IntentBaseline');
    assert.equal(ready.authorityEpoch,original.authorityEpoch,
      'graphics replacement does not replace the live native authority');
    assert.equal(second.messages.length,1,'bootstrap does not replay retired historical assignments');
    assert.deepEqual(first.errors,[]);assert.deepEqual(second.errors,[]);
    assert.equal(authority.nativeIntentControlStatus().pending,null);
  }finally{authority.dispose();first.dispose();second.dispose();}
});
