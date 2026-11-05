import * as THREE from 'three';
import {smoothstep,texture,uniform} from 'three/tsl';
import {skyNight} from './sky.js';
import {prepareWebGpuTexture,releaseAfterWebGpuWork} from './webgpu-texture-upload.js';

// Stable texture bindings for the shared water graph. Sky pixels are prepared
// in its existing worker, then uploaded before their bindings are published.
export function createWebGpuWaterEnvironment({renderer,clockNode=uniform(0),admission=null,onError=()=>{}}={}){
 if(!renderer?.backend?.isWebGPUBackend||!clockNode?.isNode||!Number.isFinite(clockNode.value)||typeof onError!=='function')throw TypeError('Invalid water environment');
 const abort=new AbortController(),owned=new Set(),night=uniform(0),light=uniform(new THREE.Vector3(-30,55,25).normalize()),ready=uniform(0),readyTime=uniform(0),blend=ready.mul(smoothstep(0,.5,clockNode.sub(readyTime)));let closed=false,pending=0,installed=false,installing=false,currentAdmission=admission;
 function make(image){const tex=new THREE.DataTexture(image.pixels,image.width,image.height,THREE.RGBAFormat,THREE.UnsignedByteType);tex.internalFormat='RGBA8';tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.flipY=false;tex.generateMipmaps=true;tex.needsUpdate=true;return tex;}
 const placeholder=()=>{const tex=make({pixels:new Uint8Array([64,64,64,255]),width:1,height:1});owned.add(tex);return tex;};
 const day=texture(placeholder()),dark=texture(placeholder());
 async function install(images){
  if(closed||installed||installing||!Array.isArray(images)||images.length!==2)throw Error('Invalid water environment installation');
  installing=true;const staged=[];try{for(const image of images){if(!image||!Number.isInteger(image.width)||image.width<1||!Number.isInteger(image.height)||image.height<1||!(image.pixels instanceof Uint8Array)||image.pixels.length!==image.width*image.height*4)throw TypeError('Invalid environment pixels');const tex=make(image);pending++;try{await prepareWebGpuTexture({renderer,texture:tex,signal:abort.signal,release:()=>tex.dispose()});}finally{pending--;}staged.push(tex);if(closed)throw new DOMException('Water environment closed','AbortError');}
   for(const tex of staged)owned.add(tex);day.value=staged[0];dark.value=staged[1];readyTime.value=clockNode.value;ready.value=1;installed=true;
  }catch(error){for(const tex of staged)tex.dispose();throw error;}finally{installing=false;}
 }
 return {day,dark,night,light,blend,install,setAdmission(value){if(closed||currentAdmission||typeof value?.deferCompilations!=='function')throw Error('Invalid water admission');currentAdmission=value;},update(state,sun){if(closed)return;if(!state||!sun?.isDirectionalLight)throw TypeError('Invalid water lighting');night.value=skyNight(state);light.value.copy(sun.position).sub(sun.target.position).normalize();},status(){return {closed,installed,pending};},dispose(){if(closed)return;closed=true;abort.abort();const items=[...owned];owned.clear();releaseAfterWebGpuWork({renderer,admission:currentAdmission,uploadsPending:true,release:()=>items.forEach(tex=>tex.dispose()),onError});}};
}
