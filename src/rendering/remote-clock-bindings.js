import {copyNativeResumeReference,sameNativeResumeReference,nativeResumeSuccessor} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference} from '../world/native-gate-reference.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';

// Symbol metadata is intentionally non-enumerable: it must not alter TSL graph
// structure/cache keys. Registration occurs when a physical binding is updated,
// never by discovering graph nodes during replay.
const clockMetadata=Symbol.for('wild-guardians.remote-clock');
export function markRemoteClockNode(node,semantic,epoch,nativeRoute=null,nativeGate=null,nativeSuspended=null,nativeResume=null){
 if(!node?.isNode||!['absolute','relative'].includes(semantic)||!Number.isFinite(epoch)||epoch<0)throw TypeError('Invalid remote clock node');
 let route=null;
 if(nativeRoute!==null){
  // A compiled uniform belongs to this exact assignment. Caller mutation must
  // never retag an already admitted GPU binding for another route generation.
  try{route=copyNativeRouteReference(nativeRoute);}catch{throw TypeError('Invalid native route clock reference');}
 }
 if([nativeRoute,nativeGate,nativeSuspended,nativeResume].filter(value=>value!==null).length>1)throw TypeError('Conflicting native clock references');
 const suspended=nativeSuspended===null?null:copyNativeSuspendedBodyReference(nativeSuspended);
 const resume=nativeResume===null?null:copyNativeResumeReference(nativeResume);
 const gate=nativeGate===null?null:copyNativeGateReference(nativeGate);
 if(Object.hasOwn(node,clockMetadata))throw TypeError('Cannot redefine remote clock node');
 Object.defineProperty(node,clockMetadata,{value:Object.freeze({semantic,epoch,...(route?{nativeRoute:route}:{}),...(gate?{nativeGate:gate}:{}),...(suspended?{nativeSuspended:suspended}:{}),...(resume?{nativeResume:resume}:{})}),enumerable:false,configurable:resume!==null||gate!==null});
 return node;
}
export function installRemoteClockBindings(renderer,remote){
 const backend=renderer?.backend;
 if(typeof backend?.updateBinding!=='function'||typeof backend.get!=='function'||typeof remote?.registerClockBinding!=='function')throw TypeError('Invalid remote clock binding adapter');
 const original=backend.updateBinding,registered=new WeakMap(),nodeBindings=new WeakMap();let disposed=false;
 function updateBinding(binding){
  const result=original.call(this,binding);
  if(disposed||!binding?.isNodeUniformsGroup)return result;
  const buffer=this.get(binding).buffer;
  if(!buffer||registered.get(binding)===buffer)return result;
  for(const uniform of binding.uniforms){
   const node=uniform.nodeUniform?.node,metadata=node?.[clockMetadata];
   if(!metadata)continue;
   if(!Number.isSafeInteger(uniform.offset)||uniform.offset<0||uniform.itemSize!==1)throw Error('Invalid remote clock uniform layout');
   remote.registerClockBinding(buffer,{byteOffset:uniform.offset*4,...metadata});
   if(metadata.nativeResume||metadata.nativeGate){let entries=nodeBindings.get(node);if(!entries){entries=[];nodeBindings.set(node,entries);}if(!entries.some(entry=>entry.group.deref()===binding&&entry.byteOffset===uniform.offset*4))entries.push({group:new WeakRef(binding),byteOffset:uniform.offset*4});}
  }
  registered.set(binding,buffer);
  return result;
 }
 backend.updateBinding=updateBinding;
 function replace(node,next){
  const live=[];
  for(const entry of nodeBindings.get(node)??[]){const group=entry.group.deref();if(!group)continue;live.push(entry);const buffer=registered.get(group);if(buffer&&backend.get(group).buffer===buffer)remote.registerClockBinding(buffer,{byteOffset:entry.byteOffset,...next});}
  Object.defineProperty(node,clockMetadata,{value:next,enumerable:false,configurable:true});nodeBindings.set(node,live);return true;
 }
 return {retagNativeGate(node,previous,value){
  const before=copyNativeGateReference(previous),after=copyNativeGateReference(value),metadata=node?.[clockMetadata],a=before.worldBoundary,b=after.worldBoundary;
  if(disposed||metadata?.nativeGate?.gateId!==before.gateId||!sameNativeWorldBoundary(metadata.nativeGate.worldBoundary,a)||metadata.epoch!==a.effectiveTime||before.gateId!==after.gateId||a.authorityEpoch!==b.authorityEpoch||a.nativeSession!==b.nativeSession||b.ticket<=a.ticket||b.effectiveTime<a.effectiveTime)throw Error('Native gate clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:b.effectiveTime,nativeGate:after}));
 },retagNativeResume(node,previous,value){
  const before=copyNativeResumeReference(previous),after=copyNativeResumeReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeResumeReference(metadata?.nativeResume,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeResumeSuccessor(before,after))throw Error('Native resume clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,nativeResume:after}));
 },dispose(){if(disposed)return;disposed=true;if(backend.updateBinding===updateBinding)backend.updateBinding=original;}};
}
