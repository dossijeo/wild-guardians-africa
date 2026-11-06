import {auxiliaryPassRecipe} from './webgpu-material-graph-catalog.js';
import {FloatType,NearestFilter,RedFormat,RenderTarget,Vector2} from 'three';
import {MeshBasicNodeMaterial,QuadMesh} from 'three/webgpu';
import {Fn,clamp,ivec2,min,screenCoordinate,texture,textureLoad,uniform,vec4} from 'three/tsl';

let nextHiZResourceOwner=0;

// WebGPU's normal depth convention maps near to 0 and far to 1. Each output
// texel conservatively covers a 2x2 block; clamping repeats the edge for odd
// dimensions. Depth textures load a scalar, while color textures load a vec4.
export function hiZReductionNode(source,sourceSize,{depthSource=false}={}){
 if(!source?.isNode||!sourceSize?.isNode||typeof depthSource!=='boolean')throw TypeError('Invalid Hi-Z reduction input');
 return Fn(()=>{
  const base=ivec2(screenCoordinate.xy).mul(2),limit=ivec2(sourceSize).sub(ivec2(1));
  const read=offset=>{const sample=textureLoad(source,clamp(base.add(offset),ivec2(0),limit)).setUpdateMatrix(false);return depthSource?sample:sample.r;};
  const depth=min(min(read(ivec2(0,0)),read(ivec2(1,0))),min(read(ivec2(0,1)),read(ivec2(1,1))));
  return vec4(depth,depth,depth,1);
 })();
}

// A 1x1 input already represents the complete hierarchy. Dimensions are
// rounded upward to preserve the last row and column of non-power-of-two views.
export function hiZLevelSizes(width,height,{maxLevels=16}={}){
 if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1||!Number.isSafeInteger(maxLevels)||maxLevels<0||maxLevels>32)throw TypeError('Invalid Hi-Z dimensions');
 const result=[];while((width>1||height>1)&&result.length<maxLevels){width=Math.ceil(width/2);height=Math.ceil(height/2);result.push({width,height});}return result;
}

// The owner supplies an already-rendered, non-MSAA depth attachment. Levels
// are immutable in size: create a replacement on resize and retain this one
// until the renderer has finished using its targets and materials.
export function createWebGpuHiZHierarchy(depth,width,height,{maxLevels=8,resourceRegistry=null}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!depth?.isDepthTexture||depth.image?.width!==width||depth.image?.height!==height||depth.renderTarget?.samples>1)throw TypeError('Hi-Z requires a matching non-MSAA depth texture');
 const resourceOwner=++nextHiZResourceOwner,sizes=hiZLevelSizes(width,height,{maxLevels}),levels=[];let source=depth,sourceWidth=width,sourceHeight=height,closed=false,admissionOwner=null,preparing=false,prepared=false;
 try{for(const [index,size] of sizes.entries()){
  const target=new RenderTarget(size.width,size.height,{format:RedFormat,type:FloatType,minFilter:NearestFilter,magFilter:NearestFilter,depthBuffer:false,stencilBuffer:false,generateMipmaps:false});
  const material=new MeshBasicNodeMaterial(auxiliaryPassRecipe('hiz').structural.state);
  material.outputNode=hiZReductionNode(texture(source),uniform(new Vector2(sourceWidth,sourceHeight)),{depthSource:index===0});
  let lease;try{if(resourceRegistry){lease=resourceRegistry.adopt({namespace:'hiz-level',key:`${resourceOwner}:${index}`,dispose:()=>{material.dispose();target.dispose();}});lease.commit();}}catch(error){if(lease)lease.release();else{material.dispose();target.dispose();}throw error;}levels.push({target,material,quad:new QuadMesh(material),lease});source=target.texture;sourceWidth=size.width;sourceHeight=size.height;
 }}catch(error){for(const level of levels){if(level.lease)level.lease.release();else{level.material.dispose();level.target.dispose();}}throw error;}
 return {
  get levels(){return levels.map(({target})=>target.texture);},
  async prepare(admission,{signal}={}){
   if(closed)throw Error('Hi-Z hierarchy disposed');
   if(!admission||typeof admission.prepare!=='function'||typeof admission.deferRelease!=='function'||admissionOwner&&admissionOwner!==admission)throw TypeError('Invalid Hi-Z admission');
   if(preparing)throw Error('Hi-Z preparation already pending');if(prepared)return;
   admissionOwner=admission;preparing=true;
   try{for(const {target,quad} of levels){if(closed)throw Error('Hi-Z hierarchy disposed');await admission.prepare(quad,{signal,target,passCamera:quad.camera,targetScene:quad,shadowPass:false});}if(closed)throw Error('Hi-Z hierarchy disposed');prepared=true;}finally{preparing=false;}
  },
  // Compilation/admission is the caller's responsibility. This method only
  // submits reduction draws and never waits synchronously for the GPU.
  render(renderer){if(closed)throw Error('Hi-Z hierarchy disposed');if(!renderer?.backend?.isWebGPUBackend||typeof renderer.getRenderTarget!=='function'||typeof renderer.setRenderTarget!=='function'||typeof renderer.render!=='function')throw TypeError('Invalid Hi-Z renderer');const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.(),mip=renderer.getActiveMipmapLevel?.(),mrt=renderer.getMRT?.();try{renderer.setMRT?.(null);for(const {target,quad} of levels){renderer.setRenderTarget(target);quad.render(renderer);}}finally{renderer.setRenderTarget(previous,face,mip);if(mrt!==undefined)renderer.setMRT(mrt);}},
  dispose(){if(closed)return;closed=true;for(const {target,material,quad,lease} of levels){const release=()=>{if(lease)lease.release();else{material.dispose();target.dispose();}};if(admissionOwner)admissionOwner.deferRelease(quad,release);else release();}},
 };
}
