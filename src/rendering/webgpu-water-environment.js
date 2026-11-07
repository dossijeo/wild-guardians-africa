import * as THREE from 'three';
import {smoothstep,texture,uniform} from 'three/tsl';
import {skyNight} from './sky.js';
import {prepareWebGpuTexture,releaseAfterWebGpuWork} from './webgpu-texture-upload.js';

let nextWaterResourceOwner=0;

// Stable texture bindings for the shared water graph. Sky pixels are prepared
// in its existing worker, then uploaded before their bindings are published.
export function createWebGpuWaterEnvironment({renderer,clockNode=uniform(0),admission=null,resourceRegistry=null,slopeRequired=false,onError=()=>{}}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||!renderer?.backend?.isWebGPUBackend||!clockNode?.isNode||!Number.isFinite(clockNode.value)||typeof slopeRequired!=='boolean'||typeof onError!=='function')throw TypeError('Invalid water environment');
 const resourceOwner=++nextWaterResourceOwner,leases=new Map();let nextTexture=0;
 const abort=new AbortController(),owned=new Set(),night=uniform(0),light=uniform(new THREE.Vector3(-30,55,25).normalize()),ready=uniform(0),readyTime=uniform(0),blend=ready.mul(smoothstep(0,.5,clockNode.sub(readyTime)));let closed=false,pending=0,installed=false,installing=false,currentAdmission=admission;
 function releaseTexture(tex){const lease=leases.get(tex);if(lease){leases.delete(tex);lease.release();}else tex.dispose();}
 function make(image,slope=false){const tex=new THREE.DataTexture(image.pixels,image.width,image.height,slope?THREE.RGFormat:THREE.RGBAFormat,THREE.UnsignedByteType);tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=slope?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;tex.flipY=false;tex.generateMipmaps=true;tex.needsUpdate=true;if(resourceRegistry)try{leases.set(tex,resourceRegistry.adopt({namespace:'water-environment-texture',key:`${resourceOwner}:${++nextTexture}`,bytes:image.pixels.byteLength,dispose:()=>tex.dispose()}));}catch(error){tex.dispose();throw error;}return tex;}
 const placeholder=(slope=false)=>{const tex=make({pixels:new Uint8Array(slope?[128,128]:[64,64,64,255]),width:1,height:1},slope);owned.add(tex);leases.get(tex)?.commit();return tex;};
 const day=texture(placeholder()),dark=texture(placeholder()),slope=texture(placeholder(true));
 async function install(images,slopePixels=null){
  if(closed||installed||installing||!Array.isArray(images)||images.length!==2)throw Error('Invalid water environment installation');
  if(slopeRequired&&!slopePixels)throw TypeError('Missing water slope pixels');
  installing=true;const staged=[];try{for(const [image,isSlope] of [...images.map(image=>[image,false]),...(slopePixels?[[slopePixels,true]]:[])]){if(!image||!Number.isInteger(image.width)||image.width<1||!Number.isInteger(image.height)||image.height<1||!(image.pixels instanceof Uint8Array)||image.pixels.length!==image.width*image.height*(isSlope?2:4))throw TypeError('Invalid environment pixels');const tex=make(image,isSlope);pending++;try{await prepareWebGpuTexture({renderer,texture:tex,signal:abort.signal,release:()=>releaseTexture(tex)});}finally{pending--;}staged.push(tex);if(closed)throw new DOMException('Water environment closed','AbortError');}
   for(const tex of staged)leases.get(tex)?.commit();for(const tex of staged)owned.add(tex);day.value=staged[0];dark.value=staged[1];if(staged[2])slope.value=staged[2];readyTime.value=clockNode.value;ready.value=1;installed=true;
  }catch(error){for(const tex of staged)releaseTexture(tex);throw error;}finally{installing=false;}
 }
 return {day,dark,slope,night,light,blend,install,setAdmission(value){if(closed||currentAdmission||typeof value?.deferCompilations!=='function')throw Error('Invalid water admission');currentAdmission=value;},update(state,sun){if(closed)return;if(!state||!sun?.isDirectionalLight)throw TypeError('Invalid water lighting');night.value=skyNight(state);light.value.copy(sun.position).sub(sun.target.position).normalize();},status(){return {closed,installed,pending};},dispose(){if(closed)return;closed=true;abort.abort();const items=[...owned];owned.clear();releaseAfterWebGpuWork({renderer,admission:currentAdmission,uploadsPending:true,release:()=>items.forEach(releaseTexture),onError});}};
}
