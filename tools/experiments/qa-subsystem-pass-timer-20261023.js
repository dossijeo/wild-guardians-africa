import {RenderPassTimer} from '/tests/browser/render-pass-timer.js';
import {GpuTimer} from '/tests/browser/gpu-timer.js';
export function drawCategory(object,material){
 const a=object?.geometry?.attributes??{},u=object?.userData??{};
 if(object?.name==='qa-prebaked-fern-shadow')return 'fern-ground-shadow';
 if(a.coverageAnchor)return object.name==='coverage-refined'?'fern-near':'fern-far';
 if(u.globalMudBlend)return 'ground-overlay';
 if(u.ground||u.nativeHorizon==='terrain'||material?.userData?.biomeGround)return 'ground';
 if(u.nativeFluid)return 'water';
 if(a.aTreeBase)return 'far-tree-system';
 if(object?.isSkinnedMesh)return 'skinned';
 if(object?.parent?.native)return 'dynamic-vfx';
 if(object?.isInstancedMesh||object?.geometry?.isInstancedBufferGeometry)return 'other-instanced';
 return 'other';
}
export class SubsystemPassTimer extends RenderPassTimer{
 constructor(world){super(world,new GpuTimer(world.renderer.getContext(),512));const owner=this,r=world.renderer,map=r.shadowMap;this.inShadow=0;this.census=new Map();
 this.shadowWrapper=map.render;this.taggedShadow=function(...args){owner.inShadow++;try{return owner.shadowWrapper.apply(this,args);}finally{owner.inShadow--;}};map.render=this.taggedShadow;
 this.originalDirect=r.renderBufferDirect;this.direct=function(camera,scene,geometry,material,object,...args){
 const context=owner.stack.at(-1);
 if(owner.frame!==null&&context?.pass==='screen'&&!owner.inShadow){const category=drawCategory(object,material),segment='color:'+category;
 if(owner.active?.segment!==segment){owner.end();owner.begin(context.pass,segment);}
 const key=object.uuid+':'+material.uuid;if(!owner.census.has(key))owner.census.set(key,{category,name:object.name,material:material.type,userData:Object.keys(object.userData??{}),materialData:Object.keys(material.userData??{}),attributes:Object.keys(geometry.attributes),instanced:!!object.isInstancedMesh});
 }
 return owner.originalDirect.call(this,camera,scene,geometry,material,object,...args);
 };r.renderBufferDirect=this.direct;
 }
 report(){return {...super.report(),classification:[...this.census.values()]};}
 dispose(){const r=this.world.renderer;if(r.renderBufferDirect===this.direct)r.renderBufferDirect=this.originalDirect;if(r.shadowMap.render===this.taggedShadow)r.shadowMap.render=this.shadowWrapper;super.dispose();}
}
