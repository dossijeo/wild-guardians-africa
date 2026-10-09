// Existing-product smoke probe only. No renderer/context/asset owner is created.
import * as THREE from 'three';
import {installWorkerFrontsidePilot,workerFrontsideNames} from '../../tools/lib/worker-frontside-pilot.mjs';
import {sampleFixedPose} from './fixed-pose.js';
import {syncWorkerToolVisibility} from './worker-tool-visibility.js';

export const WORKER_QA_SOURCE='25e4ab988c87419007f185c956970b3329e7379e9fab4bcbe6851cb1e81de238';
export const WORKER_QA_CANDIDATE='3ac771a241023c3ec68df0ffdaeeb4d9c83f6380b4205a5000b17f751c15f2c7';
export function workerQaEnabled(host=globalThis){return host.__desktopSmokeStarted===true&&host.__desktopSmokeWorkerQa===true&&typeof host.__TAURI_INTERNALS__?.invoke==='function';}
export function workerQaCases(){const clips=['Idle','Walk_Skip','Run','Wave','Dig','Plant','Water','Harvest','Carry_Crate','Alert','Hit','Fall'];return clips.flatMap(clip=>[.125,.625].flatMap(fraction=>[false,true].map(night=>({clip,fraction,night,azimuth:fraction===.125?45:225,elevation:35}))));}

// Mutation boundary: native actor adoption BEFORE root.add(model) triggers the
// registry. Clone raw source hooks once; AfricanToon decorates source/candidate
// independently. Never clone an already decorated material silently.
export function prepareWorkerQaMaterials(world,rig,gltf,descriptor){
 if(descriptor.sha256!==WORKER_QA_SOURCE)throw Error('Worker QA source SHA mismatch');
 const expected=new Map(workerFrontsideNames.map((name,i)=>[name,[5,6,7,2,3][i]]));
 const seen=new Set();rig.model.traverse(mesh=>{if(!expected.has(mesh.name))return;
  if(world.toon.materials.has(mesh.material))throw Error('QA alias must precede source toon decoration');
  if(gltf.parser.associations.get(mesh.material)?.materials!==expected.get(mesh.name))throw Error('Worker QA source material association mismatch');seen.add(mesh.name);
 });if(seen.size!==5)throw Error('Missing QA worker primitives');
 const pilot=installWorkerFrontsidePilot(rig.model);pilot.setEnabled(false);return pilot;
}

export class WorkerDesktopQa {
 constructor(world){this.world=world;this.active=false;this.disposed=false;this.rig=null;this.pilot=null;this.binding=spec=>this.start(spec);globalThis.__desktopSmokeWorkerProbe=this.binding;}
 adopt(rig,gltf,descriptor){if(this.rig||rig.profile!=='youngMale')return;this.pilot=prepareWorkerQaMaterials(this.world,rig,gltf,descriptor);this.rig=rig;}
 cancelAdoption(rig){if(this.rig!==rig)return;this.pilot?.release();this.pilot=null;this.rig=null;}
 start(spec={}){
  if(this.active||this.disposed||!this.rig||this.pilot?.released)throw Error('Worker QA rig unavailable or busy');
  if(spec.mode&&spec.mode!=='visual')throw Error('Only non-timing visual/ownership mode is reviewed in this source');
  const cases=workerQaCases(),limit=spec.limit??cases.length;if(!Number.isInteger(limit)||limit<1||limit>cases.length)throw Error('Invalid worker QA sample limit');
  const w=this.world;if(!w.actorsReady()||w.loadingProgress&&!w.loadingProgress.ready)throw Error('Worker QA before genuine readiness');
  const renderer=w.renderer,gl=renderer.getContext();if(gl.isContextLost())throw Error('Lost worker QA context');
  const materials=this.pilot.entries.map(e=>e.geometry),attributes=materials.map(g=>({...g.attributes}));
  const action=this.rig.action,nodeTransforms=[];this.rig.model.traverse(node=>nodeTransforms.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),visible:node.visible}));
  this.saved={state:JSON.stringify(w.state),time:w.state.time,elapsed:w.state.elapsed,day:w.state.day,camera:w.camera.clone(),target:w.controls.target.clone(),controlsEnabled:w.controls.enabled,nodeTransforms,rigName:this.rig.name,action,actionState:action?{time:action.time,loop:action.loop,repetitions:action.repetitions,paused:action.paused,enabled:action.enabled,weight:action.weight,clampWhenFinished:action.clampWhenFinished}:null,
   renderTarget:renderer.getRenderTarget(),cubeFace:renderer.getActiveCubeFace(),mipLevel:renderer.getActiveMipmapLevel(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadowEnabled:renderer.shadowMap.enabled,geometries:materials,attributes};
  w.controls.enabled=false;this.spec=spec;this.cases=cases.slice(0,limit);this.caseIndex=0;this.arm=0;this.row=[];this.report={schema:'DESKTOP_WORKER_NATIVE_QA_V1',policy:3,sourceSha256:WORKER_QA_SOURCE,candidateSha256:WORKER_QA_CANDIDATE,
   runtimeTreatment:'Five metadata material aliases, plus explicit preserved DOUBLE_SIDED/TBN recipe; not default candidate-loader equivalence',samples:[],renderer:{width:w.canvas.width,height:w.canvas.height,pixelRatio:renderer.getPixelRatio(),contextAttributes:gl.getContextAttributes()},gpuTiming:false,errors:[],cleanup:{closed:false}};
  this.borrowedDisposed=0;this.borrowedEvents=[];for(const resource of new Set(this.pilot.entries.flatMap(e=>[e.geometry,e.source]))){const callback=()=>this.borrowedDisposed++;resource.addEventListener('dispose',callback);this.borrowedEvents.push([resource,callback]);}
  this.active=true;return new Promise(resolve=>this.resolve=resolve);
 }
 frame(){if(!this.active)return false;const w=this.world;try{
  if(w.disposed||w.loading.signal.aborted||document.hidden||w.renderer.getContext().isContextLost())throw Error('Worker QA cancelled: world/visibility/context');
  const pose=this.cases[this.caseIndex],candidate=this.arm===2;w.state.time=pose.night?450:150;
  const center=this.rig.model.parent.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0)),az=THREE.MathUtils.degToRad(pose.azimuth),el=THREE.MathUtils.degToRad(pose.elevation);w.controls.target.copy(center);w.camera.position.copy(center).add(new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).multiplyScalar(5));w.camera.lookAt(center);w.camera.updateMatrixWorld();
  // App RAF owns this call exclusively. Keep production frame updates, then
  // select one baked pose before its one original drawRenderFrame invocation.
  for(const step of w.renderFrameUpdates(0)){};
  this.pilot.setEnabled(candidate);for(const entry of this.pilot.entries){const side=this.spec.shadowFront?THREE.FrontSide:THREE.DoubleSide;if(entry.candidate.shadowSide!==side){entry.candidate.shadowSide=side;entry.candidate.needsUpdate=true;}w.materialRegistry.refresh(entry.mesh);}
  const rig=this.rig,clip=rig.clips.find(c=>c.name===pose.clip);if(!clip)throw Error('Missing native clip '+pose.clip);
  rig.action?.stop();rig.action=rig.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();rig.action.paused=true;rig.action.clampWhenFinished=true;sampleFixedPose(rig,clip.duration*pose.fraction,true);syncWorkerToolVisibility(rig,true);rig.model.updateWorldMatrix(true,true);
  // Camera target drives the original shared shadow projection on next native
  // update; explicitly invalidate its cache, never replace the shadow renderer.
  w.releaseNativeShadow.cache.invalidate();w.drawRenderFrame();
  const gl=w.renderer.getContext(),pixels=new Uint8Array(w.canvas.width*w.canvas.height*4);gl.readPixels(0,0,w.canvas.width,w.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  this.row.push({arm:candidate?'candidate':this.arm===1?'original-repeat':'original',pixels,capture:w.canvas.toDataURL('image/png'),camera:{position:w.camera.position.toArray(),quaternion:w.camera.quaternion.toArray(),target:w.controls.target.toArray()},materialSides:this.pilot.entries.map(e=>({mesh:e.mesh.name,color:e.mesh.material.side,shadow:e.mesh.material.shadowSide,doubleDefine:Object.hasOwn(e.mesh.material.defines??{},'DOUBLE_SIDED')}))});
  if(++this.arm===3){const [source,repeat,result]=this.row,diagnostic=(a,b)=>{let changed=0,max=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);changed+=delta>0;max=Math.max(max,delta);}return {changedChannels:changed,maxChannelDelta:max,acceptance:'diagnostic-only'};};
   this.report.samples.push({...pose,controls:diagnostic(source.pixels,repeat.pixels),candidateDiagnostic:diagnostic(source.pixels,result.pixels),arms:this.row.map(({pixels,...entry})=>entry)});this.row=[];this.arm=0;if(++this.caseIndex===this.cases.length)this.finish();
  }
 }catch(error){this.report.errors.push(String(error.stack??error));this.finish();}return true;}
 finish(){if(!this.active)return;this.active=false;const w=this.world,s=this.saved,errors=this.report.cleanup.errors=[];
  for(const restore of [()=>{this.pilot.setEnabled(false);for(const e of this.pilot.entries)w.materialRegistry.refresh(e.mesh);},()=>{w.state.time=s.time;w.state.elapsed=s.elapsed;w.state.day=s.day;},()=>{w.camera.copy(s.camera);w.controls.target.copy(s.target);w.controls.enabled=s.controlsEnabled;},()=>w.renderer.setRenderTarget(s.renderTarget,s.cubeFace,s.mipLevel),()=>w.renderer.setViewport(s.viewport),()=>w.renderer.setScissor(s.scissor),()=>w.renderer.setScissorTest(s.scissorTest),()=>w.renderer.setClearColor(s.clear,s.alpha),()=>{w.renderer.autoClear=s.autoClear;w.renderer.shadowMap.enabled=s.shadowEnabled;},()=>{w.sync(0);w.releaseNativeShadow.cache.invalidate();},()=>{const rig=this.rig;rig.mixer.stopAllAction();rig.name=s.rigName;rig.action=s.action;if(s.action){s.action.reset().setLoop(s.actionState.loop,s.actionState.repetitions).play();Object.assign(s.action,s.actionState);sampleFixedPose(rig,s.actionState.time,true);}for(const v of s.nodeTransforms){v.node.position.copy(v.position);v.node.quaternion.copy(v.quaternion);v.node.scale.copy(v.scale);v.node.visible=v.visible;}rig.model.updateWorldMatrix(true,true);},()=>this.pilot.release()]){try{restore();}catch(error){errors.push(String(error));}}
  this.report.cleanup.borrowedDisposeEvents=this.borrowedDisposed;for(const [resource,callback] of this.borrowedEvents)resource.removeEventListener('dispose',callback);this.borrowedEvents=[];this.report.cleanup.ownedMaterialsRemaining=this.pilot.owned.size;
  this.report.cleanup.stateExact=JSON.stringify(w.state)===s.state;this.report.cleanup.borrowedGeometryAttributesExact=this.pilot.entries.every((e,i)=>e.mesh.geometry===s.geometries[i]&&Object.entries(s.attributes[i]).every(([name,a])=>e.geometry.attributes[name]===a));this.report.cleanup.closed=true;this.report.cleanup.rendererRetained=!w.disposed&&!w.renderer.getContext().isContextLost();
  this.resolve(this.report);this.resolve=null;
 }
 dispose(){if(this.disposed)return;this.disposed=true;if(this.active){this.report.errors.push('Worker QA owner disposed');this.finish();}this.pilot?.release();if(globalThis.__desktopSmokeWorkerProbe===this.binding)delete globalThis.__desktopSmokeWorkerProbe;}
}
