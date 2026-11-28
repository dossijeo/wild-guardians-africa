import * as T from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createRemoteWebGpu} from '../../src/rendering/remote-webgpu-client.js';
import {installRemoteClockBindings} from '../../src/rendering/remote-clock-bindings.js';
import {installRemoteTexturePreparation} from '../../src/rendering/remote-texture-preparation.js';
import {installWebGpuTextureBindingInitialization} from '../../src/rendering/webgpu-texture-binding-initialization.js';
import {createWebGpuPipelineAdmission} from '../../src/rendering/webgpu-pipeline-admission.js';
import {createWebGpuTerrainResidency} from '../../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../../src/rendering/confirmed-terrain-support.js';
import {createNativeGpuMotion} from '../../src/rendering/native-gpu-motion.js';
import {bindWebGpuActorMotion} from '../../src/rendering/webgpu-actor-motion-binding.js';
import {createWebGpuWorkerBank} from '../../src/rendering/webgpu-worker-bank.js';
import {createWebGpuConfirmedWorker} from '../../src/rendering/webgpu-confirmed-worker.js';
import {createBakedWorkerWalkBank} from '../../src/rendering/baked-worker-walk-catalog.js';

const now=()=>performance.timeOrigin+performance.now();
let remote,renderer,actor,motion,bank,bakes,binding,residency,terrain,admission,clockBindings,texturePreparation,textureBindings,ground,initialRig,supportDiagnostic,dependencyDiff,projectNativeFoot;
const clockBuffers=[],factories={};
function counts(){return {...factories};}
function rig(){const nodes=[];actor.root.traverse(node=>{if(node===actor.root||node.isBone)nodes.push([node.name,...node.position.toArray(),...node.quaternion.toArray(),...node.scale.toArray()]);});return JSON.stringify(nodes);}
self.onmessage=async({data})=>{try{
 if(data.kind==='initialize'){
  remote=await createRemoteWebGpu({port:data.port,onError:error=>postMessage({kind:'failure',message:String(error.stack??error)})});
  postMessage({kind:'device-ready'});return;
 }
 if(data.kind==='start'){
  for(const name of ['createBuffer','createTexture','createSampler','createBindGroup','createBindGroupLayout','createPipelineLayout','createShaderModule','createRenderPipeline','createRenderPipelineAsync','createComputePipeline','createComputePipelineAsync']){const original=remote.device[name];if(typeof original==='function'){factories[name]=0;remote.device[name]=function(...args){factories[name]++;return original.apply(this,args);};}}
  renderer=new WebGPURenderer({canvas:new OffscreenCanvas(640,360),antialias:false,device:remote.device,context:remote.context});await renderer.init();renderer.setSize(640,360,false);renderer.outputColorSpace=T.LinearSRGBColorSpace;
  texturePreparation=installRemoteTexturePreparation(renderer,remote);textureBindings=installWebGpuTextureBindingInitialization(renderer);
  clockBindings=installRemoteClockBindings(renderer,{registerClockBinding(buffer,reference){clockBuffers.push({buffer:buffer.__remoteGpuId,...reference});remote.registerClockBinding(buffer,reference);}});
  const scene=new T.Scene();scene.background=new T.Color('#334651');scene.add(new T.HemisphereLight(0xffffff,0x665544,2));const sun=new T.DirectionalLight(0xffeed2,3);sun.position.set(-20,45,20);scene.add(sun);
  ground=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide});residency=createWebGpuTerrainResidency({scene,material:ground});
  for(const chunk of data.chunks)residency.replace(chunk,1,'native-character');
  const start=data.route.rows,center={x:(start[1]+start.at(-15))*.5,z:(start[2]+start.at(-14))*.5},y=residency.surface(center.x,center.z),camera=new T.PerspectiveCamera(35,640/360,.1,150);camera.position.set(center.x+1,y+10,center.z+19);camera.lookAt(center.x,y+1,center.z);camera.updateMatrixWorld();projectNativeFoot=pose=>{if(!pose)return null;const point=new T.Vector3(pose.x,residency.surface(pose.x,pose.z)+.025,pose.z).project(camera);return {x:(point.x+1)*320,y:(1-point.y)*180};};
  admission=createWebGpuPipelineAdmission({renderer,scene,camera,onFatal:error=>postMessage({kind:'failure',message:String(error.stack??error)})});
  // Certify after the existing terrain admission has completed Three's index
  // normalization. Its buffer identity checks remain strict thereafter.
  await admission.prepare(scene);await admission.completePreparation();
  const clock={version:1,epoch:0,elapsed:data.route.startTime,safeUntil:data.route.endTime,anchorAbsoluteMs:now(),paused:false,segments:[{start:data.route.startTime,end:data.route.endTime,rate:1,realDuration:data.route.endTime-data.route.startTime}]};
  // Product bootstrap already has a world frame/depth target before a native
  // assignment is prepared. Exercise the same order with an explicit baseline.
  remote.beginFrame({clock,nativeWorldBoundary:data.route.worldBoundary});renderer.render(scene,camera);await remote.endFrame();
  terrain=createConfirmedTerrainSupport({residency});const support=terrain.prepareNativeRoute(data.route,{terrainManifest:{epoch:'native-character',chunks:data.chunks.map(c=>({cx:c.cx,cz:c.cz,revision:1}))}});if(!support?.valid())throw Error('Native character terrain support unavailable');{const mesh=residency.get(0,0),geometry=mesh.geometry,p=geometry.attributes.position,i=geometry.index,a=p.array,b=i.array,pv=p.version,iv=i.version;dependencyDiff=()=>({sameGeometry:mesh.geometry===geometry,samePosition:geometry.attributes.position===p,sameIndex:geometry.index===i,samePositionArray:p.array===a,sameIndexArray:i.array===b,positions:[pv,p.version],indices:[iv,i.version],indexType:[b.constructor.name,i.array.constructor.name]});}supportDiagnostic=()=>terrain.audit({trace:{terrainManifest:{epoch:'native-character',chunks:data.chunks.map(c=>({cx:c.cx,cz:c.cz,revision:1}))},actors:[{actorId:support.actor.actorId,start:{x:data.route.rows[1],z:data.route.rows[2]},end:{x:data.route.rows.at(-15),z:data.route.rows.at(-14)}}]}});
  bank=createWebGpuWorkerBank({renderer});bakes=createBakedWorkerWalkBank({renderer});
  const phases={resolve:(fallback,clip)=>motion.resolve(fallback,clip)};
  actor=await createWebGpuConfirmedWorker({scene,residency,state:data.state,actorId:data.state.workers[0].id,assetBank:bank,renderer,phaseSource:phases});
  const textureDeadline=performance.now()+30000;while(!bank.status().profiles.every(profile=>profile.textured)){if(bank.status().textureFailure||performance.now()>textureDeadline)throw Error('Original worker textures not prepared '+JSON.stringify(bank.status()));bank.tick(now());await new Promise(resolve=>setTimeout(resolve,16));}bank.tick(now());
  const yaw=new T.Euler().setFromQuaternion(actor.root.getWorldQuaternion(new T.Quaternion()),'YXZ').y;
  motion=createNativeGpuMotion({actorId:data.state.workers[0].id,support,anchorYaw:yaw,heightOffset:.025});
  binding=bindWebGpuActorMotion({root:actor.root,renderer,motion,actorId:data.state.workers[0].id,getPickTime:()=>data.route.startTime});
  const bake=await bakes.get(data.state.workers[0].profile);if(await actor.installBakedWalk(bake,{pipelineAdmission:admission,motionBinding:binding})!==true||!actor.isBakedWalking())throw Error('Original worker walking bake not installed');
  await admission.prepare(scene);await admission.completePreparation();initialRig=rig();
  const before=counts();remote.beginFrame({clock,nativeWorldBoundary:data.route.worldBoundary});renderer.render(scene,camera);await remote.endFrame();const firstRenderFactories=Object.fromEntries(Object.entries(counts()).map(([name,count])=>[name,count-(before[name]??0)]));
  if(Object.values(firstRenderFactories).some(Boolean))throw Error('Late native character factories '+JSON.stringify(firstRenderFactories));
  postMessage({kind:'drawing',firstRenderFactories,assets:bank.status(),motion:motion.status(),clockBuffers,profile:data.state.workers[0].profile,rigNodes:JSON.parse(initialRig).length,preparingClock:motion.clockNode.value});return;
 }
 if(data.kind==='block'){
  const start=now();postMessage({kind:'block-start',id:data.id,start});while(now()-start<500){}postMessage({kind:'block-end',id:data.id,start,end:now()});return;
 }
 if(data.kind==='inspect'){
  postMessage({kind:'inspection',id:data.id,projectedFoot:projectNativeFoot(data.nativePose),execution:await remote.inspectAsync(),rigUnchanged:rig()===initialRig,preparingClock:motion.clockNode.value,valid:motion.valid(),supportDiagnostic:motion.valid()?null:{...supportDiagnostic(),dependencyDiff:dependencyDiff()},clockBuffers});return;
 }
 if(data.kind==='dispose'){
  binding?.dispose();actor?.dispose();motion?.dispose();bakes?.dispose();bank?.dispose();terrain?.dispose();residency?.dispose();admission?.dispose();clockBindings?.dispose();texturePreparation?.dispose();textureBindings?.dispose();ground?.dispose();renderer?.dispose();remote?.dispose();close();return;
 }
 throw Error('Unknown native GPU character request');
}catch(error){postMessage({kind:'failure',message:String(error.stack??error)});}};
