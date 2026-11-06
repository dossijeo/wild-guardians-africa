import {createConfirmedSceneReceiver} from '../rendering/confirmed-scene-receiver.js';
import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {farmHomeFocus} from '../rendering/farm-focus.js';
import {focusNewTutorialPlacement} from '../rendering/tutorial-placement-focus.js';
import {waitGpuPreparation} from '../rendering/wait-gpu-preparation.js';

// The early presentation owns no legacy renderer or resident prop meshes.
// Keep its confirmed-state and camera services independent of WorldScene.
export function installEarlyWorkerWorldServices(world,{visualSearch='',dev=false,loadLegacyTutorialTarget=()=>import('../tutorial/tutorial-hand-target.js')}={}){
 if(typeof loadLegacyTutorialTarget!=='function')throw TypeError('Invalid tutorial target loader');
 const params=new URLSearchParams(visualSearch),legacyDiagnostics=dev&&(params.has('qa-worker-double-decode')||params.has('qa-worker-path-trace'));
 let focusGeneration=0;
 world.createConfirmedReceiver=session=>legacyDiagnostics?createConfirmedSceneReceiver(world.state,session,world,{repeatDecode:params.has('qa-worker-double-decode')}):createConfirmedStateReceiver(world.state,session);
 world.loadReady=async(pending,releaseLate)=>{
  const signal=world.loading?.signal;let value;const check=()=>{if(world.disposed||signal?.aborted)throw Error('Carga de mundo cancelada');};
  const observed=Promise.resolve(pending).then(result=>{if(world.disposed||signal?.aborted)releaseLate?.(result);value=result;});
  await waitGpuPreparation(observed,{check,signal,nextFrame:()=>new Promise(()=>{})});check();return value;
 };
 world.installChunk=data=>{
  if(!Number.isSafeInteger(data?.cx)||!Number.isSafeInteger(data?.cz)||data.authority!=='spatial-wasm'||!Number.isSafeInteger(data.terrainRevision)||!Array.isArray(data.instances))throw TypeError('Invalid spatial chunk metadata');
  world.chunks.set(`${data.cx},${data.cz}`,{authority:data.authority,terrainRevision:data.terrainRevision,instances:data.instances});
 };
 world.focusFarm=()=>world.focus(farmHomeFocus(world.state));
 world.focusTutorialPlacement=kind=>{
  if(world.nav?.workerProjection){
   const runtime=world.workerRuntime,state=world.state,generation=++focusGeneration;if(!runtime||!['center','plant','spell'].includes(kind))return null;
   runtime.submit({kind:'tutorialGuideTarget',toolKind:kind,toolSpell:null}).then(result=>{if(world.disposed||world.state!==state||world.workerRuntime!==runtime||generation!==focusGeneration)return;if(result.rejection)throw Error(result.rejection);focusNewTutorialPlacement(world,result.value,true);}).catch(error=>{if(!world.disposed&&world.state===state&&generation===focusGeneration)world.onError?.(error);});return null;
  }
  // The local-navigation fallback is loaded only for old non-Worker setups;
  // the Worker-owned world never imports its synchronous gameplay queries.
  const state=world.state,nav=world.nav,generation=++focusGeneration;if(!state||!nav)return null;
  const current=()=>!world.disposed&&world.state===state&&world.nav===nav&&generation===focusGeneration;
  Promise.resolve().then(()=>current()?loadLegacyTutorialTarget():null).then(module=>{if(!current()||!module)return;focusNewTutorialPlacement(world,module.tutorialHandTarget(state,nav,kind),true);}).catch(error=>{if(current())world.onError?.(error);});return null;
 };
 world.cancelTutorialFocus=()=>{focusGeneration++;};
 world.syncResidentProps=()=>{
  if(world.prototypes)throw Error('Early worker world cannot own legacy resident props');
  return {chunks:0,slots:0};
 };
 world.ensureVillage=culture=>{const client=world.webGpuWorld?.client;if(!client)return Promise.reject(Error('Village presentation unavailable'));return client.prepareStructure('village',culture);};
 world.showVillagePreview=preview=>{if(!world.webGpuWorld?.client.showVillagePreview(preview))throw Error('Village preview unavailable');};
 world.clearVillagePreview=()=>world.webGpuWorld?.client.clearVillagePreview();
}
