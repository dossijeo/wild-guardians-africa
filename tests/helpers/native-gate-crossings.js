import assert from 'node:assert/strict';
import {createNativeRouteExecutionFixture as fixture} from './native-route-execution.js';
import {createSpatialGateIntents} from '../../src/world/wild-engine/spatial-gate-intents.js';

export function nativeGateCrossingFixture({materials=['zarzas'],positions=[0],opening=0,yaw=0,install=true,alignGrid=false}={}){
 const f=fixture(),p=f.point(0,0);f.session.core.setSettlement(p.x,p.z,24,24);
 const service=createSpatialGateIntents(f.session,f.state),gates=materials.map((material,i)=>({
  id:`structure-${990001+i}`,gate:true,status:'intact',material,...f.point(0,positions[i]),
  ...(alignGrid?{x:Math.round(p.x)-.05}:{}),gateOpen:opening,yaw}));
 for(const gate of gates){assert(service.register(gate));if(install)assert.equal(service.installMechanism(gate.id,gate.material).status,'installed');}
 function route({id=1,origin=[.05,-6],points=[[.05,6]],facts={}}={}){
  const a=f.point(...origin),path=points.map(p=>f.point(...p)),end=path.at(-1);f.session.actorSectorRevision({worker:true});
  const ptr=f.w.nav_intent_attack_route_input_ptr(path.length);
  new Float32Array(f.w.memory.buffer,ptr,path.length*2).set(path.flatMap(p=>[p.x,p.z]));
  assert.equal(f.w.nav_intent_restore_home(900010+id,a.x,a.z,end.x,end.z,path.length),1);
  const handle=f.bridge.intentChanges().find(e=>e.actorId===900010+id&&e.routeHandle)?.routeHandle;assert(handle);
  assert.equal(f.w.spatial_body_upsert(id,a.x,a.z,.28,0,facts.incapacitated?3:1),1);
  assert(service.bindWorker(`worker-${900010+id}`,id));
  return {handle,a,end,points:f.bridge.routePoints(handle),facts,id};
 }
 return {...f,service,gates,route,admit:r=>f.bridge.admitNativeGateRoute(r.handle,r.id,{radius:.28,...r.facts})};
}
