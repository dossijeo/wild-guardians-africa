import {CameraTerrainUnavailable} from './confirmed-camera-terrain.js';

// Keep the last camera pose certified against confirmed terrain. OrbitControls
// can update inside DOM event handlers, before the next animation frame.
export function guardConfirmedCamera({camera,controls,active,field}={}){
 if(!camera?.position||!controls?.target||typeof controls.update!=='function'||typeof active!=='function'||typeof field!=='function')throw TypeError('Invalid camera guard');
 let eye=camera.position.clone(),target=controls.target.clone(),closed=false;const original=controls.update;
 const remember=()=>{eye.copy(camera.position);target.copy(controls.target);};
 const restore=()=>{camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);camera.updateMatrixWorld();};
 function run(action){if(closed)throw Error('Camera guard disposed');if(active()&&!field()){restore();return false;}try{const result=action();remember();return result;}catch(error){if(!(error instanceof CameraTerrainUnavailable))throw error;restore();return false;}}
 function update(...args){return run(()=>original.apply(this,args));}
 controls.update=update;
 return {run,dispose(){if(closed)return;closed=true;if(controls.update===update)controls.update=original;}};
}
