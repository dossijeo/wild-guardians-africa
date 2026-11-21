import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';
import {evaluateRemoteClock} from '../src/rendering/remote-presentation-clock.js';

const handle=(generation=1,authorityEpoch='authority-a')=>({authorityEpoch,
  session:1,slot:0,generation});
const assigned=(sequence=1,actorId=7,routeHandle=handle())=>({protocolVersion:2,
  authorityEpoch:'authority-a',type:'RouteAssigned',sequence,actorId,
  effectiveTime:10,routeHandle,revokedRouteHandle:null});
const revoked=(sequence=2,actorId=7,routeHandle=handle(),effectiveTime=12)=>({
  ...assigned(sequence,actorId),type:'RouteInvalidated',effectiveTime,
  routeHandle:null,revokedRouteHandle:routeHandle});
const descriptor=(assignmentSequence=1,actorId=7,routeHandle=handle())=>({
  actorId,routeHandle,assignmentSequence});

test('native revocation changes only its admitted version and rejects a late load',()=>{
  const control=createNativeRouteControl({authorityEpoch:'authority-a'});
  control.accept(assigned());
  const first=control.admit(descriptor());
  control.accept(assigned(2,8,{...handle(),slot:1}));
  const other=control.admit(descriptor(2,8,{...handle(),slot:1}));
  control.accept(revoked(3));
  assert.equal(first.safeUntil,12);
  assert.equal(other.safeUntil,Infinity);
  assert.throws(()=>control.admit(descriptor()),/obsolete or unauthorized/);
  control.accept({...assigned(4,7,handle(3)),effectiveTime:12});
  assert.throws(()=>control.admit(descriptor()),/obsolete or unauthorized/);
  assert.equal(control.admit(descriptor(4,7,handle(3))).safeUntil,Infinity);
  assert.equal(first.safeUntil,12,'new resources cannot extend a revoked version');
});

test('an old authority epoch cannot authorize a repeating native tuple',()=>{
  const control=createNativeRouteControl({authorityEpoch:'authority-b'});
  assert.equal(control.accept(assigned()),false);
  assert.equal(control.status().sequence,0);
  assert.throws(()=>control.admit(descriptor()),/unauthorized/);
});

test('order gaps, wrong handles and missing revocations change nothing',()=>{
  const control=createNativeRouteControl({authorityEpoch:'authority-a'});
  control.accept(assigned());
  const before=control.status(),record=control.admit(descriptor());
  assert.throws(()=>control.accept(revoked(3)),/order or time/);
  assert.throws(()=>control.accept(revoked(2,7,handle(99))),/active version/);
  assert.throws(()=>control.accept(assigned(2,7,handle(3))),/previous revocation/);
  assert.throws(()=>control.accept({...revoked(),type:'IntentChanged',
    revokedRouteHandle:null}),/active route revocation/);
  assert.equal(control.status().sequence,before.sequence);
  assert.equal(record.safeUntil,Infinity);
});

test('late critical revocation fails instead of cosmetically rewinding a route',()=>{
  const control=createNativeRouteControl({authorityEpoch:'authority-a'});
  control.accept(assigned());
  const record=control.admit(descriptor());
  record.lastDrawTime=12.5;
  assert.throws(()=>control.accept(revoked()),
    error=>error.code==='native-route-revocation-late');
  control.dispose();
  assert.equal(record.safeUntil,12.5);
  assert.equal(control.status().closed,true);
  assert.throws(()=>control.admit(descriptor()),/closed/);
});

test('a coherent native replacement revokes the old record and admits the new one',()=>{
  const control=createNativeRouteControl({authorityEpoch:'authority-a'});
  control.accept(assigned());
  const record=control.admit(descriptor());
  control.accept({...assigned(2,7,handle(3)),type:'RouteReplaced',
    effectiveTime:12,revokedRouteHandle:handle()});
  assert.equal(record.safeUntil,12);
  assert.equal(control.admit(descriptor(2,7,handle(3))).safeUntil,Infinity);
});

test('bootstrap accepts current native permissions without replaying retired assignments',()=>{
  const route={...descriptor(3),startTime:10};
  const control=createNativeRouteControl({authorityEpoch:'authority-a',
    initialSequence:9,initialTime:12,routes:[route]});
  const record=control.admit(route);
  assert.equal(record.startTime,10);
  assert.equal(control.status().sequence,9);
  control.accept(revoked(10,7,handle(),12));
  assert.equal(record.safeUntil,12);
  assert.throws(()=>control.accept(assigned(1)),/order or time/);
  assert.throws(()=>createNativeRouteControl({authorityEpoch:'authority-a',
    initialSequence:9,initialTime:12,routes:[route,route]}),/baseline/);
  assert.throws(()=>createNativeRouteControl({authorityEpoch:'authority-a',
    initialSequence:2,initialTime:12,routes:[route]}),/baseline/);
});

const clock=(clockSequence=1,committedThrough=10,extra={})=>({protocolVersion:2,clockVersion:1,authorityEpoch:'authority-a',
 nativeSession:1,clockSequence,intentSequence:1,committedThrough,rate:1,paused:false,reanchor:true,anchorLogicalTime:10,anchorAbsoluteMs:1000,...extra});
test('causal control bounds time independently of prepared clocks and accepts pause/rate at non-rewinding native boundaries',()=>{
 const c=createNativeRouteControl({authorityEpoch:'authority-a'});c.accept(assigned());c.acceptClock(clock());
 assert.equal(evaluateRemoteClock(c.clockLease(0),9000),10);
 c.acceptClock(clock(2,11,{reanchor:false}));assert.equal(evaluateRemoteClock(c.clockLease(0),1300),10.3);
 assert.equal(evaluateRemoteClock(c.clockLease(0),9000),11);
 c.acceptClock(clock(3,11,{paused:true,anchorLogicalTime:11,anchorAbsoluteMs:1400}));
 assert.equal(evaluateRemoteClock(c.clockLease(0),9000),11);
 c.acceptClock(clock(4,11,{rate:2,anchorLogicalTime:11,anchorAbsoluteMs:1500}));
 c.acceptClock(clock(5,12,{rate:2,reanchor:false,anchorLogicalTime:11,anchorAbsoluteMs:1500}));
 assert.equal(evaluateRemoteClock(c.clockLease(0),1750),11.5);assert.equal(evaluateRemoteClock(c.clockLease(0),9000),12);
 c.accept(revoked(2,7,handle(),12));assert.equal(c.status().active,0);
});

test('causal clock gaps, old epochs, rewinds and forged reanchors are rejected atomically',()=>{
 for(const extra of [{clockSequence:3},{authorityEpoch:'other'},{nativeSession:2},{intentSequence:2},{committedThrough:9},
  {reanchor:true},{anchorLogicalTime:9},{anchorAbsoluteMs:500},{paused:true,reanchor:false}]){
  const c=createNativeRouteControl({authorityEpoch:'authority-a'});c.accept(assigned());c.acceptClock(clock());const before=c.status();
  assert.throws(()=>c.acceptClock(clock(2,11,{reanchor:false,...extra})),/clock boundary/);assert.deepEqual(c.status(),before);
 }
 const c=createNativeRouteControl({authorityEpoch:'authority-a'});c.accept(assigned());c.admit(descriptor()).lastDrawTime=12;
 assert.throws(()=>c.acceptClock(clock()),/after presented time/);
});
