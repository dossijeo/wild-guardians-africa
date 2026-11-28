import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {prepareShadowDepthExperiment} from '../../tools/experiments/prepare-shadow-depth.js';
let referencePixels;

async function run(precompile,stageColor=false,holdShadow=false,stageTextures=false){
 const renderer=new THREE.WebGLRenderer();renderer.setSize(256,256);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(4,4,8);camera.lookAt(0,1,0);
 const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,8,4);light.castShadow=true;scene.add(light,new THREE.AmbientLight(0xffffff,.5));
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xb9ab82}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;scene.add(floor);
 const asset=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(ANIMAL_ACTIONS.animals.buffalo.url);
 const meshes=[];asset.scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.frustumCulled=false;meshes.push(m);}});scene.add(asset.scene);scene.updateMatrixWorld(true);
 if(new URLSearchParams(location.search).has('resize2048')){
  const seen=new Set();for(const mesh of meshes)for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))for(const value of Object.values(material))if(value?.isTexture&&!seen.has(value)&&value.image?.width>2048){seen.add(value);value.image=await createImageBitmap(value.image,{resizeWidth:2048,resizeHeight:2048,resizeQuality:'high'});value.needsUpdate=true;}
 }
 await renderer.compileAsync(scene,camera);const keys=()=>renderer.info.programs.map(p=>p.cacheKey),base=keys();
 let experiment=null,compileMs=0,compileWaitMs=0;
 if(precompile){
  const t=performance.now(),spans=[];experiment=await prepareShadowDepthExperiment(renderer,scene,camera,{onSubmit:span=>spans.push(span),nextFrame:async()=>{}});compileWaitMs=performance.now()-t;compileMs=spans.filter(s=>s.label==='loading-compile-submit'||s.label==='shadow-binding-preparation').reduce((sum,s)=>sum+s.duration,0);
 }
 const uploads=[];if(stageTextures){
  const textures=new Set();for(const mesh of meshes)for(const material of (Array.isArray(mesh.material)?mesh.material:[mesh.material]))for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  for(const texture of textures){const t=performance.now();renderer.initTexture(texture);uploads.push({name:texture.name,width:texture.image?.width??null,height:texture.image?.height??null,ms:performance.now()-t});await new Promise(requestAnimationFrame);}
 }
 let colorMs=0,colorPrograms=[];if(stageColor){
  if(holdShadow){asset.scene.visible=false;renderer.render(scene,camera);asset.scene.visible=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;}
  else renderer.shadowMap.enabled=false;
  const before=keys(),t=performance.now();renderer.render(scene,camera);colorMs=performance.now()-t;colorPrograms=keys().filter(k=>!before.includes(k));
  if(holdShadow){renderer.shadowMap.autoUpdate=true;renderer.shadowMap.needsUpdate=true;}else renderer.shadowMap.enabled=true;
 }
 const compiled=keys(),start=performance.now();renderer.render(scene,camera);const drawMs=performance.now()-start,after=keys();
 const pixels=new Uint8Array(256*256*4),context=renderer.getContext();context.readPixels(0,0,256,256,context.RGBA,context.UNSIGNED_BYTE,pixels);let pixelDifferences=0,maxChannelDifference=0;
 if(referencePixels)for(let i=0;i<pixels.length;i+=4){let different=false;for(let c=0;c<4;c++){const d=Math.abs(pixels[i+c]-referencePixels[i+c]);maxChannelDifference=Math.max(maxChannelDifference,d);different||=d!==0;}if(different)pixelDifferences++;}else referencePixels=pixels;
 const depth=k=>k.startsWith('depth,');const added=(a,b)=>b.filter(k=>!a.includes(k));
 const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');const result={precompile,stageColor,holdShadow,stageTextures,uploads,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),meshes:meshes.length,compileMs,compileWaitMs,colorMs,colorPrograms:colorPrograms.length,drawMs,pixelDifferences,maxChannelDifference,preparedDepth:added(base,compiled).filter(depth),drawDepth:added(compiled,after).filter(depth),otherDrawPrograms:added(compiled,after).filter(k=>!depth(k)).length};
 experiment?.dispose();renderer.dispose();return result;
}
try{const params=new URLSearchParams(location.search),staged=params.has('stageColor'),hold=params.has('holdShadow'),textures=params.has('stageTextures');window.shadowPreparationResult=textures?[await run(false,staged,hold,false),await run(false,staged,hold,true),await run(false,staged,hold,true),await run(false,staged,hold,false)]:[await run(false,staged,hold),await run(true,staged,hold),await run(true,staged,hold),await run(false,staged,hold)];}catch(e){window.shadowPreparationError=e.stack??String(e);}
