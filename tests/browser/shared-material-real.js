import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSharedCharacterFallback} from '../../src/labs/shared-character-material.js';

const result={errors:[],models:[]};window.sharedMaterialRealResult=result;
try {
 const renderer=new WebGPURenderer({canvas:document.querySelector('#view'),antialias:false});
 await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('Expected WebGPU, got fallback');
 renderer.setSize(192,192,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const target=new THREE.RenderTarget(192,192,{depthBuffer:true,stencilBuffer:false});renderer.setRenderTarget(target);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x202020);scene.add(new THREE.HemisphereLight(0xe7f0e7,0x70624e,2));
 const sun=new THREE.DirectionalLight(0xfff0d4,3);sun.position.set(-6,12,9);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(35,1,.001,1000);camera.position.set(3,2,5);
 const manifest=await (await fetch('/tests/fixtures/character-lod-sources.json')).json(), loader=new GLTFLoader();
 const names=['guardian','hyena','lion','rhino','buffalo','warthog','olderMale','olderFemale','youngMale','youngFemale'];
 for(const name of names){
  const path='/'+manifest.find(item=>item.id===name).source.replace(/^public\//,''),asset=await loader.loadAsync(path),root=asset.scene;
  scene.add(root);root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const radius=Math.max(size.x,size.y,size.z,.01);camera.position.copy(center).add(new THREE.Vector3(1.5,1,2.5).normalize().multiplyScalar(radius*2.5));camera.near=radius/1000;camera.far=radius*20;camera.lookAt(center);camera.updateProjectionMatrix();
  const objects=[],banks=new Map();let sharedMeshes=0,totalMeshes=0;
  root.traverse(object=>{if(!object.isMesh)return;totalMeshes++;const original=object.material,source=Array.isArray(original)?original:[original];const fallback=source.map(item=>{const copy=item.clone();copy.normalMap=null;return copy;});object.material=Array.isArray(original)?fallback:fallback[0];objects.push({object,original,fallback:object.material,copies:fallback});});
  renderer.render(scene,camera);const baseline=Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target,0,0,192,192));
  for(const item of objects){const {object,original}=item;if(Array.isArray(original)||original.type!=='MeshStandardMaterial')continue;const key=[original.side,original.vertexColors,!!original.map].join(':');let bank=banks.get(key);if(!bank){const candidate=createSharedCharacterFallback(original);if(candidate.supports(object,original)){bank=candidate;banks.set(key,bank);}else candidate.dispose();}if(bank?.bind(object,original)){object.material=bank.material;sharedMeshes++;}}
  if(new URLSearchParams(location.search).get('perturb')==='1')for(const bank of banks.values())for(const item of objects){const parameters=bank.parameters(item.object);if(parameters)parameters.color.setRGB(0,0,0);}
  renderer.render(scene,camera);const actual=Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target,0,0,192,192));
  let absolute=0,max=0,changedPixels=0,changedOver5=0,objectPixels=0,objectAbsolute=0;
  for(let i=0;i<baseline.length;i+=4){let pixelMax=0,pixelSum=0;for(let c=0;c<3;c++){const d=Math.abs(baseline[i+c]-actual[i+c]);absolute+=d;pixelSum+=d;pixelMax=Math.max(pixelMax,d);max=Math.max(max,d);}if(pixelMax)changedPixels++;if(pixelMax>5)changedOver5++;if(baseline[i]!==baseline[0]||baseline[i+1]!==baseline[1]||baseline[i+2]!==baseline[2]){objectPixels++;objectAbsolute+=pixelSum;}}
  result.models.push({name,sharedMeshes,totalMeshes,meanAbsoluteRgb:absolute/(192*192*3),objectMeanAbsoluteRgb:objectAbsolute/(Math.max(objectPixels,1)*3),maxChannelDifference:max,changedPixels,changedOver5,objectPixels});
  const display=document.createElement('canvas');display.width=384;display.height=192;display.title=name;const ctx=display.getContext('2d');ctx.putImageData(new ImageData(new Uint8ClampedArray(baseline),192,192),0,0);ctx.putImageData(new ImageData(new Uint8ClampedArray(actual),192,192),192,0);document.querySelector('#comparisons').append(name,display,document.createElement('br'));
  scene.remove(root);for(const item of objects)for(const copy of item.copies)copy.dispose();for(const bank of banks.values())bank.dispose();
 }
 result.backend='WebGPU real';renderer.setRenderTarget(null);target.dispose();renderer.dispose();result.done=true;
}catch(error){result.errors.push(String(error?.stack??error));result.done=true;}
