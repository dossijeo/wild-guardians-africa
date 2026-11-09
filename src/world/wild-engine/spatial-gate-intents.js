import {nativeGateLeaves,nativeGateLeafFootprints} from '../gate-frames-native.js';
import {gateScale} from '../gate-passages.js';

const numeric=id=>{const match=/-(\d+)$/.exec(id??'');const value=Number(match?.[1]);
 if(!Number.isSafeInteger(value)||value<1)throw TypeError('Expected native gate/worker identity');return value;};
export function readNativeGateStaticWitness(w){
 if(w.nav_gate_static_object_version?.()!==1)return null;
 const a=Array.from(new Float64Array(w.memory.buffer,w.nav_gate_static_result_ptr(),8));
 return a[0]?{gateId:a[0],kind:['unknown','barrier','polygon','prop','gate','proposed-overlay','residency','terrain'][a[1]],
  objectId:a[2],gx:a[3],gz:a[4],from:a[5],to:a[6],reason:['','overlap','unproven','missing-data','unsupported','dependency'][a[7]]}:null;
}
// Geometry conversion and ordered boundary facts only. This bridge never tests
// routes, chooses an opening clock or grants permission to cross a gate.
export function createSpatialGateIntents(session,state){
 const w=session.core.wasm;
 if(w.nav_gate_version?.()!==1||w.nav_gate_state_width?.()!==14||w.nav_gate_sweep_version?.()!==1)throw Error('Rebuild native gate service');
 const boundary=()=>{if(w.nav_intent_set_time(state.elapsed)!==1)throw Error('Gate boundary must follow native logical execution');};
 function register(gate){
  const source=nativeGateLeaves[gate.material],vertices=nativeGateLeafFootprints[gate.material];
  if(!gate.gate||!source||!vertices)throw TypeError('Unsupported authored gate');
  boundary();const ptr=w.nav_gate_input_ptr(vertices.length);
  new Float64Array(w.memory.buffer,ptr,vertices.length*2).set(vertices.flat());
  const scale=gateScale(gate),status={intact:0,collapsing:1,ruined:2}[gate.status];
  if(status===undefined)throw TypeError('Unsupported gate state');
  return w.nav_gate_register(numeric(gate.id),gate.x,gate.z,gate.yaw??0,scale*(gate.baseScaleX??1),scale,
   ...source.hinge,gate.gateOpen??NaN,status,vertices.length)===1;
 }
 function read(id){
  if(w.nav_gate_state(numeric(id))!==1)return null;
  const a=Array.from(new Float64Array(w.memory.buffer,w.nav_gate_result_ptr(),14));
  return {opening:a[1],target:a[2],at:a[3],endsAt:a[4],requested:a[5]===1,occupied:a[6]===1,
   status:a[7],triggerRadius:a[8],defined:a[9]===1,from:a[11],sampledAt:a[12],authorizedPassage:false};
 }
 function polygon(id,kind=0){
  const count=w.nav_gate_polygon(numeric(id),kind);if(!count)return null;
  const a=new Float64Array(w.memory.buffer,w.nav_gate_result_ptr(),count*2);
  return Array.from({length:count},(_,i)=>({x:a[i*2],z:a[i*2+1]}));
 }
 function sweepResult(){const a=Array.from(new Float64Array(w.memory.buffer,w.nav_gate_sweep_result_ptr(),6));
  return a[0]?{gateId:a[0],bodyId:a[1],from:a[2],to:a[3],reason:a[4]===1?'overlap':'unproven'}:null;}
 return {register,read,polygon,
  prepareMotion:({enabled=!state.pauses?.length&&!state.result&&!state.initialPreparation,staticObjects=false}={})=>{
   boundary();if(w.nav_gate_sweep_version?.()!==1)throw Error('Rebuild native gate sweep service');
   if(typeof enabled!=='boolean'||typeof staticObjects!=='boolean')throw TypeError('Expected gate boundary flags');
   if(staticObjects&&w.nav_gate_static_object_version?.()!==1)throw Error('Rebuild native gate static-object service');
   const result=(staticObjects?w.nav_gate_prepare_object_motion:w.nav_gate_prepare_motion)(enabled?1:0);
   return {status:result>=0?'prepared':result===-2?'incomplete-facts':result===-3||result===-8?'blocked':result===-6?'unknown':result===-7?'unsupported':'invalid',
    witness:sweepResult(),...(staticObjects?{staticWitness:readNativeGateStaticWitness(w)}:{}),authorizedPassage:false};},
  bodySweepCertified:id=>w.nav_gate_body_sweep_certified(numeric(id))===1,
  installMechanism:(id,material)=>{
   boundary();if(w.nav_gate_mechanism_version?.()!==1)throw Error('Rebuild native gate mechanism service');
   const model={zarzas:1,empalizada:2,reforzado:3}[material];if(!model)throw TypeError('Unsupported mobile gate material');
   const result=w.nav_gate_mechanism_install(numeric(id),model);
   return {status:result===1?'installed':result===-1?'unknown':result===-2?'unsupported':result===-3?'unsupported-support':result===-5?'blocked':'invalid',
    authorizedPassage:false,authorizedAutonomy:false};
  },
  staticObjectsCertified:id=>w.nav_gate_static_objects_certified(numeric(id))===1,
  remove:id=>{boundary();return w.nav_gate_remove(numeric(id))===1;},
  bindWorker:(id,body)=>w.nav_gate_bind_worker(numeric(id),body)===1,
  reconcile:({enabled=!state.pauses?.length&&!state.result&&!state.initialPreparation}={})=>{
   boundary();if(typeof enabled!=='boolean')throw TypeError('Expected a gate clock boundary flag');
   const result=w.nav_gate_reconcile(enabled?1:0);return {status:result>=0?'updated':result===-2?'incomplete-facts':'invalid',authorizedPassage:false};},
  waiting:id=>{const result=w.nav_gate_worker_waiting(numeric(id));return result<0?null:result===1;}};
}
