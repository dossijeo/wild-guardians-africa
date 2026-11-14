import {DataTexture,FloatType,NearestFilter,RGBAFormat,Vector3} from 'three';
import {Fn,If,Loop,clamp,float,int,ivec2,mix,struct,textureLoad,uniform,vec3,vec4} from 'three/tsl';
import {markRemoteClockNode} from './remote-clock-bindings.js';
import {bindGpuMotionMaterial,unbindGpuMotionMaterial,gpuActorLocalTransform} from './gpu-actor-motion-material.js';
import {prepareNativeRouteGpuTable,sampleNativeRouteGpuTable} from './native-route-gpu-table.js';
import {nativeEntityNumericId} from '../world/native-entity-id.js';

let nextResource=0;
const NativeState=struct({pose:'vec4',phases:'vec4',mode:'vec4'});

// One immutable route assignment, with its own tagged physical uniform. Time
// remains owned by NativeRouteControl in the draw worker; this creates no timer,
// grants no horizon and performs no per-frame JS sampling or buffer uploads.
export function createNativeGpuMotion({actorId,support,anchorYaw=0,heightOffset=0,anchorPosition=null,resourceRegistry=null}={}){
 if(typeof actorId!=='string'||!actorId||![anchorYaw,heightOffset].every(Number.isFinite)||anchorPosition!==null&&![anchorPosition?.x,anchorPosition?.y,anchorPosition?.z].every(Number.isFinite)||resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function')throw TypeError('Invalid native GPU motion configuration');
 const table=prepareNativeRouteGpuTable(support);
 if(nativeEntityNumericId(actorId)!==table.nativeRoute.actorId)throw TypeError('Native GPU actor identity mismatch');
 const start=Object.freeze({...table.start,y:table.start.y+heightOffset}),end=Object.freeze({...table.end,y:table.end.y+heightOffset}),bindingAnchor=Object.freeze(anchorPosition?{x:anchorPosition.x,y:anchorPosition.y,z:anchorPosition.z}:{x:start.x,y:start.y,z:start.z}),texture=new DataTexture(table.data,table.width,table.height,RGBAFormat,FloatType),clockNode=markRemoteClockNode(uniform(0),'relative',table.epoch,table.nativeRoute),bindings=new Map(),anchor=uniform(new Vector3(bindingAnchor.x,bindingAnchor.y,bindingAnchor.z));
 texture.minFilter=texture.magFilter=NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 let disposed=false,lease=null;
 try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'native-gpu-motion',key:String(++nextResource),bytes:table.data.byteLength,dispose:()=>texture.dispose()});lease.commit();}}catch(error){if(lease)lease.release();else texture.dispose();throw error;}
 const load=(index,column)=>textureLoad(texture,ivec2(index.mod(int(table.columns)).mul(5).add(column),index.div(int(table.columns))));
 const state=Fn(()=>{
  const time=clamp(clockNode.sub(clockNode.abs().max(1).mul(.000000476837158203125)),float(0),float(table.duration)).toVar(),low=int(0).toVar(),high=int(table.count).toVar();
  // Upper bound, then its predecessor: categorical values are right-continuous
  // at native knots. 15 bisections cover every supported 16385-row resource.
  Loop(15,()=>{If(low.lessThan(high),()=>{const middle=low.add(high).div(int(2)).toVar();If(load(middle,0).x.lessThanEqual(time),()=>{low.assign(middle.add(1));}).Else(()=>{high.assign(middle);});});});
  const index=low.sub(int(1)).max(int(0)).toVar(),next=index.add(int(1)).min(int(table.count-1)).toVar(),a=load(index,0).toVar(),b=load(next,0).toVar(),span=b.x.sub(a.x),fraction=clamp(time.sub(a.x).div(span.max(1e-30)),float(0),float(1)),from=load(index,1).toVar(),to=load(next,1).toVar(),clips=load(index,2).toVar(),nextClips=load(next,2).toVar(),pose=mix(a.yzw,b.yzw,fraction),phases=mix(clips.yzw,nextClips.yzw,fraction);
  return NativeState({pose:vec4(pose,from.z.sub(anchorYaw)),phases:vec4(mix(from.y,to.y,fraction),phases),mode:vec4(load(index,3).w,load(index,4).x,clips.x,from.w)});
 })();
 const transform=base=>Fn(()=>{const sampled=state.toVar();return gpuActorLocalTransform(base,sampled.get('pose').xyz.add(vec3(0,heightOffset,0)),sampled.get('pose').w,anchor,int(1).greaterThan(0));})();
 const installed=Object.freeze({start,end,segments:table.count-1,nativeRoute:table.nativeRoute});
 const phases=Object.freeze({Walk_Skip:state.get('phases').z,Run:state.get('phases').y,Carry_Crate:state.get('phases').w});
 function unbind(material){return unbindGpuMotionMaterial(bindings,material);}
 return {actorId,clockNode,bindingAnchor,phaseNode:state.get('phases').x,runPhaseNode:phases.Run,walkPhaseNode:phases.Walk_Skip,carryPhaseNode:phases.Carry_Crate,runningNode:state.get('mode').x,currentSpeedNode:state.get('mode').y,arrivedNode:state.get('mode').z,
  bind(material){if(disposed)throw Error('Native GPU motion disposed');return bindGpuMotionMaterial(bindings,material,transform);},unbind,
  resolve(fallback,clip){if(disposed||!Object.hasOwn(phases,clip))throw Error('Unsupported native animation phase');return phases[clip];},
  sample(at){if(disposed)throw Error('Native GPU motion disposed');const value=sampleNativeRouteGpuTable(table,at);return {...value,y:value.y+heightOffset,dx:value.x-bindingAnchor.x,dy:value.y+heightOffset-bindingAnchor.y,dz:value.z-bindingAnchor.z,yawDelta:value.yaw-anchorYaw};},
  valid:()=>!disposed&&support.valid()===true,get texture(){return texture;},status(){return {disposed,sequence:table.nativeRoute.assignmentSequence,installed:disposed?null:installed,rows:table.count,columns:table.columns,bytes:table.data.byteLength};},
  dispose(){if(disposed)return;disposed=true;for(const material of [...bindings.keys()])unbind(material);if(lease)lease.release();else texture.dispose();}
 };
}
