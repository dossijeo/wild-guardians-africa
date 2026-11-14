import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';

test('only executed native time can become a finite causal watermark, and paused execution cannot advance it',()=>{
 const f=fixture();try{
  const h=f.worker(1,f.point(-6,0),f.point(6,0));
  assert.equal(f.bridge.commitNativeCausalClock().status,'unexecuted-cohort');assert.equal(f.bridge.nativeCausalClock(),null);
  assert.equal(f.bridge.beginNativeRouteExecution().status,'started');const first=f.bridge.commitNativeCausalClock();
  assert.equal(first.status,'committed');assert.equal(first.clock.committedThrough,10);assert.equal(first.clock.reanchor,true);
  assert.equal(f.w.nav_intent_set_time(11),0);assert.equal(f.w.nav_intent_effective_time(),10);
  assert.equal(f.advance(10.5).status,'advanced');assert.equal(f.bridge.nativeCausalClock().committedThrough,10);
  const advance=f.bridge.commitNativeCausalClock();assert.equal(advance.clock.committedThrough,10.5);assert.equal(advance.clock.reanchor,false);
  assert.equal(advance.clock.clockSequence,first.clock.clockSequence+1);
  assert.equal(f.bridge.commitNativeCausalClock().status,'unchanged');
  const paused=f.bridge.commitNativeCausalClock({paused:true,rate:2});assert.equal(paused.clock.paused,true);assert.equal(paused.clock.reanchor,true);
  const body=f.body(1),pose=f.bridge.nativeRouteExecution(h);assert.equal(f.advance(11).status,'paused');
  assert.deepEqual(f.body(1),body);assert.deepEqual(f.bridge.nativeRouteExecution(h),pose);
  assert.equal(f.bridge.nativeCausalClock().committedThrough,10.5);
  assert.equal(f.bridge.commitNativeCausalClock({paused:false,rate:2}).status,'committed');
  assert.equal(f.advance(11).status,'advanced');assert.equal(f.bridge.commitNativeCausalClock({rate:2}).clock.committedThrough,11);
 }finally{f.session.dispose();}
});

test('native observer orders clock watermarks after route transitions without duplicating native history',()=>{
 const f=fixture();let stop;try{
  f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  f.bridge.commitNativeCausalClock();const messages=[];
  stop=f.bridge.observeNativeIntentControl({onBaseline:x=>messages.push(x),onChanges:rows=>messages.push(...rows),onClock:x=>messages.push(x)});
  assert(messages[0].clock);assert.equal(f.advance(11).status,'advanced');
  assert.throws(()=>f.bridge.nativeIntentControlBaseline(),/Commit the native causal clock/);
  f.bridge.commitNativeCausalClock();assert.equal(messages.at(-1).committedThrough,11);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.commitNativeCausalClock({paused:true});
  assert.equal(messages.at(-2).type,'RouteInvalidated');assert.equal(messages.at(-1).intentSequence,messages.at(-2).sequence);
  const count=messages.length;for(let i=0;i<100;i++){f.bridge.flushNativeIntentControl();f.bridge.nativeCausalClock();}
  assert.equal(messages.length,count);
 }finally{stop?.();f.session.dispose();}
});

test('causal clock reset retires its epoch and cannot preserve a previous presentation watermark',()=>{
 const f=fixture();try{
  f.worker(1,f.point(-6,0),f.point(6,0));f.bridge.beginNativeRouteExecution();const old=f.bridge.commitNativeCausalClock().clock;
  f.bridge.resetFromState(f.state);assert.equal(f.bridge.nativeCausalClock(),null);
  const fresh=f.bridge.commitNativeCausalClock({paused:true}).clock;assert.notEqual(fresh.authorityEpoch,old.authorityEpoch);
  assert.equal(fresh.clockSequence,1);assert.notEqual(fresh.nativeSession,old.nativeSession);
 }finally{f.session.dispose();}
});

test('a clock policy boundary invalidates an older staged gate proposal even at the same logical time and intent sequence',()=>{
 const f=nativeGateCrossingFixture();try{
  const result=f.admit(f.route());assert.equal(result.status,'admitted');f.bridge.beginNativeRouteExecution();f.bridge.commitNativeCausalClock();
  const before=f.service.read(f.gates[0].id);assert.equal(f.w.nav_gate_motion_stage_objects(1),1);assert.equal(f.w.nav_gate_motion_ticket(),1);
  const ticket=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_gate_motion_ticket_ptr(),5));
  f.bridge.commitNativeCausalClock({paused:true});assert.equal(f.w.nav_gate_motion_commit(ticket[0],ticket[1],ticket[2],ticket[3]),-2);
  assert.deepEqual(f.service.read(f.gates[0].id),before);
 }finally{f.session.dispose();}
});
