import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {acos,atan,cameraPosition,clamp,diffuseColor,normalize,normalWorld,positionWorld,pow,reflect,roughness,shadow,vec2,vec3,vec4,mix} from 'three/tsl';
import {assetUrl} from './asset-url.js';
import {prepareWebGpuTexture} from './webgpu-texture-upload.js';
import {mudSurfaceRecipe} from './webgpu-material-graph-catalog.js';
import {desertToonColor} from './webgpu-desert-toon.js';

// The material is shared by all chunks; each chunk owns only its geometry.
export async function createWebGpuMudMaterial({renderer,signal,imageLoader,fetchImpl=globalThis.fetch,environment=null,light=null,shadowNode=null}={}){
 if(typeof imageLoader!=='function'||typeof fetchImpl!=='function')throw TypeError('Invalid mud asset loader');
 if(environment!==null&&(!environment.day?.isNode||!environment.dark?.isNode||!environment.night?.isNode||!environment.blend?.isNode||!environment.light?.isNode)||light!==null&&!light?.isDirectionalLight||shadowNode!==null&&(!light||!shadowNode.isShadowNode||shadowNode.light!==light))throw TypeError('Invalid mud lighting');
 const response=await fetchImpl(assetUrl('/content/ground-materials.json'),{signal});if(!response.ok)throw Error('Mud material catalogue unavailable');const tile=(await response.json()).mangrove?.mudPatches;
 if(!tile||!['base','normal','arh'].every(role=>typeof tile[role]==='string'&&tile[role]))throw Error('Invalid mud material catalogue');
 const owned=[];let material=null,closed=false;
 const dispose=()=>{if(closed)return;closed=true;material?.dispose();for(const item of owned){item.texture.dispose();item.bitmap.close();}owned.length=0;};
 try{for(const role of ['base','normal','arh']){if(signal?.aborted)throw new DOMException('Mud material cancelled','AbortError');const bitmap=await imageLoader(assetUrl(tile[role]),{signal});if(signal?.aborted){bitmap.close();throw new DOMException('Mud material cancelled','AbortError');}const texture=new THREE.Texture(bitmap);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.flipY=false;texture.colorSpace=role==='base'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;await prepareWebGpuTexture({renderer,texture,signal,release(){texture.dispose();bitmap.close();}});owned.push({texture,bitmap});}
  const [map,normalMap,packed]=owned.map(item=>item.texture);material=new MeshStandardNodeMaterial({...mudSurfaceRecipe().structural.state,map,normalMap,roughnessMap:packed,aoMap:packed,color:new THREE.Color().setRGB(.58,.61,.64)});
  // The original scene applies AfricanToon to mud as an ordinary opaque
  // surface. Keep the authored maps and roughness while sharing its TSL grade.
  if(environment){const normal=normalize(normalWorld),view=normalize(cameraPosition.sub(positionWorld)),direction=normalize(reflect(view.negate(),normal)),uv=vec2(atan(direction.z,direction.x).div(2*Math.PI).add(.5),acos(clamp(direction.y,-1,1)).div(Math.PI)),day=environment.day.sample(uv).level(roughness.mul(7)).rgb.mul(4),dark=environment.dark.sample(uv).level(roughness.mul(7)).rgb.mul(4).add(vec3(.025,.045,.10)),reflected=mix(day,dark,environment.night).mul(environment.blend),visibility=light?(shadowNode??shadow(light)).r.mul(.93).add(.07):undefined,color=desertToonColor({albedo:diffuseColor.rgb,normal,view,sun:environment.light,roughness,visibility:visibility??vec3(1).x,night:environment.night,world:positionWorld,reflection:reflected});material.outputNode=vec4(pow(color.max(0),2.2),diffuseColor.a);}
  return {material,dispose};
 }catch(error){dispose();throw error;}
}
