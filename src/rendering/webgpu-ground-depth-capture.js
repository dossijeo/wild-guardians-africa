import {DepthTexture,DoubleSide,Mesh,RenderTarget,Scene,UnsignedIntType} from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';

let nextGroundDepthOwner=0;

// Only published ground is borrowed; proxies own neither geometry nor buffers.
export function createWebGpuGroundDepthCapture({renderer,scene,camera,residency,admission,width,height,resourceRegistry=null}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!renderer?.backend?.isWebGPUBackend||!scene?.isScene||!camera?.isCamera||typeof residency?.forEachVisibleGround!=='function'||typeof residency?.retainVisibleGround!=='function'||typeof admission?.prepareTicket!=='function'||typeof admission?.deferRelease!=='function'||typeof admission?.deferCompilations!=='function'||typeof renderer.clear!=='function'||typeof renderer.setRenderTarget!=='function'||typeof renderer.getRenderTarget!=='function')throw TypeError('Invalid ground depth capture');
 const dimensions=(w,h)=>Number.isSafeInteger(w)&&w>0&&Number.isSafeInteger(h)&&h>0;
 if(!dimensions(width,height))throw TypeError('Invalid ground depth dimensions');
 const owner=++nextGroundDepthOwner;let resourceId=0;const material=new MeshBasicNodeMaterial();material.side=DoubleSide;material.colorWrite=false;material.depthWrite=true;let materialLease;try{if(resourceRegistry){materialLease=resourceRegistry.adopt({namespace:'ground-depth-material',key:String(owner),dispose:()=>material.dispose()});materialLease.commit();}}catch(error){if(materialLease)materialLease.release();else material.dispose();throw error;}
 let closed=false,generation=0,controller=null,entries=null,proxyScene=null,candidates=null;
 function makeTarget(w,h){const depth=new DepthTexture(w,h,UnsignedIntType);const target=new RenderTarget(w,h,{depthTexture:depth,depthBuffer:true,stencilBuffer:false,samples:0,generateMipmaps:false}),dispose=()=>{target.dispose();depth.dispose();};let lease;try{if(resourceRegistry){const estimate=w*h*8;lease=resourceRegistry.adopt({namespace:'ground-depth-target',key:`${owner}:${++resourceId}`,bytes:Number.isSafeInteger(estimate)?estimate:null,dispose});}return {target,depth,lease,dispose};}catch(error){dispose();throw error;}}
 function initialize(item){const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.(),mip=renderer.getActiveMipmapLevel?.(),mrt=renderer.getMRT?.();try{renderer.setMRT?.(null);renderer.setRenderTarget(item.target);renderer.clear(false,true,false);}finally{renderer.setRenderTarget(previous,face,mip);if(mrt!==undefined)renderer.setMRT(mrt);}}
 let resource,initialized=false;try{resource=makeTarget(width,height);}catch(error){if(materialLease)materialLease.release();else material.dispose();throw error;}
 function retire(item){admission.deferCompilations(()=>{if(item.lease)item.lease.release();else item.dispose();});}
 function sources(){const result=[];residency.forEachVisibleGround(mesh=>{if(!mesh?.isMesh||mesh.isInstancedMesh||mesh.isSkinnedMesh||mesh.isBatchedMesh||mesh.morphTargetInfluences||Array.isArray(mesh.material)||!mesh.geometry?.isBufferGeometry||!mesh.userData?.ground)throw TypeError('Unsupported resident ground');result.push(mesh);});if(new Set(result).size!==result.length)throw Error('Duplicate resident ground');return result;}
 function matches(expected){const current=sources();return current.length===expected.length&&current.every((source,i)=>source===expected[i].source&&source.geometry===expected[i].geometry&&source.layers.mask===expected[i].proxy.layers.mask&&expected[i].ticket.valid());}
 function retireEntries(items){for(const item of items??[])if(!item.retired){item.retired=true;admission.deferRelease(item.proxy,item.release);}}
 function invalidate(){generation++;controller?.abort();controller=null;retireEntries(entries);retireEntries(candidates);entries=null;candidates=null;proxyScene=null;}
 function updateProxy({source,proxy}){source.updateWorldMatrix(true,false);proxy.matrixWorld.copy(source.matrixWorld);proxy.layers.mask=source.layers.mask;proxy.frustumCulled=source.frustumCulled;}
 return {
  get depth(){return initialized?resource.depth:null;},
  get target(){return resource.target;},
  get ready(){return !closed&&!!entries&&matches(entries);},
  invalidate(){if(!closed)invalidate();},
  async initialize({signal}={}){if(closed)throw Error('Ground depth capture disposed');if(signal?.aborted)throw new DOMException('Ground depth cancelled','AbortError');if(initialized)return;initialize(resource);resource.lease?.commit();initialized=true;},
  async prepare({signal}={}){
   if(closed)throw Error('Ground depth capture disposed');
   if(!initialized)throw Error('Ground depth capture not initialized');
   if(signal!==undefined&&typeof signal?.addEventListener!=='function')throw TypeError('Invalid ground depth signal');
   invalidate();const version=generation,local=new AbortController(),captureScene=new Scene(),prepared=[];controller=local;
   const cancel=()=>local.abort();if(signal?.aborted)local.abort();else signal?.addEventListener('abort',cancel,{once:true});
   try{
    if(local.signal.aborted)throw new DOMException('Ground depth cancelled','AbortError');
    const list=sources();candidates=prepared;
    for(const source of list){const geometry=source.geometry,proxy=new Mesh(geometry,material),release=residency.retainVisibleGround(source);if(typeof release!=='function')throw Error('Ground lease unavailable');proxy.matrixAutoUpdate=false;proxy.matrixWorldAutoUpdate=false;proxy.castShadow=false;proxy.receiveShadow=false;captureScene.add(proxy);const entry={source,geometry,proxy,ticket:null,release,retired:false};prepared.push(entry);updateProxy(entry);const ticket=await admission.prepareTicket(proxy,{signal:local.signal,target:resource.target,shadowPass:false,passCamera:camera,targetScene:captureScene});entry.ticket=ticket;if(closed||version!==generation||local.signal.aborted)throw new DOMException('Ground depth cancelled','AbortError');}
    if(!matches(prepared))return false;entries=prepared;candidates=null;proxyScene=captureScene;return true;
   }finally{signal?.removeEventListener('abort',cancel);if(controller===local)controller=null;if(candidates===prepared){retireEntries(prepared);candidates=null;}}
  },
  render(){
   if(closed)throw Error('Ground depth capture disposed');
   if(!entries||!matches(entries))return false;
   const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace?.(),mip=renderer.getActiveMipmapLevel?.(),mrt=renderer.getMRT?.(),autoClear=renderer.autoClear,autoColor=renderer.autoClearColor,autoDepth=renderer.autoClearDepth,shadow=renderer.shadowMap,shadowAuto=shadow?.autoUpdate,shadowNeeds=shadow?.needsUpdate;
   try{
    for(const entry of entries)updateProxy(entry);
    renderer.autoClear=true;renderer.autoClearColor=true;renderer.autoClearDepth=true;if(shadow){shadow.autoUpdate=false;shadow.needsUpdate=false;}renderer.setMRT?.(null);renderer.setRenderTarget(resource.target);renderer.render(proxyScene,camera);return true;
   }finally{
    renderer.autoClear=autoClear;renderer.autoClearColor=autoColor;renderer.autoClearDepth=autoDepth;if(shadow){shadow.autoUpdate=shadowAuto;shadow.needsUpdate=shadowNeeds;}renderer.setRenderTarget(previous,face,mip);if(mrt!==undefined)renderer.setMRT(mrt);
   }
  },
  async resize(w,h,{signal,publish}={}){if(closed)throw Error('Ground depth capture disposed');if(!initialized)throw Error('Ground depth capture not initialized');if(!dimensions(w,h))throw TypeError('Invalid ground depth dimensions');if(signal?.aborted)throw new DOMException('Ground depth cancelled','AbortError');if(resource.target.width===w&&resource.target.height===h)return false;if(typeof publish!=='function')throw TypeError('Ground depth replacement requires a binding publication callback');const next=makeTarget(w,h),old=resource;try{initialize(next);next.lease?.commit();if(signal?.aborted)throw new DOMException('Ground depth cancelled','AbortError');publish(next.depth);}catch(error){retire(next);throw error;}invalidate();resource=next;retire(old);return true;},
  dispose(){if(closed)return;closed=true;invalidate();retire(resource);admission.deferCompilations(()=>{if(materialLease)materialLease.release();else material.dispose();});}
 };
}
