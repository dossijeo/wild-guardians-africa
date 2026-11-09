import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';

const square=(p,r=.2)=>[
 {x:p.x-r,z:p.z-r},{x:p.x+r,z:p.z-r},{x:p.x+r,z:p.z+r},{x:p.x-r,z:p.z+r},
];
const start=f=>assert.equal(f.bridge.beginNativeRouteExecution().status,'started');

test('remote barrier/polygon additions and removals preserve the executing generation without route checks',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const plan=f.bridge.nativeRouteTiming(a),candidates=f.w.nav_intent_static_mutation_candidates(),
   segments=f.w.nav_intent_static_mutation_segments(),checks=f.w.spatial_execution_clearance_checks(),
   validations=f.w.nav_intent_route_validation_count();
  const p=f.point(40,40),wall=f.session.core.addWall(p.x,p.z,.2,.2),poly=f.session.core.addPolygon(square(f.point(42,40)));
  assert(wall>0&&poly>0);assert.equal(f.advance(12).status,'advanced');
  assert.equal(f.session.core.removeWall(wall),1);assert.equal(f.session.core.removePolygon(poly),1);
  assert.equal(f.advance(13).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(a),plan);
  assert.equal(f.w.nav_intent_static_mutation_candidates(),candidates);
  assert.equal(f.w.nav_intent_static_mutation_segments(),segments);
  assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.equal(f.w.nav_intent_route_validation_count(),validations);
  assert.equal(f.w.nav_intent_static_mutation_commits(),4);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('the inverse index uses the actual bounds of a long thin wall, not a broad enclosing square',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const p=f.point(0,40),plan=f.bridge.nativeRouteTiming(a);
  assert(f.session.core.addWall(p.x,p.z,50,.1)>0);
  assert.equal(f.w.nav_intent_static_mutation_candidates(),0);
  assert.equal(f.w.nav_intent_static_mutation_segments(),0);
  assert.deepEqual(f.bridge.nativeRouteTiming(a),plan);assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('a prospective oriented barrier revokes only intersecting future routes, before the next logical advance',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0)),d=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const body=f.body(1),other=f.bridge.nativeRouteTiming(d),p=f.point(2,0);
  const wall=f.session.core.addOrientedBarrier(p.x,p.z,.1,.6,Math.PI/6,0);assert(wall>0);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,a);assert.equal(event.effectiveTime,11);
  assert.equal(f.bridge.nativeRouteExecution(a),null);assert.equal(f.w.nav_intent_static_mutation_revocations(),1);
  assert.deepEqual(f.bridge.nativeRouteTiming(d),other);assert.equal(f.advance(12).status,'advanced');
  assert.deepEqual(f.body(1),body);assert(f.bridge.nativeRouteExecution(d));
 }finally{f.session.dispose();}
});

test('a barrier under a current body is rejected without changing IDs, geometry, routes or time',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const body=f.body(1),before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.session.core.addWall(body.x,body.z,.2,.2),0);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.w.nav_intent_effective_time(),11);assert.equal(f.w.nav_intent_static_mutation_rejected(),1);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('a polygon under a current body is rejected atomically with the same physical authority',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
  assert.throws(()=>f.session.core.addPolygon(square(f.body(1))),/Invalid spatial polygon/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('continuous prospective polygon clearance catches a sub-millimetre future intrusion',()=>{
 const f=fixture();
 try{
  const a=f.animal(f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const body=f.body(10),p=f.point(0,0),poly=f.session.core.addPolygon([
   {x:p.x-.0001,z:p.z+1.1-.0001},{x:p.x+.0001,z:p.z+1.1-.0001},
   {x:p.x+.0001,z:p.z+1.1+.5},{x:p.x-.0001,z:p.z+1.1+.5},
  ]);
  assert(poly>0);assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,a);
  assert.equal(f.bridge.nativeRouteExecution(a),null);assert.deepEqual(f.body(10),body);
  assert.equal(f.advance(12).status,'inactive');
 }finally{f.session.dispose();}
});

test('worker-passable barriers still invalidate a future passage until gate leaves and timing are native',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0)),d=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const p=f.point(2,0);
  assert(f.session.core.addBarrier(p.x,p.z,.15,.6,1)>0);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);
  assert.equal(f.bridge.nativeRouteExecution(a),null);assert.equal(f.advance(12).status,'advanced');
  assert(f.bridge.nativeRouteExecution(d));
 }finally{f.session.dispose();}
});

test('declared worker passability does not forbid a legal mutation under a worker; unsupported autonomy is retired instead',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0)),d=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const body=f.body(1),wall=f.session.core.addBarrier(body.x,body.z,.2,.2,1);
  assert(wall>0,'static worker passability remains a gameplay permission, not an invented collision rule');
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);
  assert.equal(f.w.nav_intent_static_mutation_rejected(),0);assert.deepEqual(f.body(1),body);
  assert.equal(f.advance(12).status,'advanced');assert(f.bridge.nativeRouteExecution(d));
 }finally{f.session.dispose();}
});

test('all proposed rigid pieces are checked before any batch removal, ID allocation or route retirement',()=>{
 const f=fixture();
 try{
  const p=f.point(40,40),old=f.session.core.addWall(p.x,p.z,.2,.2);assert(old>0);
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const current=f.body(1),future=f.point(2,0),before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),
   additions=[{...future,halfX:.15,halfZ:.6},{...current,halfX:.2,halfZ:.2}];
  assert.throws(()=>f.session.core.applyBarrierChanges([old],additions),/no barrier was changed/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.throws(()=>f.session.core.addBarriersBatch(additions),/no barrier was changed/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('a successful remove/add transaction keeps unrelated execution running after its final sector refresh',()=>{
 const f=fixture();
 try{
  const p=f.point(40,40),old=f.session.core.addWall(p.x,p.z,.2,.2);assert(old>0);
  const a=f.worker(1,f.point(-6,0),f.point(6,0)),d=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const other=f.bridge.nativeRouteTiming(d),count=f.w.spatial_barrier_state_count();
  const ids=f.session.core.applyBarrierChanges([old],[
   {...f.point(2,0),halfX:.15,halfZ:.6},{...f.point(42,40),halfX:.2,halfZ:.2},
  ]);
  assert.equal(ids.length,2);assert.equal(f.w.spatial_barrier_state_count(),count+1);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(d),other);
 }finally{f.session.dispose();}
});

test('tightening an animal permission retires its future route; relaxing it cannot resurrect that generation',()=>{
 const f=fixture();
 try{
  const p=f.point(2,0),wall=f.session.core.addBarrier(p.x,p.z,.15,.6,2);assert(wall>0);
  const a=f.animal(f.point(-6,0),f.point(6,0)),d=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);
  assert.equal(f.w.spatial_set_barrier_passability(wall,0),1);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a]);
  assert.equal(f.advance(12).status,'advanced');assert(f.bridge.nativeRouteExecution(d));
  assert.equal(f.w.spatial_set_barrier_passability(wall,2),1);
  assert.equal(f.advance(13).status,'advanced');assert.equal(f.bridge.nativeRouteExecution(a),null);
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('permission tightening cannot make a current body overlap an obstacle',()=>{
 const f=fixture();
 try{
  const p=f.point(0,0),wall=f.session.core.addBarrier(p.x,p.z,.15,.6,2);assert(wall>0);
  const a=f.animal(f.point(-6,0),f.point(6,0));start(f);f.advance(14);
  const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence();
  assert.equal(f.w.spatial_set_barrier_passability(wall,0),0);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert(f.bridge.nativeRouteExecution(a));assert.equal(f.advance(15).status,'advanced');
 }finally{f.session.dispose();}
});

test('an obstacle behind the native cursor does not discard an unchanged future route',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0),{flight:true});start(f);f.advance(13);
  const plan=f.bridge.nativeRouteTiming(a),p=f.point(-3,0);
  assert(f.session.core.addWall(p.x,p.z,.15,.6)>0);
  assert.equal(f.w.nav_intent_static_mutation_candidates(),1);
  assert.equal(f.w.nav_intent_static_mutation_segments(),1);
  assert.equal(f.w.nav_intent_static_mutation_revocations(),0);
  assert.deepEqual(f.bridge.nativeRouteTiming(a),plan);assert.deepEqual(f.bridge.intentChanges(),[]);
  assert.equal(f.advance(14).status,'advanced');
 }finally{f.session.dispose();}
});

test('a static route revocation closes its dynamic stop conflicts without stopping a disjoint worker',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0),{flight:true}),b=f.worker(2,f.point(0,-6),f.point(0,6)),
   c=f.worker(3,f.point(-6,-3.3),f.point(6,-3.3)),d=f.worker(4,f.point(-6,6),f.point(6,6),{flight:true});
  start(f);f.advance(12.5);const bodies=[1,2,3].map(id=>f.body(id)),p=f.point(3,0);
  assert(f.session.core.addWall(p.x,p.z,.15,.6)>0);
  assert.deepEqual(f.bridge.intentChanges().map(e=>e.revokedRouteHandle),[a,b,c]);
  assert.equal(f.w.nav_intent_static_mutation_revocations(),1);
  assert.equal(f.w.nav_intent_execution_stop_invalidations(),2);
  assert.equal(f.advance(13).status,'advanced');assert(f.bridge.nativeRouteExecution(d));
  for(let id=1;id<=3;id++)assert.deepEqual(f.body(id),bodies[id-1]);
 }finally{f.session.dispose();}
});

test('a tracked overlay cannot acknowledge a pending untracked residency mutation',()=>{
 const f=fixture();
 try{
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);const before=f.body(1);
  assert(f.session.core.addChunk(4,4));const p=f.point(40,40);
  assert(f.session.core.addWall(p.x,p.z,.2,.2)>0);
  assert.equal(f.advance(12).status,'world-changed');assert.deepEqual(f.body(1),before);
  assert.equal(f.w.nav_intent_effective_time(),11);
 }finally{f.session.dispose();}
});

test('bulk restore cannot bypass native static mutation fences during active execution',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const p=f.body(1),before=f.session.core.snapshot(),barriers=f.w.spatial_barrier_restore_ptr(1),
   rect=new DataView(f.w.memory.buffer,barriers,28);
  rect.setInt32(0,1,true);rect.setFloat32(4,p.x,true);rect.setFloat32(8,p.z,true);
  rect.setFloat32(12,.2,true);rect.setFloat32(16,.2,true);rect.setFloat32(20,0,true);rect.setInt32(24,0,true);
  assert.equal(f.w.spatial_restore_barriers(1,2),0);
  const pointer=f.w.spatial_polygon_restore_ptr(1),poly=new DataView(f.w.memory.buffer,pointer,528);
  poly.setInt32(0,1,true);poly.setInt32(4,4,true);poly.setInt32(8,0,true);
  square(p).forEach((v,i)=>{poly.setFloat32(16+i*8,v.x,true);poly.setFloat32(20+i*8,v.z,true);});
  assert.equal(f.w.spatial_restore_polygons(1,2),0);
  assert.deepEqual(f.session.core.snapshot(),before);assert(f.bridge.nativeRouteExecution(a));
  assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('speculative wall previews remain isolated from live execution, including aborted previews',()=>{
 const f=fixture();
 try{
  const a=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const confirmed=f.session.core,before=confirmed.snapshot(),sequence=f.w.nav_intent_transition_sequence(),
   p=f.point(2,0),proposal={id:'wall-preview-900001',kind:'wall',status:'intact',
    material:'zarzas',...p,yaw:0,baseScaleX:1};
  assert.equal(f.session.withWallPreview([proposal],[],()=>f.session.actorCanStand(p,{worker:true})),false);
  assert.throws(()=>f.session.withWallPreview([proposal],[],()=>{throw Error('preview aborted');}),/preview aborted/);
  assert.equal(f.session.core,confirmed);assert.deepEqual(confirmed.snapshot(),before);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);
  assert.equal(f.w.nav_intent_static_mutation_revocations(),0);assert(f.bridge.nativeRouteExecution(a));
  assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});
