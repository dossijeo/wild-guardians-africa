import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSharedCharacterFallback} from '../../src/labs/shared-character-material.js';

const result={errors:[],models:[]};window.materialCoverageResult=result;
try {
 const renderer=new WebGPURenderer({canvas:document.querySelector('#view'),antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('Expected WebGPU');
 renderer.setSize(192,192,false);renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 const target=new THREE.RenderTarget(192,192,{depthBuffer:true,stencilBuffer:false});renderer.setRenderTarget(target);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);const camera=new THREE.PerspectiveCamera(35,1,.001,1000);
 const manifest=await (await fetch('/tests/fixtures/character-lod-sources.json')).json(),loader=new GLTFLoader();
 const names=['guardian','hyena','lion','rhino','buffalo','warthog','olderMale','olderFemale','youngMale','youngFemale'];
 for(const name of names){
  const path='/'+manifest.find(item=>item.id===name).source.replace(/^public\//,''),asset=await loader.loadAsync(path),root=asset.scene;scene.add(root);root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,.01),banks=new Map(),masks=[],reasons={},physical=[];let sharedMeshes=0,totalMeshes=0;
  root.traverse(object=>{if(!object.isMesh)return;totalMeshes++;const original=object.material,materials=Array.isArray(original)?original:[original];let eligible=false;
   if(!Array.isArray(original)&&original.type==='MeshStandardMaterial'){const key=[original.side,original.vertexColors,!!original.map].join(':');let bank=banks.get(key);if(!bank){const candidate=createSharedCharacterFallback(original);if(candidate.supports(object,original)){bank=candidate;banks.set(key,bank);}else candidate.dispose();}eligible=!!bank?.supports(object,original);}
   if(eligible)sharedMeshes++;else for(const material of materials){const entries=[material.type];for(const key of ['normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','transparent','alphaTest','vertexColors'])if(material[key])entries.push(key);const recipe=entries.join('+');reasons[recipe]=(reasons[recipe]??0)+1;if(material.isMeshPhysicalMaterial)physical.push({name:material.name,clearcoat:material.clearcoat,transmission:material.transmission,sheen:material.sheen,iridescence:material.iridescence,anisotropy:material.anisotropy,dispersion:material.dispersion,ior:material.ior,specularIntensity:material.specularIntensity,specularColor:material.specularColor?.getHexString(),roughness:material.roughness,metalness:material.metalness,maps:entries.slice(1)});}
   const mask=materials.map(material=>new THREE.MeshBasicMaterial({color:eligible?0xff0000:0x00ff00,side:material.side,depthTest:material.depthTest,depthWrite:material.depthWrite,visible:material.visible}));object.material=Array.isArray(original)?mask:mask[0];masks.push(...mask);
  });
  const views=[];const directions=[[1,0.5,1],[-1,0.5,1],[-1,0.5,-1],[1,0.5,-1]];
  for(const direction of directions){camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(radius*2.5));camera.near=radius/1000;camera.far=radius*20;camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);const pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,192,192);let sharedPixels=0,otherPixels=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]>200&&pixels[i+1]<10)sharedPixels++;if(pixels[i+1]>200&&pixels[i]<10)otherPixels++;}const foreground=sharedPixels+otherPixels;views.push({direction,sharedPixels,otherPixels,sharedPercent:foreground?100*sharedPixels/foreground:0});const display=document.createElement('canvas');display.width=192;display.height=192;display.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),192,192),0,0);document.querySelector('#comparisons').append(display);}
  document.querySelector('#comparisons').append(' '+name,document.createElement('br'));result.models.push({name,sharedMeshes,totalMeshes,reasons,physical,views});scene.remove(root);for(const mask of masks)mask.dispose();for(const bank of banks.values())bank.dispose();
 }
 result.backend='WebGPU real';renderer.setRenderTarget(null);target.dispose();renderer.dispose();result.done=true;
}catch(error){result.errors.push(String(error?.stack??error));result.done=true;}
