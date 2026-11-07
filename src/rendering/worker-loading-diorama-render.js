import * as THREE from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {assetUrl} from './asset-url.js';
import {createWebGpuCropRoster} from './webgpu-crop-roster.js';
import {createWebGpuNativeSky} from './webgpu-native-sky.js';
import {createWebGpuPipelineAdmission} from './webgpu-pipeline-admission.js';
import {createWebGpuLoadingBackdrop} from './webgpu-loading-backdrop.js';
import {createWebGpuLoadingMist} from './webgpu-loading-mist.js';
import {createWebGpuLoadingSparkles} from './webgpu-loading-sparkles.js';
import {createWebGpuLoadingSoil} from './webgpu-loading-soil.js';
import {createWebGpuLoadingFocus} from './webgpu-loading-focus.js';

let renderer,scene,camera,ground,roster,sky,backdrop,mist,sparkles,admission,soil,bitmap,focus,closed=false,lastSize='',visibleReady=false;
const state={plants:[],elapsed:0,day:1,time:0,biome:'sabana'};
function error(error){if(!closed)postMessage({kind:'error',message:String(error?.message??error)});}
async function initialize(canvas){
 renderer=new WebGPURenderer({canvas,antialias:false});await renderer.init();if(closed)return;if(!renderer.backend?.isWebGPUBackend)throw Error('WebGPU loading renderer unavailable');
 scene=new THREE.Scene();scene.background=new THREE.Color('#b8c4bf');camera=new THREE.PerspectiveCamera(40,1,.1,80);const sun=new THREE.DirectionalLight('#ffe2a8',3);sun.position.set(-30,55,25);scene.add(sun,new THREE.HemisphereLight('#ebf1d9','#765b3b',2));
 const placeholder=new OffscreenCanvas(1,1);placeholder.getContext('2d').fillStyle='#fff';placeholder.getContext('2d').fillRect(0,0,1,1);soil=new THREE.Texture(placeholder);soil.wrapS=soil.wrapT=THREE.RepeatWrapping;soil.flipY=false;soil.needsUpdate=true;
 focus=createWebGpuLoadingFocus({camera});ground=new THREE.Mesh(new THREE.PlaneGeometry(15,15,32,32),focus.configure(createWebGpuLoadingSoil(soil)));ground.rotation.x=-Math.PI/2;ground.position.y=.09;ground.visible=false;ground.updateMatrixWorld(true);scene.add(ground);
 admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error,includeShadowPass:false});sky=createWebGpuNativeSky({scene,pipelineAdmission:admission,onError:error});
 mist=createWebGpuLoadingMist({scene,camera,admission,onError:error});
 sparkles=createWebGpuLoadingSparkles({scene,admission,onError:error});
 backdrop=createWebGpuLoadingBackdrop({scene,camera,renderer,admission,onError:error});
 void admission.prepareAndPublish(ground,{shadowPass:false},()=>{if(!closed)ground.visible=true;}).catch(error);
 roster=createWebGpuCropRoster({scene,state,residency:{get:()=>ground},renderer,pipelineAdmission:admission,decorateMaterial:material=>focus.configure(material),onError:error});
 void roster.prepare().catch(error);
 void (async()=>{const response=await fetch(assetUrl('/content/ground-materials.json'));if(!response.ok)throw Error('Loading soil catalogue unavailable');const catalogue=await response.json(),image=await fetch(assetUrl(catalogue.canyons.base));if(!image.ok)throw Error('Loading soil unavailable');const loaded=await createImageBitmap(await image.blob());if(closed){loaded.close();return;}bitmap=loaded;soil.image=bitmap;soil.needsUpdate=true;})().catch(error);
 postMessage({kind:'ready'});
}
async function draw(data){if(!renderer||closed)return;const size=data.width+':'+data.height;if(size!==lastSize){renderer.setSize(data.width,data.height,false);lastSize=size;}camera.aspect=data.width/data.height;camera.fov=data.camera.fov;camera.position.fromArray(data.camera.position);camera.quaternion.fromArray(data.camera.quaternion);camera.updateProjectionMatrix();camera.updateMatrixWorld();state.elapsed=data.elapsed;state.biome=data.biome;state.day=data.day;state.time=data.time;state.plants=data.plants.map(plant=>({...plant,alive:true}));focus.update(state);sky.update(camera,state);backdrop.update(state);mist.update(state);sparkles.update(state,data.elapsed,data.reducedMotion===true);roster.sync();renderer.render(scene,camera);if(!visibleReady&&ground.visible&&sky.status().ready&&backdrop.status().ready&&mist.status().ready&&sparkles.status().ready&&roster.status().plants>=state.plants.length&&state.plants.length>0){visibleReady=true;postMessage({kind:'visible-ready'});}postMessage({kind:'frame'});}
self.onmessage=({data})=>{if(data?.kind==='initialize'){initialize(data.canvas).catch(error);return;}if(data?.kind==='frame')Promise.resolve().then(()=>draw(data)).catch(error);else if(data?.kind==='dispose'){closed=true;roster?.dispose();sky?.dispose();backdrop?.dispose();mist?.dispose();sparkles?.dispose();admission?.dispose();soil?.dispose();bitmap?.close();ground?.geometry.dispose();ground?.material.dispose();renderer?.dispose();close();}};
