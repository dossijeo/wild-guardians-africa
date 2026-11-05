import {ANIMAL_ACTIONS} from './animal-actions-data.js';

// The rig and clip readers consume the same immutable GLB. Read its bytes and
// JSON once per admission; callers still own independent rigs and mixers.
export async function loadWorkerPhysicsGlb(species){
 const url=ANIMAL_ACTIONS.animals[species]?.url;if(!url)throw Error('Unsupported physics species');
 const response=await fetch(url);if(!response.ok)throw Error(`Physics GLB fetch: ${response.status}`);
 const bytes=await response.arrayBuffer(),view=new DataView(bytes),jsonSize=view.getUint32(12,true),document=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonSize)));
 return {view,document,binOffset:28+jsonSize};
}
