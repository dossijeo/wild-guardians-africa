import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteControl} from '../src/rendering/native-route-control.js';

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
