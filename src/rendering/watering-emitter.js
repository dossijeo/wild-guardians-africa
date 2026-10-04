import {AnimationMixer,Vector3} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// Bake the authored nozzle path once per profile. Emitting a droplet then needs
// interpolation only; no extra animation mixer or scene traversal per frame.
export function createWateringEmitter(gltf){
  const model=clone(gltf.scene),nozzle=model.getObjectByName('Can_Nozzle'),clip=gltf.animations.find(c=>c.name==='Water');
  if(!nozzle||!clip)throw new Error('Falta la boquilla o la animación original de riego');
  const mixer=new AnimationMixer(model),action=mixer.clipAction(clip).play(),frames=Math.ceil(clip.duration*60),positions=new Float32Array((frames+1)*3),directions=new Float32Array((frames+1)*3),point=new Vector3(),direction=new Vector3();
  action.paused=true;
  for(let i=0;i<=frames;i++){
    action.time=i/frames*clip.duration;mixer.update(0);model.updateMatrixWorld(true);
    point.set(0,.023,0).applyMatrix4(nozzle.matrixWorld);model.worldToLocal(point);point.toArray(positions,i*3);
    direction.set(0,1,0).transformDirection(nozzle.matrixWorld);direction.toArray(directions,i*3);
  }
  action.stop();mixer.uncacheRoot(model);
  return (fraction,origin,outward)=>{
    const t=Math.max(0,Math.min(1,fraction))*frames,a=Math.min(frames-1,Math.floor(t)),mix=t-a;
    for(let k=0;k<3;k++){origin.setComponent(k,positions[a*3+k]*(1-mix)+positions[(a+1)*3+k]*mix);outward.setComponent(k,directions[a*3+k]*(1-mix)+directions[(a+1)*3+k]*mix);}
    outward.normalize();return origin;
  };
}
