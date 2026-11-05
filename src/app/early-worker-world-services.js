import {createConfirmedSceneReceiver} from '../rendering/confirmed-scene-receiver.js';
import {createConfirmedStateReceiver} from '../simulation/confirmed-state-receiver.js';
import {farmHomeFocus} from '../rendering/farm-focus.js';
import {focusNewTutorialPlacement} from '../rendering/tutorial-placement-focus.js';
import {tutorialHandTarget} from '../rendering/tutorial-hand-target.js';
import {waitGpuPreparation} from '../../tools/experiments/wait-gpu-preparation.js';

// The early presentation owns no legacy renderer or resident prop meshes.
// Keep its confirmed-state and camera services independent of WorldScene.
export function installEarlyWorkerWorldServices(world,{visualSearch='',dev=false}={}){
 const params=new URLSearchParams(visualSearch),legacyDiagnostics=dev&&(params.has('qa-worker-double-decode')||params.has('qa-worker-path-trace'));
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
  const target=tutorialHandTarget(world.state,world.nav,kind);
  focusNewTutorialPlacement(world,target,true);
  return target;
 };
 world.syncResidentProps=()=>{
  if(world.prototypes)throw Error('Early worker world cannot own legacy resident props');
  return {chunks:0,slots:0};
 };
 world.ensureVillage=culture=>{const client=world.webGpuWorld?.client;if(!client)return Promise.reject(Error('Village presentation unavailable'));return client.prepareStructure('village',culture);};
 world.showVillagePreview=preview=>{if(!world.webGpuWorld?.client.showVillagePreview(preview))throw Error('Village preview unavailable');};
 world.clearVillagePreview=()=>world.webGpuWorld?.client.clearVillagePreview();
}
