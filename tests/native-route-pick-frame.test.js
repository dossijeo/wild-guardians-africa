import test from 'node:test';
import assert from 'node:assert/strict';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';

const route=()=>({actorId:7,assignmentSequence:3,routeHandle:{authorityEpoch:'owner',session:1,slot:0,generation:2}});
const binding=()=>({nativeRoute:route(),semantic:'relative',epoch:10,elapsed:10.25});
const consumer=(bindings=[binding()])=>({failed:false,nativeRouteFrame:{sequence:1,clockElapsed:11,bindings}});

test('native pick frames copy times and require the exact submitted reference and clock origin',()=>{
 const value=consumer(),pick=captureNativeRoutePickFrame(value);
 value.nativeRouteFrame.bindings[0].elapsed=12;value.nativeRouteFrame.bindings[0].nativeRoute.routeHandle.generation++;
 assert.equal(pick.getTime(route(),10),10.25);
 assert.throws(()=>pick.getTime(route(),9),/no submitted/);
 assert.throws(()=>pick.getTime(route(),10,'absolute'),/no submitted/);
 for(const key of ['actorId','assignmentSequence'])assert.throws(()=>pick.getTime({...route(),[key]:99},10),/no submitted/);
 for(const key of ['authorityEpoch','session','slot','generation']){
  const ref=route();ref.routeHandle[key]=key==='authorityEpoch'?'other':99;
  assert.throws(()=>pick.getTime(ref,10),/no submitted/);
 }
});

test('a newly prepared assignment cannot borrow a time from an older submitted frame',()=>{
 const pick=captureNativeRoutePickFrame(consumer([]));assert.equal(pick.sequence,1);
 assert.throws(()=>pick.getTime(route(),10),/no submitted/);
 for(const value of [null,{},consumer(),{...consumer(),failed:true}]){
  if(value?.nativeRouteFrame&&!value.failed)value.nativeRouteFrame=null;
  assert.throws(()=>captureNativeRoutePickFrame(value),/unavailable/);
 }
});

test('malformed and conflicting consumer clock data cannot become a pick frame',()=>{
 for(const patch of [{elapsed:NaN},{elapsed:9},{epoch:-1},{semantic:'producer'},{nativeRoute:{}}])assert.throws(()=>captureNativeRoutePickFrame(consumer([{...binding(),...patch}])));
 assert.throws(()=>captureNativeRoutePickFrame(consumer([binding(),{...binding(),elapsed:10.5}])) ,/Conflicting/);
 assert.equal(captureNativeRoutePickFrame(consumer([binding(),binding()])).getTime(route(),10),10.25);
});
