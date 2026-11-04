import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {output,sRGBTransferOETF,toneMapping,uniform,vec4} from 'three/tsl';
import {Guardian3D} from '../../src/ui/guardian-3d.js';
import {GuardianVortexWebGPU} from './guardian-vortex-webgpu.js';

// Research-only material conversion. Keep the historical guardian shader's
// display-space blending for transparent vortex ribbons and motes.
export async function createGuardianWebGPU(canvas,{nativeOutput=false}={}){
 const renderer=new WebGPURenderer({canvas,alpha:true,antialias:true});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU backend unavailable');
 const materials=new Map(),exposure=uniform(1.15);
 const prepareModel=(root)=>root.traverse(object=>{if(!object.isMesh)return;const convert=source=>{if(!materials.has(source)){const node=renderer.library.fromMaterial(source);if(!node)throw Error('Unsupported guardian material '+source.type);if(!nativeOutput)node.outputNode=vec4(sRGBTransferOETF(toneMapping(THREE.ACESFilmicToneMapping,exposure,output.rgb)),output.a);materials.set(source,node);}return materials.get(source);};object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);});
 const actor=new Guardian3D(canvas,{renderer,createVortex:()=>new GuardianVortexWebGPU(),prepareModel});if(!nativeOutput){renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;}return actor;
}
