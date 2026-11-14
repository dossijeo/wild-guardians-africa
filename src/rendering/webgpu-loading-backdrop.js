import * as THREE from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {attribute,clamp,float,mix,smoothstep,step,texture,uniform,vec3} from 'three/tsl';
import {assetUrl} from './asset-url.js';
import {createMountainArcGeometry} from './mountain-arcs.js';
import {mountainBackdropProfile} from './mountain-backdrop-profile.js';
import {skyNight} from './sky.js';
import {prepareWebGpuTexture} from './webgpu-texture-upload.js';
import {loadingBackdropRecipe} from './webgpu-material-graph-catalog.js';

// Loading-only presentation: reuse the authored savanna atlas and the same arc
// layout as LoadingDiorama. The scene and admission queue own no game state.
export function createWebGpuLoadingBackdrop({scene,camera,renderer,admission,fetchImpl=globalThis.fetch,decode=blob=>createImageBitmap(blob,{imageOrientation:'flipY'}),onError=()=>{}}={}){
 if(!scene?.isScene||!camera?.isCamera||!renderer?.backend?.isWebGPUBackend||typeof admission?.prepareAndPublish!=='function'||typeof admission?.deferRelease!=='function'||typeof fetchImpl!=='function'||typeof decode!=='function'||typeof onError!=='function')throw TypeError('Invalid loading backdrop');
 const abort=new AbortController(),night=uniform(0),fog=uniform(new THREE.Color('#decba6')),day=new THREE.Color('#decba6'),dark=new THREE.Color('#26364a');let closed=false,mesh=null,geometry=null,material=null,atlas=null,bitmap=null,published=false;
 const release=()=>{geometry?.dispose();material?.dispose();atlas?.dispose();bitmap?.close();geometry=material=atlas=bitmap=null;};
 const ready=(async()=>{try{
  const profile=mountainBackdropProfile('savanna',712),response=await fetchImpl(assetUrl(profile.atlas),{signal:abort.signal});if(!response.ok)throw Error('Loading mountain atlas unavailable');const image=await decode(await response.blob());if(closed||abort.signal.aborted){image.close();throw new DOMException('Loading backdrop cancelled','AbortError');}
  const map=new THREE.Texture(image);map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.generateMipmaps=true;map.needsUpdate=true;
  await prepareWebGpuTexture({renderer,texture:map,signal:abort.signal,release(){map.dispose();image.close();}});atlas=map;bitmap=image;if(closed||abort.signal.aborted)throw new DOMException('Loading backdrop cancelled','AbortError');
  const angle=Math.atan2(-4.8,-6.4),layout=profile.arcLayout.slice(0,3).map((arc,index)=>({...arc,angle:angle+(index-1)*.45,height:index===1?6.5:4.6,baseY:-1.4}));geometry=createMountainArcGeometry(35,layout);
  const sample=texture(atlas),height=attribute('backdropHeight','float'),fade=smoothstep(.02,.4,height),tint=mix(vec3(1),vec3(.187675676,.302022472,.661818182),clamp(night,0,1)),haze=mix(float(.2),float(.8),float(1).sub(height).mul(float(1).sub(height)));
  material=new MeshBasicNodeMaterial(loadingBackdropRecipe().structural.state);material.colorNode=mix(sample.rgb.mul(tint),fog,haze);material.opacityNode=sample.a.mul(step(float(.35),sample.a)).mul(fade);mesh=new THREE.Mesh(geometry,material);mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=-1000;scene.add(mesh);
  await admission.prepareAndPublish(mesh,{signal:abort.signal,shadowPass:false},()=>{if(closed||abort.signal.aborted)throw new DOMException('Loading backdrop cancelled','AbortError');mesh.visible=true;published=true;});return true;
 }catch(error){if(!closed&&!abort.signal.aborted)onError(error);if(!closed){mesh?.removeFromParent();if(mesh)admission.deferRelease(mesh,release);else release();}return false;}})();
 return {ready,update(state){if(closed)return;night.value=skyNight(state);fog.value.copy(day).lerp(dark,night.value);if(mesh){mesh.position.set(camera.position.x,0,camera.position.z);}},status(){return {closed,ready:published};},dispose(){if(closed)return;closed=true;abort.abort();mesh?.removeFromParent();if(mesh)admission.deferRelease(mesh,release);else release();}};
}
