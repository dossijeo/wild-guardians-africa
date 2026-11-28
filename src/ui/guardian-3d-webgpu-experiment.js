import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {output,sRGBTransferOETF,toneMapping,uniform,vec4} from 'three/tsl';
import {Guardian3D} from './guardian-3d.js';
import {GuardianVortexWebGPU} from '../rendering/guardian-vortex-webgpu.js';

// Research-only material conversion. Keep the historical guardian shader's
// display-space blending for transparent vortex ribbons and motes.
export async function createGuardianWebGPU(canvas,{nativeOutput=false,derivativeNormals=true,...guardianOptions}={}){
 const renderer=new WebGPURenderer({canvas,alpha:true,antialias:true});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');
 const materials=new Map(),exposure=uniform(1.15);
 const prepareModel=(root)=>root.traverse(object=>{
  if(!object.isMesh)return;
  const sources=Array.isArray(object.material)?object.material:[object.material],strip=derivativeNormals&&!!object.geometry.getAttribute('tangent')&&sources.some(source=>source.normalMap);
  if(strip){object.geometry=object.geometry.clone();object.geometry.deleteAttribute('tangent');}
  const convert=source=>{let variants=materials.get(source);if(!variants){variants=new Map();materials.set(source,variants);}const adjust=strip&&!!source.normalMap;
   if(!variants.has(adjust)){const node=renderer.library.fromMaterial(source);if(!node)throw Error('Unsupported guardian material '+source.type);if(adjust){node.normalScale=node.normalScale.clone();node.normalScale.y*=-1;}if(!nativeOutput)node.outputNode=vec4(sRGBTransferOETF(toneMapping(THREE.ACESFilmicToneMapping,exposure,output.rgb)),output.a);variants.set(adjust,node);}return variants.get(adjust);};
  object.material=Array.isArray(object.material)?sources.map(convert):convert(sources[0]);
 });
 const actor=new Guardian3D(canvas,{...guardianOptions,renderer,createVortex:()=>new GuardianVortexWebGPU(),prepareModel});if(!nativeOutput){renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;}return actor;
}
