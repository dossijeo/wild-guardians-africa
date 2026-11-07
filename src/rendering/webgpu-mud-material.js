import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {assetUrl} from './asset-url.js';
import {prepareWebGpuTexture} from './webgpu-texture-upload.js';
import {mudSurfaceRecipe} from './webgpu-material-graph-catalog.js';

// The material is shared by all chunks; each chunk owns only its geometry.
export async function createWebGpuMudMaterial({renderer,signal,imageLoader,fetchImpl=globalThis.fetch}={}){
 if(typeof imageLoader!=='function'||typeof fetchImpl!=='function')throw TypeError('Invalid mud asset loader');
 const response=await fetchImpl(assetUrl('/content/ground-materials.json'),{signal});if(!response.ok)throw Error('Mud material catalogue unavailable');const tile=(await response.json()).mangrove?.mudPatches;
 if(!tile||!['base','normal','arh'].every(role=>typeof tile[role]==='string'&&tile[role]))throw Error('Invalid mud material catalogue');
 const owned=[];let material=null,closed=false;
 const dispose=()=>{if(closed)return;closed=true;material?.dispose();for(const item of owned){item.texture.dispose();item.bitmap.close();}owned.length=0;};
 try{for(const role of ['base','normal','arh']){if(signal?.aborted)throw new DOMException('Mud material cancelled','AbortError');const bitmap=await imageLoader(assetUrl(tile[role]),{signal});if(signal?.aborted){bitmap.close();throw new DOMException('Mud material cancelled','AbortError');}const texture=new THREE.Texture(bitmap);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.flipY=false;texture.colorSpace=role==='base'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;await prepareWebGpuTexture({renderer,texture,signal,release(){texture.dispose();bitmap.close();}});owned.push({texture,bitmap});}
  const [map,normalMap,packed]=owned.map(item=>item.texture);material=new MeshStandardNodeMaterial({...mudSurfaceRecipe().structural.state,map,normalMap,roughnessMap:packed,aoMap:packed,color:new THREE.Color().setRGB(.58,.61,.64)});return {material,dispose};
 }catch(error){dispose();throw error;}
}
