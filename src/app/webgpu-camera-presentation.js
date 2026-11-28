import {installWebGpuCameraInput} from './webgpu-camera-input.js';

export function webGpuCameraPose(camera,controls){
 return {x:camera.position.x,y:camera.position.y,z:camera.position.z,targetX:controls.target.x,targetY:controls.target.y,targetZ:controls.target.z,fov:camera.fov,near:camera.near,far:camera.far};
}

// Owns only the presentation connection, not OrbitControls or the game world.
export function createWebGpuCameraPresentation({camera,controls,canvas,viewport=canvas,client,isCurrent}){
 if(!camera?.position||!controls?.target||!canvas||!viewport||!client||typeof isCurrent!=='function')throw TypeError('Invalid WebGPU camera presentation');
 let closed=false,binding;const release=installWebGpuCameraInput({controls,context:()=>{const status=client.status();return !closed&&isCurrent(binding)&&status.phase==='running'&&status.backend==='WebGPU'?binding:null;}});
 function send(pose){client.setCamera(pose);client.resize(viewport.width,viewport.height);}
 binding={client,canvas,sync(){if(closed)return;send(webGpuCameraPose(camera,controls));},syncVisual(draw){if(closed)return;if(draw==null){binding.sync();return;}if(typeof draw!=='function')throw TypeError('Invalid camera presentation draw');const base=webGpuCameraPose(camera,controls);draw(()=>{const pose=webGpuCameraPose(camera,controls);pose.targetX+=pose.x-base.x;pose.targetY+=pose.y-base.y;pose.targetZ+=pose.z-base.z;send(pose);});},dispose(){if(closed)return;closed=true;release();client.dispose();canvas.remove();}};return binding;
}
