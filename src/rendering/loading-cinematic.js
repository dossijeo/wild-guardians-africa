import * as THREE from 'three';
import {CameraBuildingRegistry} from './camera-building-registry.js';
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Camera poses are presentation-only and never written to simulation/save data.
export class LoadingCinematic {
  constructor(world,diorama,{reducedMotion=false,durations=[.7,.4,1.4,1.5],autoStart=true}={}) {
    this.world=world;this.diorama=diorama;this.durations=reducedMotion?[.12,.12,.12,.12]:durations;this.time=0;this.done=false;this.armed=autoStart;
    this.gameplay={eye:world.camera.position.clone(),quaternion:world.camera.quaternion.clone(),target:world.controls.target.clone()};
    // Raising above the existing opening eye preserves the same X/Z chunk
    // centre. Never ask the reveal to generate a different resident region.
    this.panorama=this.gameplay.eye.clone();const field=world.nav.field;
    this.panorama.y=Math.min(this.panorama.y+6,field.surface(this.panorama.x,this.panorama.z)+20);
    this.fallback=!Number.isFinite(this.panorama.y)||this.panorama.y<this.gameplay.eye.y;
    const buildings=new CameraBuildingRegistry();
    try{buildings.sync(world.objects,[...world.state.villages,...world.state.structures.filter(s=>s.kind==='center')]);this.fallback||=!!buildings.index.sweep(this.gameplay.eye.toArray(),this.panorama.toArray(),.45);}
    finally{buildings.clear();}
    if(this.fallback)this.panorama.copy(this.gameplay.eye);
    const heading=this.gameplay.target.clone().sub(this.gameplay.eye);heading.y=0;if(heading.lengthSq()<1e-8)heading.set(0,0,-1);heading.normalize();heading.y=5;
    const camera=world.camera.clone();camera.position.copy(this.panorama);camera.lookAt(this.panorama.clone().add(heading));this.skyQuaternion=camera.quaternion.clone();camera.lookAt(this.gameplay.target);this.panoramaQuaternion=camera.quaternion.clone();
    this.loadingFov=diorama.camera.fov;this.loadingEye=diorama.camera.position.clone();this.loadingQuaternion=diorama.camera.quaternion.clone();this.loadingSkyEye=this.loadingEye.clone().add(new THREE.Vector3(0,2,0));
    diorama.stopPlanting();world.cinematic=true;world.controls.enabled=false;
    this.finished=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});this.finished.catch(()=>{});
  }
  async prepare({nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),afterRender=()=>{}}={}) {
    // Upload the elevated reveal before announcing readiness. X/Z and the orbit
    // target remain unchanged, so this does not request a different chunk region.
    try {
      for(const [eye,quaternion] of [[this.panorama,this.panoramaQuaternion],[this.gameplay.eye,this.gameplay.quaternion]]) {
        if(this.world.disposed||this.diorama.disposed||this.done)throw Error('Loading cinematic preparation cancelled');
        this.world.camera.position.copy(eye);this.world.camera.quaternion.copy(quaternion);this.world.camera.updateMatrixWorld();
        if(this.world.renderLoadingFrame)await this.world.renderLoadingFrame({nextFrame,afterRender});else this.world.render(0);afterRender();
        this.restore();this.world.cinematic=true;
        await nextFrame();
      }
    } finally {this.restore();if(!this.done&&!this.world.disposed)this.world.cinematic=true;}
  }
  start(){this.armed=true;}
  step(dt) {
    if(this.done||!this.armed)return;
    if(this.world.disposed||this.diorama.disposed)return this.cancel();
    this.time+=Math.max(0,dt);const [a,b,c,d]=this.durations,{world,diorama}=this;
    if(this.time<a){const t=ease(this.time/a);diorama.camera.fov=THREE.MathUtils.lerp(this.loadingFov,world.camera.fov,t);diorama.camera.updateProjectionMatrix();diorama.camera.position.lerpVectors(this.loadingEye,this.loadingSkyEye,t);diorama.camera.quaternion.slerpQuaternions(this.loadingQuaternion,this.skyQuaternion,t);diorama.render(dt,1,{ready:true});return;}
    if(this.time<a+b){diorama.camera.fov=world.camera.fov;diorama.camera.updateProjectionMatrix();diorama.camera.quaternion.copy(this.skyQuaternion);diorama.render(dt,1,{ready:true,skyOnly:true});world.camera.position.copy(this.panorama);world.camera.quaternion.copy(this.skyQuaternion);return;}
    if(this.time<a+b+c){world.camera.position.copy(this.panorama);world.camera.quaternion.slerpQuaternions(this.skyQuaternion,this.panoramaQuaternion,ease((this.time-a-b)/c));world.render(0);return;}
    const t=ease((this.time-a-b-c)/d);world.camera.position.lerpVectors(this.panorama,this.gameplay.eye,t);world.camera.quaternion.slerpQuaternions(this.panoramaQuaternion,this.gameplay.quaternion,t);world.render(0);
    if(this.time>=a+b+c+d){this.restore();this.done=true;this.resolve();}
  }
  restore(){const {world}=this;if(world.disposed)return;world.camera.position.copy(this.gameplay.eye);world.camera.quaternion.copy(this.gameplay.quaternion);world.controls.target.copy(this.gameplay.target);world.camera.updateMatrixWorld();world.cinematic=false;}
  cancel(){if(this.done)return;this.restore();this.done=true;this.reject(new Error('Loading cinematic cancelled'));}
}
