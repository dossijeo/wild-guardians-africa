import {ScreenOverlays} from './screen-overlays.js';
import {Vector3} from 'three';
import {GameJuiceModel} from './game-juice-model.js';
import {spellUnlocked} from '../simulation/rules.js';
import './game-juice.css';

const COPY={es:{night:n=>`Noche ${n} superada`,saved:'Partida guardada'},en:{night:n=>`Night ${n} survived`,saved:'Game saved'}};
const MILESTONES=new Set([10,25,50,75,100]);
export class GameJuice {
 constructor(stage,state,world,{now=()=>performance.now(),priority=()=>false,allowResult=()=>false,language=()=>globalThis.WildGuardiansLanguage?.getLanguage?.()??document.documentElement.lang}={}){
  this.allowResult=allowResult;this.stage=stage;this.world=world;this.now=now;this.priority=priority;this.language=language;this.model=new GameJuiceModel(state);this.vector=new Vector3();this.effects=[];this.animations=new Set();this.pending=new Map();this.flushAt=0;this.shakeUntil=0;this.lastShake=-Infinity;this.pendingDawn=null;
  this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.root=document.createElement('div');this.root.className='game-juice';this.root.setAttribute('aria-hidden','true');this.root.dataset.noI18n='';stage.append(this.root);
  this.saved=document.createElement('div');this.saved.className='juice-saved';this.saved.role='status';this.saved.setAttribute('aria-live','polite');this.saved.dataset.noI18n='';stage.append(this.saved);
  this.overlays=new ScreenOverlays(stage,{now,quality:()=>world.quality??'media',reduced:()=>this.motion.matches});world.presentationDraw=draw=>this.draw(draw);
 }
 copy(){return COPY[String(this.language()).startsWith('es')?'es':'en'];}
 pulse(node,frames=[{scale:'1'},{scale:'1.065'},{scale:'1'}],duration=280){
  if(!node||this.motion.matches||this.animations.size>=8)return;
  const animation=node.animate(frames,{duration,easing:'ease-out'});this.animations.add(animation);animation.finished.catch(()=>{}).finally(()=>this.animations.delete(animation));
 }
 add(className,text='',point=null,duration=900){
  // Strictly bounded allocation, even during mass planting/deliveries/attacks.
  while(this.effects.length>=4)this.remove(this.effects[0]);
  const node=document.createElement('span');node.className=className;node.textContent=text;this.root.append(node);const effect={node,point,end:this.now()+duration};this.effects.push(effect);return effect;
 }
 remove(effect){effect.node.remove();this.effects.splice(this.effects.indexOf(effect),1);}
 savedSuccessfully(){if(this.disposed)return;this.saved.textContent='✓ '+this.copy().saved;this.saved.classList.add('visible');this.savedUntil=this.now()+2200;this.pulse(this.saved);}
 process(state){
  for(const event of this.model.consume(state)){
   if(event.kind==='overlay')this.overlays.request(event.effect);
   else if(event.kind==='money'){
    const sign=event.value>0n?'income':'expense';this.pending.set(sign,(this.pending.get(sign)??0n)+event.value);if(!this.flushAt)this.flushAt=this.now()+120;
   }else if(event.kind==='dawn')this.pendingDawn={night:event.night,deadline:this.now()+12000};
   else if(event.kind==='placement'&&!this.priority())this.add('juice-ring '+(event.crop?'crop':'building'),'',{x:event.x,z:event.z},380);
   else if(event.kind==='magic'){
    this.overlays.request(event.spell);this.pulse(this.stage.querySelector(`[data-spell="${event.spell}"]`)??this.stage.querySelector('[data-menu="magic"]'));
    if(!this.priority())this.add('juice-ring magic','',{x:event.x,z:event.z},420);
   }else if(event.kind==='ready'&&spellUnlocked(state,event.spell))this.pulse(this.stage.querySelector(`[data-spell="${event.spell}"]`)??this.stage.querySelector('[data-menu="magic"]'));
   else if(event.kind==='critical'){this.overlays.request('critical');this.pulse(this.stage.querySelector('.notice-card.urgent'));}
   else if(event.kind==='collapse'&&!this.motion.matches&&this.now()-this.lastShake>300&&!this.world.raidCamera?.travel&&!this.world.raidCamera?.manual){this.lastShake=this.now();this.shakeUntil=this.now()+130;this.shakeAmount=state.structures.find(s=>s.id===event.targetId)?.kind==='center'?.05:.025;}
  }
 }
 update(state){
  const now=this.now(),blocked=this.priority();this.overlays.update({blocked:blocked||document.hidden,allowResult:!document.hidden&&this.allowResult()});
  this.root.hidden=blocked||document.hidden;
  if(this.flushAt&&now>=this.flushAt){
   for(const [sign,value] of this.pending){
    let effect=this.effects.find(e=>e.moneySign===sign&&e.end>now);
    if(!effect){effect=this.add('juice-money '+sign);effect.moneySign=sign;effect.value=0n;}
    effect.value+=value;effect.node.textContent=(effect.value>0n?'+':'−')+(effect.value>0n?effect.value:-effect.value).toLocaleString(String(this.language()).startsWith('es')?'es-ES':'en-US');
    const box=this.stage.querySelector('#money');if(box){effect.node.style.left=box.style.left;effect.node.style.top=`${box.offsetTop+box.offsetHeight+(sign==='expense'?30:0)}px`;this.pulse(box);}
   }
   this.pending.clear();this.flushAt=0;
  }
  if(this.pendingDawn){if(now>this.pendingDawn.deadline)this.pendingDawn=null;else if(!blocked&&!this.stage.querySelector('.notice-card')){const {night}=this.pendingDawn;this.overlays.request('dawn');this.add('juice-dawn'+(MILESTONES.has(night)?' milestone':''),this.copy().night(night),null,1900);this.pendingDawn=null;}}
  if(now>(this.savedUntil??0)){this.saved.classList.remove('visible');if(this.saved.textContent)this.saved.textContent='';}
  for(const effect of [...this.effects]){
   if(now>=effect.end){this.remove(effect);continue;}
   if(effect.point){const {x,z}=effect.point;this.vector.set(x,this.world.nav.field.surface(x,z)+.12,z).project(this.world.camera);effect.node.hidden=this.vector.z<-1||this.vector.z>1||Math.abs(this.vector.x)>1||Math.abs(this.vector.y)>1;effect.node.style.left=`${(this.vector.x*.5+.5)*this.stage.clientWidth}px`;effect.node.style.top=`${(-this.vector.y*.5+.5)*this.stage.clientHeight}px`;}
  }
 }
 draw(draw){
  const now=this.now();if(this.disposed||this.motion.matches||now>=this.shakeUntil||this.priority()||this.world.raidCamera?.travel||this.world.raidCamera?.manual)return draw();
  // Draw-only offset: controls, automatic travel, save pose and focus stay exact.
  const camera=this.world.camera,x=camera.position.x,y=camera.position.y,amount=(this.shakeAmount??.025)*Math.sin((this.shakeUntil-now)*.11)*(this.shakeUntil-now)/130;
  try{camera.position.x+=amount;camera.position.y+=amount*.4;camera.updateMatrixWorld();return draw();}finally{camera.position.x=x;camera.position.y=y;camera.updateMatrixWorld();}
 }
 dispose(){this.disposed=true;this.overlays.dispose();this.model.dispose();for(const animation of this.animations)animation.cancel();this.animations.clear();this.root.remove();this.saved.remove();this.effects.length=0;this.pending.clear();this.world.presentationDraw=null;}
}
