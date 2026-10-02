import * as THREE from 'three';
import {buildContactData} from './contact-source.js';
import {nativeAssetSurface} from './asset-surface.js';

export function contactPrototypes(pack,prototypes){
 return pack.assets.map((asset,slot)=>{
  let min=asset.min,max=asset.max;
  if(!min||!max){const g=prototypes[slot][0].geometry;if(!g.boundingBox)g.computeBoundingBox();min=g.boundingBox.min.toArray();max=g.boundingBox.max.toArray();}
  return {group:nativeAssetSurface(pack,asset,slot).group,radius:Math.max(max[0]-min[0],max[2]-min[2])*.5};
 });
}

// One stable 64 KiB texture, rebuilt only when resident props or bounds change.
export class NativeContacts {
 constructor(){
  this.texture=new THREE.DataTexture(new Uint8Array(256*256).fill(255),256,256,THREE.RedFormat,THREE.UnsignedByteType);
  Object.assign(this.texture,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,wrapS:THREE.ClampToEdgeWrapping,wrapT:THREE.ClampToEdgeWrapping,generateMipmaps:false,unpackAlignment:1,needsUpdate:true});
  this.uniforms={uContactMap:{value:this.texture},uContactBounds:{value:new THREE.Vector4(0,0,1,1)},uContactOn:{value:1}};
  this.key=null;this.uploads=0;
 }
 update(chunks,prototypes,bounds,revision,layers){
  const key=JSON.stringify([revision,bounds,layers]);if(key===this.key)return false;
  const instances=Array.from({length:20},()=>[]);
  for(const group of chunks.values())for(let slot=0;slot<20;slot++)instances[slot].push(...group.userData.contactInstances[slot]);
  const data=buildContactData(prototypes,instances,bounds,layers);
  this.texture.image.data.set(data.pixels);this.texture.needsUpdate=true;this.uniforms.uContactBounds.value.fromArray(data.bounds);
  this.key=key;this.uploads++;return true;
 }
 dispose(){this.texture.dispose();this.uniforms.uContactOn.value=0;this.uniforms.uContactMap.value=null;this.key=null;}
}
