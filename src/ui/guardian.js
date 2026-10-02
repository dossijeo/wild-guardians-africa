import './guardian-native.css';
import {GuardianMesh,GuardianMagic,OrnamentPhysics,guardianPose,GUARDIAN_SPRITE,GESTURE_MIN_SECONDS} from './guardian-native.js';

export class NativeGuardian {
  constructor(container,onError=()=>{}){
    this.container=container;this.onError=onError;this.disposed=false;this.key=null;this.time=0;this.age=0;this.lastStamp=null;
    this.physics=new OrnamentPhysics();this.pose=Object.fromEntries(['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll','eyes','medallion','reveal'].map(k=>[k,0]));
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.innerHTML='<section id="guardian-root" class="closed" aria-hidden="true"><div class="avatar-shell"><canvas id="guardian-avatar" aria-label="El Espíritu" role="img"></canvas><canvas id="guardian-magic" aria-hidden="true"></canvas></div><div class="bubble"><div class="message-body"><p class="message" aria-live="polite"></p></div><button type="button" class="next-button" aria-label="Continuar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div></section>';
    this.root=container.querySelector('#guardian-root');this.canvas=container.querySelector('#guardian-avatar');this.fx=container.querySelector('#guardian-magic');this.message=container.querySelector('.message');this.button=container.querySelector('.next-button');
    this.button.onclick=()=>this.advance?.();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.canvas);
    this.ready=this.load();
  }
  async load(){
    try{
      const image=new Image();image.decoding='async';
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se ha podido cargar el Espíritu original.'));image.src=GUARDIAN_SPRITE;});
      if(this.disposed)return;
      this.mesh=new GuardianMesh(this.canvas,image);this.magic=new GuardianMagic(this.fx);this.resize();
    }catch(error){if(!this.disposed)this.onError(error);}
  }
  show({key,text,gesture='speak',advance=null,closeAfter=false}){
    if(this.disposed||this.key===key)return;
    this.key=key;this.age=0;this.gesture=gesture;this.advance=advance;this.closeAfter=closeAfter;this.lastStamp=null;
    const words=text.trim().split(/\s+/).length;
    this.duration=Math.max(GESTURE_MIN_SECONDS[gesture]??5.8,words*60/155+.45);
    this.message.textContent=text;this.button.disabled=!advance;this.button.hidden=!advance;this.button.style.display=advance?'':'none';
    this.root.classList.remove('closed','leaving');this.root.classList.add('visible');this.root.setAttribute('aria-hidden','false');
    this.root.dataset.gesture=gesture;this.resize();
  }
  hide(){this.root.classList.remove('visible');this.root.classList.add('closed');this.root.setAttribute('aria-hidden','true');this.lastStamp=null;}
  resize(){if(this.mesh){this.mesh.resize();this.magic.resize();this.draw(0);}}
  update(){
    if(this.disposed||document.hidden||this.root.classList.contains('closed')){this.lastStamp=null;return;}
    const stamp=performance.now(),elapsed=this.lastStamp===null?0:Math.max(0,(stamp-this.lastStamp)/1000);this.lastStamp=stamp;
    this.time+=elapsed;this.age+=elapsed;
    if(this.closeAfter&&this.age>=this.duration+.9){this.hide();return;}
    this.draw(Math.min(elapsed,.065));
  }
  draw(dt){
    if(!this.mesh||this.mesh.lost)return;
    const gesture=this.age>=this.duration?'idle':this.gesture??'idle';
    const q=guardianPose(gesture,this.age,this.duration??7,this.time,1),gain=this.reduced?0:1,follow=1-Math.exp(-dt*5.4);
    for(const k of ['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll']){
      const target=k==='roll'?Math.max(-.46,Math.min(.46,q[k])):k==='yaw'?Math.max(-.34,Math.min(.34,q[k])):k==='pitch'?Math.max(-.38,Math.min(.26,q[k])):q[k];
      this.pose[k]+=(target*gain-this.pose[k])*follow;
    }
    for(const k of ['eyes','medallion','reveal'])this.pose[k]+=(q[k]*gain-this.pose[k])*(1-Math.exp(-dt*4));
    this.physics.step(this.time,dt,this.pose.roll,this.pose.yaw,q.reveal*gain,gain,gain);
    this.mesh.update(this.pose.roll,this.pose.yaw,this.pose.pitch,{...this.pose,blend:1,angles:this.physics.angles,offsets:this.physics.offsets});
    this.mesh.draw();this.magic.draw(this.mesh,this.time,this.pose,false);
    this.root.dataset.phase=gesture;
  }
  dispose(){
    this.disposed=true;this.observer.disconnect();this.mesh?.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.container.replaceChildren();
  }
}
