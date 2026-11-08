import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

function fixture({autoAck=true}={}){
  const {port1,port2}=new MessageChannel(),errors=[],received=[];
  let observers,control;
  port2.onmessage=({data:message})=>{
    received.push(message);
    if(message.type==='IntentBaseline')control=createNativeRouteControl({
      authorityEpoch:message.authorityEpoch,initialSequence:message.sequence,
      initialTime:message.effectiveTime,routes:message.routes});
    else if(message.type==='IntentControlClosed'){control.dispose();return;}
    else control.accept(message);
    if(autoAck)port2.postMessage({type:'intent-control-applied',session:'session-a',
      authorityEpoch:message.authorityEpoch,sequence:message.sequence,accepted:true});
  };
  let stopped=false;
  const publication=createNativeIntentControlPublication({port:port1,session:'session-a',
    observe:callbacks=>{observers=callbacks;callbacks.onBaseline({type:'IntentBaseline',
      protocolVersion:2,authorityEpoch:'native-owner/1',sequence:9,effectiveTime:10,routes:[]});
      return ()=>{stopped=true;};},onError:error=>errors.push(error)});
  return {publication,port2,errors,received,observers,get control(){return control;},
    get stopped(){return stopped;},dispose(){publication.dispose();port2.close();}};
}

test('direct native publication starts from a high-water baseline, not obsolete event replay',async()=>{
  const f=fixture();
  try{
    assert.deepEqual(await f.publication.ready,{authorityEpoch:'native-owner/1',sequence:9});
    assert.equal(f.received.length,1);
    assert.equal(f.received[0].session,'session-a');
    assert.equal(f.publication.status().appliedSequence,9);
    const handle={authorityEpoch:'native-owner/1',session:1,slot:0,generation:1};
    f.observers.onChanges([{protocolVersion:2,type:'RouteAssigned',authorityEpoch:'native-owner/1',
      sequence:10,effectiveTime:11,actorId:7,routeHandle:handle,revokedRouteHandle:null}]);
    assert.equal(f.publication.status().sentSequence,10);
    const message=await new Promise(resolve=>f.port2.once('message',resolve));
    assert.equal(message.sequence,10);
    assert(f.control.admit({actorId:7,routeHandle:handle,assignmentSequence:10}));
    assert.deepEqual(f.errors,[]);
  }finally{f.dispose();}
});

test('an acknowledgement from another transport session closes the source',async()=>{
  const f=fixture({autoAck:false});
  try{
    const rejected=assert.rejects(f.publication.ready,/acknowledgement/);
    f.port2.postMessage({type:'intent-control-applied',session:'wrong-session',
      authorityEpoch:'native-owner/1',sequence:9,accepted:true});
    await rejected;
    assert.equal(f.publication.status().closed,true);
    assert.equal(f.stopped,true);
    assert.equal(f.errors.length,1);
  }finally{f.dispose();}
});

test('native reset retires a live connection and releases its observer',async()=>{
  const f=fixture();
  try{
    await f.publication.ready;
    const retirement=new Promise(resolve=>f.port2.once('message',resolve));
    f.observers.onClosed('native-reset');
    assert.equal((await retirement).type,'IntentControlClosed');
    assert.equal(f.stopped,true);
    assert.equal(f.publication.status().closed,true);
    assert.deepEqual(f.errors,[]);
  }finally{f.dispose();}
});
