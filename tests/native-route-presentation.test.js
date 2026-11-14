import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {NATIVE_ROUTE_PRESENTATION_FIELDS as fields,NATIVE_ROUTE_PRESENTATION_WIDTH as width,NATIVE_ROUTE_PRESENTATION_CONTINUOUS as continuous} from '../src/world/native-route-presentation.js';

function checkNativeIntervals(f,handle,packet){
 const plan=f.bridge.nativeRouteTiming(handle),rows=packet.rows,knots=f.bridge.nativeRouteTimeKnots(handle);
 assert.equal(rows.length,knots.length*width);assert.equal(rows[0],plan.startTime);assert.equal(rows.at(-width),plan.endTime);
 for(let i=0;i<knots.length;i++)assert.equal(rows[i*width],knots[i]);
 for(let i=0;i+1<knots.length;i++)for(const fraction of [.25,.73]){
  const at=knots[i]+(knots[i+1]-knots[i])*fraction,expected=f.bridge.sampleNativeRoute(handle,at);
  for(let column=1;column<width;column++){
   const actual=continuous.includes(column)?rows[i*width+column]+(rows[(i+1)*width+column]-rows[i*width+column])*fraction:rows[i*width+column],field=fields[column],value=expected[field]??(field==='currentSpeed'?(expected.arrived?0:plan.speed):0);
   assert(Math.abs(actual-Number(value))<1e-8,`${field} at ${at}: ${actual} != ${value}`);
  }
 }
}
function polyline(f,points,facts={}){
 f.session.actorSectorRevision({worker:true});const origin=f.point(-6,0),end=points.at(-1),ptr=f.w.nav_intent_attack_route_input_ptr(points.length);
 new Float32Array(f.w.memory.buffer,ptr,points.length*2).set(points.flatMap(point=>[point.x,point.z]));assert.equal(f.w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,points.length),1);
 const raw=f.bridge.intentChanges().at(-1).routeHandle,result=f.bridge.prepareNativeRouteMotion(raw,{radius:.28,...facts});assert.equal(result.status,'prepared');return result.routeHandle;
}

test('a presentation resource captures complete native worker intervals without advancing or planning',()=>{
 const f=createNativeRouteExecutionFixture();try{const handle=f.worker(1,f.point(-6,0),f.point(6,0),{urgent:true,runRemaining:3.25}),plan=f.bridge.nativeRouteTiming(handle),before=f.body(1),checks=f.w.spatial_execution_clearance_checks(),queries=f.w.nav_intent_route_queries(),sequence=f.w.nav_intent_transition_sequence(),evaluations=f.w.nav_intent_execution_evaluations();
  const packet=f.bridge.captureNativeRoutePresentation(handle);assert.equal(packet.kind,'native-route-presentation');assert.equal(packet.version,1);assert.equal(packet.rowWidth,16);assert.equal(packet.motionMode,'worker');assert.equal(packet.authorizedAutonomy,false);assert.deepEqual(packet.nativeRoute,{actorId:900011,assignmentSequence:plan.assignmentSequence,routeHandle:handle});assert(Object.isFrozen(packet));assert(Object.isFrozen(packet.nativeRoute));assert(Object.isFrozen(packet.nativeRoute.routeHandle));assert(packet.rows instanceof Float64Array);assert.notEqual(packet.rows.buffer,f.w.memory.buffer);assert.equal(packet.worldBoundary,null);
  assert.deepEqual(f.body(1),before);assert.equal(f.w.spatial_execution_clearance_checks(),checks);assert.equal(f.w.nav_intent_route_queries(),queries);assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_execution_evaluations(),evaluations);checkNativeIntervals(f,handle,packet);
 }finally{f.session.dispose();}
});

test('captured native samples survive scratch-buffer reuse and later physical execution',()=>{
 const f=createNativeRouteExecutionFixture();try{const handle=f.worker(1,f.point(-6,0),f.point(6,0)),packet=f.bridge.captureNativeRoutePresentation(handle),before=packet.rows.slice();for(let i=0;i<20;i++)f.bridge.sampleNativeRoute(handle,10+i*.1);assert.deepEqual(packet.rows,before);assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(10.4).status,'advanced');assert.deepEqual(packet.rows,before);assert.deepEqual(f.bridge.captureNativeRoutePresentation(handle).rows,before);assert.notEqual(f.body(1).x,packet.rows[1]);}finally{f.session.dispose();}
});

test('native categorical corner states belong to their interval instead of a rounded inverse-time endpoint',()=>{
 const f=createNativeRouteExecutionFixture();try{const handle=polyline(f,[f.point(0,0),f.point(0,6)]),packet=f.bridge.captureNativeRoutePresentation(handle);assert(packet.rows.length>=3*width);checkNativeIntervals(f,handle,packet);const yaw=fields.indexOf('yaw');assert.notEqual(packet.rows[yaw],packet.rows[width+yaw]);}finally{f.session.dispose();}
});

test('a full native path longer than historical motion capacity is copied without truncation',()=>{
 const f=createNativeRouteExecutionFixture();try{const points=Array.from({length:130},(_,index)=>f.point(index%2?5:-5,0)),handle=polyline(f,points),packet=f.bridge.captureNativeRoutePresentation(handle),knots=f.bridge.nativeRouteTimeKnots(handle);assert(knots.length>64);assert.equal(packet.rows.length,knots.length*width);assert.equal(packet.rows.at(-width),packet.endTime);checkNativeIntervals(f,handle,packet);}finally{f.session.dispose();}
});

test('native gate holds and run exhaustion retain the complete native timetable and frozen phases',()=>{
 const f=nativeGateCrossingFixture({materials:['zarzas','empalizada'],positions:[-3,3]});try{const request=f.route({origin:[.05,-9],points:[[.05,-3],[.05,3],[.05,9]],facts:{urgent:true,runRemaining:5.25}}),admitted=f.admit(request);assert.equal(admitted.status,'admitted');assert.equal(admitted.motionPlan.holds.length,2);const packet=f.bridge.captureNativeRoutePresentation(admitted.routeHandle);assert.equal(f.bridge.captureNativeRoutePresentation(request.handle),null);checkNativeIntervals(f,admitted.routeHandle,packet);for(const hold of admitted.motionPlan.holds){const row=Array.from({length:packet.rows.length/width},(_,i)=>i).find(i=>packet.rows[i*width]===hold.from);assert.notEqual(row,undefined);assert.equal(packet.rows[(row+1)*width],hold.until);assert.equal(packet.rows[row*width+fields.indexOf('currentSpeed')],0);for(const column of [3,4,8,9,10])assert(Math.abs(packet.rows[row*width+column]-packet.rows[(row+1)*width+column])<1e-12);}}finally{f.session.dispose();}
});

test('native animal presentation uses its native clock and does not invent worker phases',()=>{
 const f=createNativeRouteExecutionFixture();try{const handle=f.animal(f.point(-6,0),f.point(6,0)),packet=f.bridge.captureNativeRoutePresentation(handle);assert.equal(packet.motionMode,'animal');assert.equal(packet.executionScope,'static-desert-animal');checkNativeIntervals(f,handle,packet);for(let i=0;i<packet.rows.length;i+=width)for(const column of [8,9,10,11,12,13,14])assert.equal(packet.rows[i+column],0);}finally{f.session.dispose();}
});

test('revocation and foreign authority prevent another capture without changing the owned earlier copy',()=>{
 const f=createNativeRouteExecutionFixture();try{const handle=f.worker(1,f.point(-6,0),f.point(6,0)),packet=f.bridge.captureNativeRoutePresentation(handle),before=packet.rows.slice();assert.equal(f.bridge.captureNativeRoutePresentation({...handle,authorityEpoch:'other'}),null);assert.equal(f.w.nav_intent_cancel_home(900011),1);assert.equal(f.bridge.captureNativeRoutePresentation(handle),null);assert.deepEqual(packet.rows,before);}finally{f.session.dispose();}
});
