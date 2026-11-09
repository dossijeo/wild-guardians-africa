import {nativeGateLeaves,nativeGateLeafFootprints} from '../gate-frames-native.js';
import {gateScale} from '../gate-passages.js';

const numeric=id=>{const match=/-(\d+)$/.exec(id??'');const value=Number(match?.[1]);
 if(!Number.isSafeInteger(value)||value<1)throw TypeError('Expected native gate/worker identity');return value;};
// Geometry conversion and ordered boundary facts only. This bridge never tests
// routes, chooses an opening clock or grants permission to cross a gate.
export function createSpatialGateIntents(session,state){
 const w=session.core.wasm;
 if(w.nav_gate_version?.()!==1||w.nav_gate_state_width?.()!==14)throw Error('Rebuild native gate service');
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
 return {register,read,polygon,
  remove:id=>{boundary();return w.nav_gate_remove(numeric(id))===1;},
  bindWorker:(id,body)=>w.nav_gate_bind_worker(numeric(id),body)===1,
  reconcile:({enabled=!state.pauses?.length&&!state.result&&!state.initialPreparation}={})=>{
   boundary();if(typeof enabled!=='boolean')throw TypeError('Expected a gate clock boundary flag');
   const result=w.nav_gate_reconcile(enabled?1:0);return {status:result>=0?'updated':result===-2?'incomplete-facts':'invalid',authorizedPassage:false};},
  waiting:id=>{const result=w.nav_gate_worker_waiting(numeric(id));return result<0?null:result===1;}};
}
