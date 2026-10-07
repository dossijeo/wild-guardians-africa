import {Vector3} from 'three';
import {serialize} from '/src/persistence/snapshots.js';

// Paired actual WorldScene renders. This deliberately stalls readPixels for
// image comparison; its timings must never be presented as normal frametimes.
export function skinCullingSweep(world,state,{holdSnapshot=false}={}){
 const before=serialize(state),camera=world.camera,controls=world.controls;
 const eye=camera.position.clone(),target=controls.target.clone(),damping=controls.enableDamping;
 const gl=world.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
 const a=new Uint8Array(w*h*4),b=new Uint8Array(w*h*4),control=new Uint8Array(w*h*4),meshes=[],rows=[];
 for(const animal of state.raid.animals){
  const rig=world.mixers.get(animal.id);
  rig.model.traverse(mesh=>{if(mesh.isSkinnedMesh){
   const candidate=mesh.boundingSphere.clone();mesh.computeBoundingSphere();
   const native=mesh.boundingSphere.clone();mesh.boundingSphere.copy(candidate);
   meshes.push({mesh,species:animal.species,candidate,native,callback:mesh.onBeforeRender,calls:0});
  }});
 }
 for(const entry of meshes)entry.mesh.onBeforeRender=function(...args){entry.calls++;entry.callback.apply(this,args);};
 controls.enableDamping=false;
 try{
  for(const entry of meshes){
   const center=entry.native.center.clone().applyMatrix4(entry.mesh.matrixWorld);
   for(const degrees of [-60,-30,0,30,60]){
    // Keep each animal near, on or beyond a horizontal camera boundary. Full
    // world camera/terrain adjustment remains the production render path.
    const angle=degrees*Math.PI/180;
    camera.position.copy(center).add(new Vector3(0,6,20));
    controls.target.copy(center).add(new Vector3(Math.tan(angle)*20,0,0));
    camera.lookAt(controls.target);controls.update();world.render(0);world.render(0);
    const renderedEye=camera.position.clone(),renderedTarget=controls.target.clone();
    const calls={},poseDeltas={},updateCamera=world.updateCamera,sync=world.sync;
    // Prepare through the production camera and sync path, then hold that
    // snapshot while varying only bounds. Re-running preparation can change
    // floating matrices even at dt=0, so native-native is a strict control.
    if(holdSnapshot){world.updateCamera=()=>{camera.position.copy(renderedEye);controls.target.copy(renderedTarget);camera.lookAt(renderedTarget);camera.updateMatrixWorld();};world.sync=()=>{};}
    try{
    for(const mode of ['nativeControl','native','candidate']){
     for(const e of meshes){e.calls=0;e.mesh.boundingSphere.copy(e[mode==='nativeControl'?'native':mode]);}
     world.render(0);
     poseDeltas[mode]={eye:camera.position.distanceTo(renderedEye),target:controls.target.distanceTo(renderedTarget)};
     if(poseDeltas[mode].eye>1e-10||poseDeltas[mode].target>1e-10)throw Error('Camera moved between paired renders '+JSON.stringify({eyeDelta:camera.position.distanceTo(renderedEye),targetDelta:controls.target.distanceTo(renderedTarget),eye:camera.position.toArray(),previousEye:renderedEye.toArray()}));
     gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,mode==='nativeControl'?control:mode==='native'?a:b);
     calls[mode]=Object.fromEntries(meshes.map(e=>[e.species,e.calls]));
    }
    }finally{world.updateCamera=updateCamera;world.sync=sync;}
    let changedPixels=0,maxChannelDifference=0,controlChangedPixels=0,controlMaxChannelDifference=0;
    for(let i=0;i<a.length;i+=4){let changed=false,controlChanged=false;for(let c=0;c<4;c++){const d=Math.abs(a[i+c]-b[i+c]);maxChannelDifference=Math.max(maxChannelDifference,d);changed||=d>0;const dc=Math.abs(control[i+c]-a[i+c]);controlMaxChannelDifference=Math.max(controlMaxChannelDifference,dc);controlChanged||=dc>0;}if(changed)changedPixels++;if(controlChanged)controlChangedPixels++;}
    rows.push({species:entry.species,degrees,calls,poseDeltas,controlChangedPixels,controlMaxChannelDifference,changedPixels,maxChannelDifference,eye:renderedEye.toArray(),target:renderedTarget.toArray()});
   }
  }
 }finally{
  for(const e of meshes){e.mesh.boundingSphere.copy(e.candidate);e.mesh.onBeforeRender=e.callback;}
  camera.position.copy(eye);controls.target.copy(target);controls.enableDamping=damping;controls.update();world.render(0);
 }
 const stateExact=serialize(state)===before,nativeControlExact=rows.every(r=>r.controlChangedPixels===0),candidateImageExact=rows.every(r=>r.changedPixels===0);
 return {holdSnapshot,nativeControlExact,candidateImageExact,verdict:!nativeControlExact?'inconclusive-native-not-repeatable':candidateImageExact?'image-identical':'candidate-image-differs',scope:'25 production-prepared WorldScene camera poses with fixed camera/entity snapshot during native-control/native/candidate draws; actual RGBA framebuffer comparison and color-pass mesh callbacks. Optional holdSnapshot fixes camera/entity sync only for comparison, then restores them. readPixels stalls; no GPU/frame/mobile timing claim.',width:w,height:h,stateExact,rows,
  ok:stateExact&&rows.every(r=>r.changedPixels===0&&r.controlChangedPixels===0)&&meshes.every(e=>rows.some(r=>r.calls.native[e.species]>0))};
}
