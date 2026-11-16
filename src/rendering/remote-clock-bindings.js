import {copyNativeIdleStrollReference,sameNativeIdleStrollReference,nativeIdleStrollSuccessor} from '../world/native-idle-stroll.js';
import {copyNativeIdleCycleReference,sameNativeIdleCycleReference,nativeIdleCycleSuccessor} from '../world/native-idle-cycle.js';
import {copyNativeHomeRouteReference,sameNativeHomeRouteReference,nativeHomeRouteSuccessor} from '../world/native-home-route.js';
import {copyNativeTaskConsequenceReference,sameNativeTaskConsequenceReference,nativeTaskConsequenceSuccessor} from '../world/native-task-consequence.js';
import {copyNativeTaskSettlementReference,sameNativeTaskSettlementReference,nativeTaskSettlementSuccessor} from '../world/native-task-settlement.js';
import {copyNativeTaskStartReference,sameNativeTaskStartReference,nativeTaskStartSuccessor} from '../world/native-task-start-reference.js';
import {copyNativeResumeReference,sameNativeResumeReference,nativeResumeSuccessor} from '../world/native-resume-reference.js';
import {copyNativeSuspendedBodyReference} from '../world/native-suspended-body-reference.js';
import {copyNativeRouteReference} from '../world/native-route-reference.js';
import {copyNativeGateReference} from '../world/native-gate-reference.js';
import {sameNativeWorldBoundary} from '../world/native-world-boundary.js';
import {copyNativeTaskActionReference,sameNativeTaskActionReference,nativeTaskActionSuccessor} from '../world/native-task-action-presentation.js';
import {copyNativeInitialIdleBodyReference,sameNativeInitialIdleBodyReference,nativeInitialIdleBodySuccessor} from '../world/native-initial-idle-body.js';

// Symbol metadata is intentionally non-enumerable: it must not alter TSL graph
// structure/cache keys. Registration occurs when a physical binding is updated,
// never by discovering graph nodes during replay.
const clockMetadata=Symbol.for('wild-guardians.remote-clock');
export function markRemoteClockNode(node,semantic,epoch,nativeRoute=null,nativeGate=null,nativeSuspended=null,nativeResume=null,period=null,resourceEnd=null,nativeStart=null,nativeAction=null,nativeConsequence=null,nativeSettlement=null,nativeHome=null,nativeInitialIdleBody=null,nativeIdleCycle=null,nativeStroll=null){
 if(!node?.isNode||!['absolute','relative','origin-modulo','idle-cycle-watch-knot'].includes(semantic)||!Number.isFinite(epoch)||epoch<0)throw TypeError('Invalid remote clock node');
 if(semantic==='idle-cycle-watch-knot'&&nativeIdleCycle===null)throw TypeError('Native watch knot requires its cycle');
 if(semantic==='origin-modulo'?nativeResume===null&&nativeStart===null&&nativeConsequence===null&&nativeSettlement===null&&nativeHome===null&&nativeStroll===null||!Number.isFinite(period)||period<=0:period!==null)throw TypeError('Invalid native origin phase clock');
 if(resourceEnd!==null&&(!Number.isFinite(resourceEnd)||resourceEnd<epoch))throw TypeError('Invalid native clock resource end');
 let route=null;
 if(nativeRoute!==null){
  // A compiled uniform belongs to this exact assignment. Caller mutation must
  // never retag an already admitted GPU binding for another route generation.
  try{route=copyNativeRouteReference(nativeRoute);}catch{throw TypeError('Invalid native route clock reference');}
 }
 if([nativeRoute,nativeGate,nativeSuspended,nativeResume,nativeStart,nativeAction,nativeConsequence,nativeSettlement,nativeHome,nativeInitialIdleBody,nativeIdleCycle,nativeStroll].filter(value=>value!==null).length>1)throw TypeError('Conflicting native clock references');
 const cycle=nativeIdleCycle===null?null:copyNativeIdleCycleReference(nativeIdleCycle);
 if(cycle&&(!['relative','idle-cycle-watch-knot'].includes(semantic)||epoch!==cycle.worldBoundary.effectiveTime||resourceEnd!==null))throw TypeError('Invalid native Idle cycle clock');
 const initialBody=nativeInitialIdleBody===null?null:copyNativeInitialIdleBodyReference(nativeInitialIdleBody);
 if(initialBody&&(semantic!=='relative'||epoch!==initialBody.worldBoundary.effectiveTime||resourceEnd!==null))throw TypeError('Invalid native initial Idle body clock');
 const stroll=nativeStroll===null?null:copyNativeIdleStrollReference(nativeStroll);
 if(stroll&&(!['relative','origin-modulo'].includes(semantic)||epoch!==stroll.worldBoundary.effectiveTime))throw TypeError('Invalid native Idle stroll clock epoch or semantic');
 const home=nativeHome===null?null:copyNativeHomeRouteReference(nativeHome);
 if(home&&(!['relative','origin-modulo'].includes(semantic)||epoch!==home.worldBoundary.effectiveTime))throw TypeError('Invalid native Home clock epoch or semantic');
 const settlement=nativeSettlement===null?null:copyNativeTaskSettlementReference(nativeSettlement);
 if(settlement&&(!['relative','origin-modulo'].includes(semantic)||epoch!==settlement.worldBoundary.effectiveTime||resourceEnd!==null))throw TypeError('Invalid native settlement phase clock');
 const action=nativeAction===null?null:copyNativeTaskActionReference(nativeAction);
 if(action&&(semantic!=='relative'||epoch!==action.startTime||resourceEnd!==null))throw TypeError('Invalid native action phase clock');
 const suspended=nativeSuspended===null?null:copyNativeSuspendedBodyReference(nativeSuspended);
 const resume=nativeResume===null?null:copyNativeResumeReference(nativeResume),start=nativeStart===null?null:copyNativeTaskStartReference(nativeStart);
 const consequence=nativeConsequence===null?null:copyNativeTaskConsequenceReference(nativeConsequence);
 if(consequence&&epoch!==consequence.worldBoundary.effectiveTime)throw TypeError('Invalid native consequence clock epoch');
 const gate=nativeGate===null?null:copyNativeGateReference(nativeGate);
 if(Object.hasOwn(node,clockMetadata))throw TypeError('Cannot redefine remote clock node');
 Object.defineProperty(node,clockMetadata,{value:Object.freeze({semantic,epoch,...(period===null?{}:{period}),...(resourceEnd===null?{}:{resourceEnd}),...(route?{nativeRoute:route}:{}),...(gate?{nativeGate:gate}:{}),...(suspended?{nativeSuspended:suspended}:{}),...(resume?{nativeResume:resume}:{}),...(start?{nativeStart:start}:{}),...(action?{nativeAction:action}:{}),...(consequence?{nativeConsequence:consequence}:{}),...(settlement?{nativeSettlement:settlement}:{}),...(stroll?{nativeStroll:stroll}:{}),...(home?{nativeHome:home}:{}),...(initialBody?{nativeInitialIdleBody:initialBody}:{}),...(cycle?{nativeIdleCycle:cycle}:{})}),enumerable:false,configurable:resume!==null||gate!==null||start!==null||action!==null||consequence!==null||settlement!==null||home!==null||stroll!==null||initialBody!==null||cycle!==null});
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
   if(metadata.nativeResume||metadata.nativeGate||metadata.nativeStart||metadata.nativeAction||metadata.nativeConsequence||metadata.nativeSettlement||metadata.nativeHome||metadata.nativeStroll||metadata.nativeInitialIdleBody||metadata.nativeIdleCycle){let entries=nodeBindings.get(node);if(!entries){entries=[];nodeBindings.set(node,entries);}if(!entries.some(entry=>entry.group.deref()===binding&&entry.byteOffset===uniform.offset*4))entries.push({group:new WeakRef(binding),byteOffset:uniform.offset*4});}
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
 return {retagNativeIdleCycle(node,previous,value){
  const before=copyNativeIdleCycleReference(previous),after=copyNativeIdleCycleReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeIdleCycleReference(metadata?.nativeIdleCycle,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeIdleCycleSuccessor(before,after))throw Error('Native Idle cycle clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,nativeIdleCycle:after}));
 },retagNativeInitialIdleBody(node,previous,value){
  const before=copyNativeInitialIdleBodyReference(previous),after=copyNativeInitialIdleBodyReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeInitialIdleBodyReference(metadata?.nativeInitialIdleBody,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeInitialIdleBodySuccessor(before,after))throw Error('Native initial Idle body clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,nativeInitialIdleBody:after}));
 },retagNativeHomeRoute(node,previous,value,resourceEnd=null){
  const before=copyNativeHomeRouteReference(previous),after=copyNativeHomeRouteReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeHomeRouteReference(metadata?.nativeHome,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeHomeRouteSuccessor(before,after))throw Error('Native Home clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<after.worldBoundary.effectiveTime))throw Error('Native Home clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeHome:after}));
 },retagNativeIdleStroll(node,previous,value,resourceEnd=null){
  const before=copyNativeIdleStrollReference(previous),after=copyNativeIdleStrollReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeIdleStrollReference(metadata?.nativeStroll,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeIdleStrollSuccessor(before,after))throw Error('Native Idle stroll clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<after.worldBoundary.effectiveTime))throw Error('Native Idle stroll clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeStroll:after}));
 },retagNativeTaskSettlement(node,previous,value){
  const before=copyNativeTaskSettlementReference(previous),after=copyNativeTaskSettlementReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeTaskSettlementReference(metadata?.nativeSettlement,before)||metadata.epoch!==before.worldBoundary.effectiveTime||after.worldBoundary.ticket<=before.worldBoundary.ticket||!nativeTaskSettlementSuccessor(before,after))throw Error('Native settlement clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,nativeSettlement:after}));
 },retagNativeTaskConsequence(node,previous,value,resourceEnd=null){
  const before=copyNativeTaskConsequenceReference(previous),after=copyNativeTaskConsequenceReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeTaskConsequenceReference(metadata?.nativeConsequence,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeTaskConsequenceSuccessor(before,after))throw Error('Native consequence clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<after.worldBoundary.effectiveTime))throw Error('Native consequence clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeConsequence:after}));
 },retagNativeTaskAction(node,previous,value){
  const before=copyNativeTaskActionReference(previous),after=copyNativeTaskActionReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeTaskActionReference(metadata?.nativeAction,before)||metadata.epoch!==before.startTime||!nativeTaskActionSuccessor(before,after))throw Error('Native action clock cannot be retagged');
  return replace(node,Object.freeze({...metadata,epoch:after.startTime,nativeAction:after}));
 },retagNativeTaskStart(node,previous,value,resourceEnd=null){
  const before=copyNativeTaskStartReference(previous),after=copyNativeTaskStartReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeTaskStartReference(metadata?.nativeStart,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeTaskStartSuccessor(before,after))throw Error('Native task start clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<after.worldBoundary.effectiveTime))throw Error('Native task start clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeStart:after}));
 },retagNativeGate(node,previous,value,resourceEnd=null){
  const before=copyNativeGateReference(previous),after=copyNativeGateReference(value),metadata=node?.[clockMetadata],a=before.worldBoundary,b=after.worldBoundary;
  if(disposed||metadata?.nativeGate?.gateId!==before.gateId||!sameNativeWorldBoundary(metadata.nativeGate.worldBoundary,a)||metadata.epoch!==a.effectiveTime||before.gateId!==after.gateId||a.authorityEpoch!==b.authorityEpoch||a.nativeSession!==b.nativeSession||b.ticket<=a.ticket||b.effectiveTime<a.effectiveTime)throw Error('Native gate clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<b.effectiveTime))throw Error('Native gate clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:b.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeGate:after}));
 },retagNativeResume(node,previous,value,resourceEnd=null){
  const before=copyNativeResumeReference(previous),after=copyNativeResumeReference(value),metadata=node?.[clockMetadata];
  if(disposed||!sameNativeResumeReference(metadata?.nativeResume,before)||metadata.epoch!==before.worldBoundary.effectiveTime||!nativeResumeSuccessor(before,after))throw Error('Native resume clock cannot be retagged');
  if(metadata.resourceEnd!==undefined&&(!Number.isFinite(resourceEnd)||resourceEnd<after.worldBoundary.effectiveTime))throw Error('Native resume clock requires its new resource end');
  return replace(node,Object.freeze({...metadata,epoch:after.worldBoundary.effectiveTime,...(metadata.resourceEnd===undefined?{}:{resourceEnd}),nativeResume:after}));
 },dispose(){if(disposed)return;disposed=true;if(backend.updateBinding===updateBinding)backend.updateBinding=original;}};
}
