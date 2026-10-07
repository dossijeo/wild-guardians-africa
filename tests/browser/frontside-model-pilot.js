import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {assetUrl} from '../../src/rendering/asset-url.js';
import {createCropBatch} from '../../src/rendering/crop-batch.js';
import {cropSpec} from '../../src/simulation/rules.js';
import {syncWorkerToolVisibility} from '../../src/rendering/worker-tool-visibility.js';
import {sampleFixedPose} from '../../src/rendering/fixed-pose.js';
const status=document.querySelector('#status'),run=document.querySelector('#run');
let cancelled=false,renderer=null;
document.querySelector('#stop').onclick=()=>{cancelled=true;renderer?.dispose();renderer?.forceContextLoss();status.textContent+='\nGPU liberada.';};
run.onclick=async()=>{run.disabled=true;cancelled=false;try{await campaign();}catch(error){status.textContent=error.stack;run.disabled=false;}};
async function campaign(){
 renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true});renderer.setSize(256,256);renderer.setPixelRatio(1);renderer.setClearColor(0,0);document.querySelector('#view').replaceChildren(renderer.domElement);
 const workerOnly=new URLSearchParams(location.search).has('worker1024'),size=workerOnly?1024:256;
 renderer.setSize(size,size);
 const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
 const report={status:'SELECTION_ONLY_NOT_APPROVED',three:THREE.REVISION,resolution:size,workerOnly,fragment:'RGBA triangle IDs; alpha255 front-facing/128 back-facing; linear target, no tone/color transform',camera:'Orthographic 8 azimuths ×3 elevations (-15,25,85), local box fit',gpu:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),cpuContext:'49032/39340 frozen. Far58872 finished at worker1024 rerun. No GPU timing/performance claim.',cases:[],selected:{},limitations:['Visibility selection only; real color/maps/shadows and1024px held-out views remain required.','No animation/bridge acceptance is inferred.']};
 const target=new THREE.WebGLRenderTarget(size,size,{format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true});
 const pixels=new Uint8Array(size*size*4),camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);
 let nextId=1;const descriptors=[];
 const patch=(mesh,sourceName,sourceFaces=null,respectAuthoredSide=false)=>{
  const old=mesh.geometry,geometry=old.index?old.toNonIndexed():old.clone();
  if(old.getAttribute('iGrowth'))geometry.setAttribute('iGrowth',old.getAttribute('iGrowth'));
  if(old.getAttribute('iBridge'))geometry.setAttribute('iBridge',old.getAttribute('iBridge'));
  const count=geometry.getAttribute('position').count,ids=new Float32Array(count),start=nextId;
  for(let i=0;i<count;i++)ids[i]=start+Math.floor(i/3);nextId+=count/3;
  geometry.setAttribute('pilotFaceId',new THREE.BufferAttribute(ids,1));mesh.geometry=geometry;
  // Three Material.clone does not carry onBeforeCompile; capture the authored
  // closure before cloning so the growth and bridge deformation stays active.
  const original=mesh.material.onBeforeCompile,material=mesh.material=mesh.material.clone();
  const authoredSide=material.side;material.side=respectAuthoredSide?authoredSide:THREE.DoubleSide;material.transparent=false;material.depthWrite=true;material.alphaTest=0;
  material.onBeforeCompile=shader=>{original?.(shader);shader.vertexShader='attribute float pilotFaceId;varying float vPilotFaceId;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPilotFaceId=pilotFaceId;');
   // Bridge patches replace begin_vertex; assign before main body instead.
   if(!shader.vertexShader.includes('vPilotFaceId=pilotFaceId;'))shader.vertexShader=shader.vertexShader.replace('void main() {','void main() { vPilotFaceId=pilotFaceId;');
   shader.fragmentShader='precision highp float; varying float vPilotFaceId; void main(){float id=floor(vPilotFaceId+.5);gl_FragColor=vec4(mod(id,256.0),mod(floor(id/256.0),256.0),floor(id/65536.0),gl_FrontFacing?255.0:128.0)/255.0;}';};
  material.customProgramCacheKey=()=>`pilot-id-${sourceName}`;
  descriptors.push({start,end:nextId,name:sourceName,sourceFaces,effectiveSide:material.side});
 };
 const select=async(scene,center,radius,label)=>{
  camera.left=camera.bottom=-radius*1.08;camera.right=camera.top=radius*1.08;camera.updateProjectionMatrix();
  let backPixels=0;const selected=new Set();
  for(const elevation of [-15,25,85])for(let az=0;az<8;az++){
   if(cancelled)throw Error('Cancelled');const a=az*Math.PI/4,e=elevation*Math.PI/180;
   camera.position.copy(center).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(radius*4));camera.lookAt(center);camera.updateMatrixWorld();
   renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
   for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]===128){const id=pixels[i]+256*pixels[i+1]+65536*pixels[i+2];selected.add(id);backPixels++;}
   renderer.setRenderTarget(null);renderer.render(scene,camera);
   await new Promise(requestAnimationFrame);
  }
  for(const id of selected){const d=descriptors.find(d=>id>=d.start&&id<d.end);if(!d)throw Error('Unknown face ID '+id);const face=d.sourceFaces?.[id-d.start]??id-d.start;const key=d.name;
   (report.selected[key]??=new Set()).add(face);}
  report.cases.push({label,selectedIds:selected.size,backPixels});status.textContent=`${report.cases.length} estados completados: ${label}\nReversos visibles ${selected.size}. Sin timings GPU.`;
 };
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 if(!workerOnly){
 const models=await fetch('/content/models.json').then(r=>r.json()),bridges=await fetch('/content/crop-bridges.json').then(r=>r.json());
 const crops=await loader.loadAsync(assetUrl(models.find(m=>m.source.includes('Cultivos')).url)),scene=new THREE.Scene();
 const batch=createCropBatch(scene,renderer,crops,bridges,2);
 scene.traverse(mesh=>{if(!mesh.isMesh)return;let faces=null,name=mesh.name;
  if(name.startsWith('puente_')){const [,species,a,b]=name.split('_'),meta=crops.scene.children.find(n=>n.userData.crop===species&&n.userData.stage===Number(a))?.userData;
   if(meta){const ai=meta.cropIndex*5+Number(a)-1,bi=ai+1;faces=[...Array(bridges.models[ai].faces).keys()].map(i=>`${ai}:${i}`).concat([...Array(bridges.models[bi].faces).keys()].map(i=>`${bi}:${i}`));name='bridgeSource';}}
  patch(mesh,name,faces);
 });
 for(const species of workerOnly?[]:['maiz','platano']){
  // Include five endpoints and three interior samples for all four transitions.
  const marks=[.065,.27,.53,.78,1],values=[0,...marks];
  for(let stage=0;stage<4;stage++){const width=Math.min(.34,2/((marks[stage+1]-marks[stage])*cropSpec(species).growth_seconds));for(const t of [.25,.5,.75])values.push(marks[stage]+(marks[stage+1]-marks[stage])*(.81-width*.5+width*t));}
  for(const growth of values){const plant={id:'1',species,x:0,z:0,growth:growth*cropSpec(species).growth_seconds};batch.update([plant],1,()=>0);
   const height=batch.sample(species,plant.growth).height;await select(scene,new THREE.Vector3(0,height*.5,0),Math.max(.65,height*.7),`crop/${species}/${growth}`);}
 }
 batch.dispose();
 }
 const workers=await fetch('/content/worker-actions.json').then(r=>r.json()),worker=await loader.loadAsync(assetUrl(workers.youngMale.url)),workerScene=new THREE.Scene();workerScene.add(worker.scene);
 worker.scene.traverse(mesh=>{if(mesh.isMesh)patch(mesh,'worker/'+mesh.name,null,true);});
 const mixer=new THREE.AnimationMixer(worker.scene);const data={model:worker.scene,mixer};
 for(const clip of worker.animations)for(const fraction of [0,.25,.5,.75,1]){
  mixer.stopAllAction();const action=mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();action.clampWhenFinished=true;action.paused=true;data.action=action;sampleFixedPose(data,clip.duration*fraction,true);syncWorkerToolVisibility(data,true);worker.scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(worker.scene),center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()*.5;await select(workerScene,center,radius,`worker/${clip.name}/${fraction}`);
 }
 report.descriptors=descriptors.map(d=>({name:d.name,start:d.start,end:d.end,effectiveSide:d.effectiveSide}));for(const [name,faces] of Object.entries(report.selected))report.selected[name]=[...faces].sort((a,b)=>typeof a==='number'?a-b:String(a).localeCompare(String(b)));
 report.capturePng=renderer.domElement.toDataURL('image/png');
 const response=await fetch('/__frontside_report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(await response.text());
 target.dispose();renderer.dispose();renderer.forceContextLoss();status.textContent=`Selección guardada: ${report.cases.length} estados, ${Object.keys(report.selected).length} mallas con reversos expuestos. GPU liberada. NO aprobado.`;
}
