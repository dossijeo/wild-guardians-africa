import {createConfirmedSceneReceiver} from '../rendering/confirmed-scene-receiver.js';
import {farmHomeFocus} from '../rendering/farm-focus.js';
import {focusNewTutorialPlacement} from '../rendering/tutorial-placement-focus.js';
import {tutorialHandTarget} from '../rendering/tutorial-hand-target.js';

// The early presentation owns no legacy renderer or resident prop meshes.
// Keep its confirmed-state and camera services independent of WorldScene.
export function installEarlyWorkerWorldServices(world,{visualSearch='',dev=false}={}){
 world.createConfirmedReceiver=session=>createConfirmedSceneReceiver(world.state,session,world,{repeatDecode:dev&&new URLSearchParams(visualSearch).has('qa-worker-double-decode')});
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
