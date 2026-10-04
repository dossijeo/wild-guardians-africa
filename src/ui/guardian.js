import './guardian-native.css';
import {GuardianMesh,GuardianMagic,OrnamentPhysics,guardianPose,GUARDIAN_SPRITE,GESTURE_MIN_SECONDS} from './guardian-native.js';
import {assetUrl} from '../rendering/asset-url.js';
import {GuardianLifecycle} from './guardian-lifecycle.js';

export class NativeGuardian {
  constructor(container,onError=()=>{},onPresentation=()=>{}){
    this.container=container;this.onError=onError;this.onPresentation=onPresentation;this.disposed=false;this.key=null;this.time=0;this.age=0;this.lastStamp=null;
    this.physics=new OrnamentPhysics();this.pose=Object.fromEntries(['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll','eyes','medallion','reveal'].map(k=>[k,0]));
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lifecycle=new GuardianLifecycle(this.reduced);
    container.innerHTML='<section id="guardian-root" class="closed" aria-hidden="true"><div class="avatar-shell"><canvas id="guardian-avatar" aria-label="El Espíritu" role="img"></canvas><canvas id="guardian-magic" aria-hidden="true"></canvas></div><div class="bubble"><div class="message-body"><p class="message" aria-live="polite"></p><button type="button" class="tutorial-skip" hidden>Omitir tutorial básico</button></div><button type="button" class="next-button" aria-label="Continuar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div></section>';
    this.root=container.querySelector('#guardian-root');this.canvas=container.querySelector('#guardian-avatar');this.fx=container.querySelector('#guardian-magic');this.message=container.querySelector('.message');this.button=container.querySelector('.next-button');
    this.button.onclick=()=>this.advance?.();
    this.closeButton=document.createElement('button');this.closeButton.type='button';this.closeButton.className='tutorial-close';this.closeButton.setAttribute('aria-label','Cerrar');this.closeButton.textContent='×';this.closeButton.onclick=()=>this.dismiss?.();this.root.querySelector('.bubble').append(this.closeButton);
    this.skipButton=container.querySelector('.tutorial-skip');this.skipButton.onclick=()=>this.skip?.();
    this.root.addEventListener('keydown',event=>{
      if(!this.blocking||event.key!=='Tab')return;
      const buttons=[this.skipButton,this.button,this.closeButton].filter(button=>!button.hidden&&!button.disabled),current=buttons.indexOf(document.activeElement);
      event.preventDefault();buttons[(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
    });
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.canvas);
    this.ready=this.load();
  }
  async load(){
    try{
      const image=new Image();image.decoding='async';
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('No se ha podido cargar el Espíritu original.'));image.src=assetUrl(GUARDIAN_SPRITE);});
      if(this.disposed)return;
      this.mesh=new GuardianMesh(this.canvas,image);this.magic=new GuardianMagic(this.fx);this.resize();
    }catch(error){if(!this.disposed)this.onError(error);}
  }
  show({key,text,gesture='speak',advance=null,dismiss=null,closeAfter=false,blocking=false,skip=null,result=false}){
    if(this.disposed||this.key===key)return;
    this.key=key;this.age=0;this.gesture=gesture;this.advance=advance;this.dismiss=dismiss;this.closeButton.hidden=!dismiss;this.closeAfter=closeAfter;this.lastStamp=null;
    const entering=['closed','farewell','outro'].includes(this.lifecycle.phase);this.lifecycle.open();
    this.blocking=blocking;this.skip=skip;this.skipButton.hidden=!skip;this.root.classList.toggle('reading',blocking);this.root.classList.toggle('result-narration',result);
    this.root.setAttribute('role',blocking?'dialog':'region');this.root.setAttribute('aria-label','El Espíritu');
    if(blocking)this.root.setAttribute('aria-modal','true');else this.root.removeAttribute('aria-modal');
    const words=text.trim().split(/\s+/).length;
    this.duration=Math.max(GESTURE_MIN_SECONDS[gesture]??5.8,words*60/155+.45);
    this.message.textContent=text;this.button.disabled=!advance;this.button.hidden=!advance;this.button.style.display=advance?'':'none';
    this.root.inert=false;this.root.classList.remove('closed','leaving');this.root.setAttribute('aria-hidden','false');
    if(entering){this.root.classList.remove('visible');void this.root.offsetWidth;}
    this.root.classList.add('visible');
    this.root.dataset.gesture=gesture;this.resize();
    if(blocking)this.button.focus({preventScroll:true});
  }
  hide({immediate=false}={}){
    this.root.classList.remove('reading','result-narration');this.root.removeAttribute('aria-modal');this.root.setAttribute('aria-hidden','true');this.root.inert=true;
    this.blocking=false;this.advance=null;this.skip=null;this.key=null;
    if(immediate){this.lifecycle.close();this.root.classList.remove('visible','leaving');this.root.classList.add('closed');this.lastStamp=null;this.present('hidden');}
    else this.lifecycle.finish();
  }
  present(phase){try{this.onPresentation(phase);}catch{}}
  resize(){if(this.mesh){this.mesh.resize();this.magic.resize();this.draw(0);}}
  update(){
    if(this.disposed||document.hidden||this.root.classList.contains('closed')){this.lastStamp=null;return;}
    const stamp=performance.now(),elapsed=this.lastStamp===null?0:Math.max(0,(stamp-this.lastStamp)/1000);this.lastStamp=stamp;
    this.time+=elapsed;this.age+=elapsed;
    if(this.closeAfter&&this.age>=this.duration+.9)this.hide();
    this.lifecycle.advance(elapsed,this.duration);
    this.root.classList.toggle('leaving',this.lifecycle.phase==='outro');
    if(this.lifecycle.phase==='closed'){this.root.classList.remove('visible','leaving');this.root.classList.add('closed');this.root.dataset.lifecycle='closed';this.root.dataset.phase='closed';this.lastStamp=null;this.present('closed');return;}
    this.draw(Math.min(elapsed,.065));
  }
  draw(dt){
    if(!this.mesh||this.mesh.lost)return;
    const sample=this.lifecycle.sample(this.gesture??'idle',this.duration??7),gesture=sample.state;
    const q=guardianPose(gesture,sample.age,sample.duration,this.time,1),gain=this.reduced?0:1,follow=1-Math.exp(-dt*5.4);
    for(const k of ['roll','yaw','pitch','lift','zoom','headX','headY','bodyX','bodyRoll']){
      const target=k==='roll'?Math.max(-.46,Math.min(.46,q[k])):k==='yaw'?Math.max(-.34,Math.min(.34,q[k])):k==='pitch'?Math.max(-.38,Math.min(.26,q[k])):q[k];
      this.pose[k]+=(target*gain-this.pose[k])*follow;
    }
    for(const k of ['eyes','medallion','reveal'])this.pose[k]+=(q[k]*gain-this.pose[k])*(1-Math.exp(-dt*4));
    this.physics.step(this.time,dt,this.pose.roll,this.pose.yaw,q.reveal*gain,gain,gain);
    this.mesh.update(this.pose.roll,this.pose.yaw,this.pose.pitch,{...this.pose,blend:1,angles:this.physics.angles,offsets:this.physics.offsets});
    this.mesh.draw();this.magic.draw(this.mesh,this.time,this.pose,false);
    this.present(document.hidden?'hidden':this.lifecycle.phase);
    this.root.dataset.phase=gesture;
    this.root.dataset.lifecycle=this.lifecycle.phase;
  }
  dispose(){
    this.disposed=true;this.present('disposed');this.observer.disconnect();this.mesh?.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.container.replaceChildren();
  }
}
