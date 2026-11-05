import {DepthTexture,HalfFloatType,RenderTarget,UnsignedIntType} from 'three';
import {createWebGpuHiZHierarchy} from './webgpu-hiz-depth.js';

// The capture is a real scene pass: water is excluded to avoid feedback and
// transparent objects are omitted because their depth is not authoritative.
// Alpha-tested opaque foliage remains eligible. Mixed material arrays are
// conservatively omitted until they can be split into opaque draw groups.
function excludedFromReflection(object){
 if(object.userData?.nativeFluid)return true;
 if(!object.isMesh&&!object.isLine&&!object.isPoints&&!object.isSprite)return false;
 const materials=Array.isArray(object.material)?object.material:[object.material];
 return materials.some(material=>material?.transparent);
}

// Resources are fixed-size. The owner must admit all capture/reduction
// pipelines before rendering and defer disposal until submitted GPU work has
// completed; this object does not synchronously wait for the device.
export function createWebGpuWaterReflectionCapture(width,height,{maxLevels=8}={}){
 if(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1)throw TypeError('Invalid reflection capture dimensions');
 const depth=new DepthTexture(width,height,UnsignedIntType);
 const target=new RenderTarget(width,height,{type:HalfFloatType,depthTexture:depth,depthBuffer:true,stencilBuffer:false,samples:0,generateMipmaps:false});
 let hierarchy;
 try{hierarchy=createWebGpuHiZHierarchy(depth,width,height,{maxLevels});}catch(error){target.dispose();depth.dispose();throw error;}
 let closed=false,admissionOwner=null,unregisterTarget=null;
 function ownAdmission(admission){if(!admission||typeof admission.prepare!=='function'||typeof admission.deferRelease!=='function'||typeof admission.deferCompilations!=='function'||admissionOwner&&admissionOwner!==admission)throw TypeError('Invalid reflection admission');admissionOwner=admission;}
 return {
  get color(){return target.texture;},
  get depth(){return depth;},
  get levels(){return hierarchy.levels;},
  registerObjects(admission){if(closed)throw Error('Reflection capture disposed');ownAdmission(admission);if(typeof admission.registerAuxiliaryTarget!=='function')throw TypeError('Invalid reflection admission');if(!unregisterTarget)unregisterTarget=admission.registerAuxiliaryTarget(target);},
  prepareHierarchy(admission,{signal}={}){if(closed)throw Error('Reflection capture disposed');ownAdmission(admission);return hierarchy.prepare(admission,{signal});},
  prepareObject(admission,object,{signal}={}){if(closed)throw Error('Reflection capture disposed');ownAdmission(admission);return admission.prepare(object,{signal,target,shadowPass:false});},
  render(renderer,scene,camera){
   if(closed)throw Error('Reflection capture disposed');
   if(!renderer?.backend?.isWebGPUBackend||!scene?.isScene||!camera?.isCamera||typeof renderer.render!=='function'||typeof renderer.getRenderTarget!=='function'||typeof renderer.setRenderTarget!=='function')throw TypeError('Invalid reflection capture inputs');
   const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.(),mip=renderer.getActiveMipmapLevel?.(),mrt=renderer.getMRT?.(),shadow=renderer.shadowMap,shadowAuto=shadow?.autoUpdate,shadowNeeds=shadow?.needsUpdate,background=scene.background,backgroundNode=scene.backgroundNode,autoClear=renderer.autoClear,autoClearColor=renderer.autoClearColor,autoClearDepth=renderer.autoClearDepth,hidden=[];
   try{
    scene.traverse(object=>{if(object.visible&&excludedFromReflection(object)){hidden.push(object);object.visible=false;}});
    // The sky is supplied separately by the water's environment map. The
    // depth attachment must be cleared even when the world renderer has
    // disabled automatic clears; no background shader is needed here.
    scene.background=null;scene.backgroundNode=null;renderer.autoClear=true;renderer.autoClearColor=true;renderer.autoClearDepth=true;
    if(shadow){shadow.autoUpdate=false;shadow.needsUpdate=false;}
    renderer.setMRT?.(null);renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.autoClear=false;hierarchy.render(renderer);
   }finally{
    for(const object of hidden)object.visible=true;
    scene.background=background;scene.backgroundNode=backgroundNode;renderer.autoClear=autoClear;renderer.autoClearColor=autoClearColor;renderer.autoClearDepth=autoClearDepth;
    if(shadow){shadow.autoUpdate=shadowAuto;shadow.needsUpdate=shadowNeeds;}
    renderer.setRenderTarget(previous,face,mip);if(mrt!==undefined)renderer.setMRT(mrt);
   }
  },
  dispose(){if(closed)return;closed=true;unregisterTarget?.();hierarchy.dispose();const release=()=>{target.dispose();depth.dispose();};if(admissionOwner)admissionOwner.deferCompilations(release);else release();},
 };
}
