import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {canonicalizeNodeBufferNames} from '../../src/labs/canonical-wgsl.js';
import {installExperimentalMorphPipelineKey} from '../../src/labs/morph-pipeline-key.js';

const result={errors:[],frames:[],morphMeshes:0,morphValues:0,pipelineKeys:0};window.morphPipelineVisualResult=result;
try{
 const renderer=new WebGPURenderer({canvas:document.querySelector('#view'),antialias:false});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('Expected WebGPU');
 const device=renderer.backend.device;device.addEventListener('uncapturederror',event=>result.errors.push('uncaptured: '+event.error.message));device.pushErrorScope('validation');
 if(new URLSearchParams(location.search).get('noCanonical')!=='1'){const pipelines=renderer._pipelines,original=pipelines.getForRender;pipelines.getForRender=function(object,...args){const state=object.getNodeBuilderState();state.vertexShader=canonicalizeNodeBufferNames(state.vertexShader);return original.call(this,object,...args);};}
 const query=new URLSearchParams(location.search),experimental=query.get('morphPipeline')==='1',zeroMorph=query.get('zeroMorph')==='1',repeats=Number(query.get('repeats')??1);if(!Number.isInteger(repeats)||repeats<1||repeats>5)throw Error('Invalid visual repeat count');if(experimental)installExperimentalMorphPipelineKey(renderer.backend,()=>result.pipelineKeys++);
 renderer.setSize(640,384,false);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.shadowMap.enabled=query.get('noShadows')!=='1';
 const target=new THREE.RenderTarget(640,384,{depthBuffer:true,stencilBuffer:false});renderer.setRenderTarget(target);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x202020);scene.add(new THREE.HemisphereLight(0xe7f0e7,0x70624e,2));const sun=new THREE.DirectionalLight(0xfff0d4,3);sun.position.set(-6,12,9);sun.castShadow=query.get('noShadows')!=='1';sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(25,18),new THREE.MeshStandardMaterial({color:0x777777}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const camera=new THREE.OrthographicCamera(-11,11,6.6,-6.6,.1,100);camera.position.set(0,9,23);camera.lookAt(0,0.8,0);
 const manifest=await (await fetch('/tests/fixtures/character-lod-sources.json')).json(),loader=new GLTFLoader(),actors=[];
 const names=query.get('sameSpecies')==='1'?Array(10).fill('warthog'):['guardian','hyena','lion','rhino','buffalo','warthog','olderMale','olderFemale','youngMale','youngFemale'];
 for(const [slot,name] of names.entries()){
  const path='/'+manifest.find(item=>item.id===name).source.replace(/^public\//,''),asset=await loader.loadAsync(path),model=asset.scene;
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.multiplyScalar(2.3/Math.max(size.x,size.y,size.z,.0001));box.setFromObject(model);model.position.x-=(box.min.x+box.max.x)/2;model.position.y-=box.min.y;model.position.z-=(box.min.z+box.max.z)/2;
  const root=new THREE.Group();root.add(model);root.position.set((slot%5-2)*4.2,0,slot<5?-2.2:2.2);scene.add(root);
  const morphs=[];root.traverse(object=>{if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}if(object.morphTargetInfluences?.length){morphs.push(object);result.morphMeshes++;result.morphValues+=object.morphTargetInfluences.length;}});
  const mixer=asset.animations.length?new THREE.AnimationMixer(model):null;if(mixer)mixer.clipAction(asset.animations[0]).play();actors.push({mixer,morphs});
 }
 if(query.get('settleShadows')==='1'){
  // Visual parity only: eliminate late first-use shadow preparation from the
  // comparison. This is not a loading strategy for the game.
  renderer.render(scene,camera);await device.queue.onSubmittedWorkDone();await renderer.compileAsync(scene,camera);
  if(sun.castShadow){if(!sun.shadow.map||typeof renderer.compileShadowAsync!=='function')throw Error('Shadow preparation unavailable');await renderer.compileShadowAsync(scene,scene,camera,sun);}
  await device.queue.onSubmittedWorkDone();result.shadowSettled=true;
 }
 for(const [frame,time] of [0,.25,.8,1.3].entries()){
  for(const [actorIndex,actor] of actors.entries()){actor.mixer?.setTime(time);for(const [meshIndex,mesh] of actor.morphs.entries())for(let i=0;i<mesh.morphTargetInfluences.length;i++)mesh.morphTargetInfluences[i]=(!zeroMorph&&(i+meshIndex+actorIndex+frame)%4===0)?0.25:0;}
  if(query.get('settleShadows')==='1'){renderer.render(scene,camera);await device.queue.onSubmittedWorkDone();}
  let pixels;const repeatHashes=[];for(let repeat=0;repeat<repeats;repeat++){renderer.render(scene,camera);const current=Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target,0,0,640,384)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',current))).map(v=>v.toString(16).padStart(2,'0')).join('');repeatHashes.push(hash);if(!pixels)pixels=current;}
  let nonBackground=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==pixels[0]||pixels[i+1]!==pixels[1]||pixels[i+2]!==pixels[2])nonBackground++;
  result.frames.push({time,sha256:repeatHashes[0],repeatHashes,nonBackground});const display=document.createElement('canvas');display.width=640;display.height=384;display.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),640,384),0,0);document.querySelector('#frames').append(display,document.createElement('br'));
 }
 await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();if(error)result.errors.push('validation: '+error.message);result.backend='WebGPU real';result.experimental=experimental;renderer.setRenderTarget(null);target.dispose();renderer.dispose();result.done=true;
}catch(error){result.errors.push(String(error?.stack??error));result.done=true;}
