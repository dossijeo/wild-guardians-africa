import {Vector3} from 'three';
import {AttentionDirector} from './director.js';
import {InteractiveParticles} from './particles.js';
import {PointerTrace} from './pointer-trace.js';
import {MicroeventBillboards} from './billboards.js';
import {MicroeventSpace} from './space.js';
import {EVENTS,compatible,FREQUENCIES,MICROEVENT_CONFIG,eligibleAnchor} from './definitions.js';
import {microState,trackIncome,reserveEvent,settleEvent,disableMicroEconomy} from './economy.js';
const cameraPose=camera=>[...camera.position.toArray(),...camera.quaternion.toArray()];
const poseChanged=(current,previous)=>current.some((n,i)=>Math.abs(n-(previous[i]??n))>1e-5);

export class Microevents {
  constructor({state,world,stage,save,sound,context,settings,debug=false,clock=()=>performance.now()}){
    Object.assign(this,{state,world,stage,save,sound,context,settings,debug,clock});this.abort=new AbortController();this.records=[];this.learned=new Set();this.frameSamples=[];this.frameIntervals=[];this.metrics={spawns:0,completed:0,ignored:0,rescued:0,misses:0,frameMs:0};
    this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.reducedMotion=this.motionQuery.matches;this.motionQuery.addEventListener('change',e=>{this.reducedMotion=e.matches;},{signal:this.abort.signal});
    this.director=new AttentionDirector(microState(state),{telemetry:(type,detail)=>this.log(type,detail)});this.particles=new InteractiveParticles(MICROEVENT_CONFIG.maxParticles);this.space=new MicroeventSpace();this.billboards=new MicroeventBillboards(world);this.billboards.ready.catch(e=>{this.failed=true;this.log('asset-error',{message:e.message});});this.pointer={present:false,owned:false,x:0,y:0,vx:0,vy:0,hold:0};this.owned=new Set();this.cameraPointers=new Set();this.last=clock();this.commandCount=state.commandIds.length;this.eventTail=state.events.at(-1)?.id;this.anchorTimer=0;this.anchors=[];this.point=new Vector3();this.cameraPose=[];this.disposed=false;
    this.trace=new PointerTrace();this.beforeSimulation();const signal=this.abort.signal;for(const name of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,e=>this.input(name,e),{capture:true,signal});
    stage.addEventListener('wheel',()=>{this.wheelUntil=this.clock()+250;this.director.cameraStable=0;},{capture:true,passive:true,signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel('hidden');this.last=this.clock();},{signal});
    if(debug){this.diagnostic=document.createElement('output');this.diagnostic.dataset.presentation='world-billboards';this.diagnostic.style.cssText='position:absolute;left:12px;top:100px;z-index:50;background:#10251bdd;color:#e5f5cf;padding:8px;font:12px monospace;pointer-events:none;white-space:pre';stage.append(this.diagnostic);}
    if(debug){this.qaControls=document.createElement('nav');this.qaControls.setAttribute('aria-label','Microevent QA');this.qaControls.style.cssText='position:absolute;left:12px;top:210px;z-index:51;display:flex;gap:5px;flex-wrap:wrap;max-width:600px';for(const [id,label] of [...Object.keys(EVENTS).slice(0,10).map(id=>[id,`QA ${id[0].toUpperCase()+id.slice(1)}`]),['cancel','QA Cancel']]){const button=document.createElement('button');button.textContent=label;button.style.cssText='padding:6px;font:12px sans-serif';button.onclick=()=>{this.cancel('qa');if(id==='cancel')return;this.state.time=EVENTS[id].night?310:100;this.world.focusFarm();void this.force(id);};this.qaControls.append(button);}stage.append(this.qaControls);}
    if(debug){const select=document.createElement('select');select.setAttribute('aria-label','QA event type');for(const def of Object.values(EVENTS)){const option=document.createElement('option');option.value=def.id;option.textContent=def.id;select.append(option);}const force=document.createElement('button');force.textContent='QA Show selected';force.onclick=()=>{this.cancel('qa');const def=EVENTS[select.value];this.state.time=def.night?310:100;this.world.focusFarm();void this.force(def.id);};this.qaControls.append(select,force);}
    if(import.meta.env?.DEV&&debug)void import('./qa-gestures.js').then(({attachGestureQa})=>{if(!this.disposed)attachGestureQa(this);});
    this.previousBeforeDraw=world.beforeMicroeventDraw;this.renderUpdate=()=>{this.previousBeforeDraw?.();this.tick();};world.beforeMicroeventDraw=this.renderUpdate;
    if(debug){const freeze=document.createElement('button');freeze.textContent='QA Freeze event';freeze.style.cssText='padding:6px;font:12px sans-serif';freeze.onclick=()=>{this.qaFrozen=!this.qaFrozen;freeze.setAttribute('aria-pressed',String(this.qaFrozen));if(this.qaFrozen)this.refreshQaHit();};this.qaControls.append(freeze);try{const gl=world.renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');this.diagnostic.dataset.renderer=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}catch{this.diagnostic.dataset.renderer='unavailable';}}
  }
  log(type,detail={}){this.records.push({type,at:this.clock(),day:this.state.day,...detail});if(this.records.length>256)this.records.shift();if(type==='spawn')this.metrics.spawns++;if(type==='completed')this.metrics.completed++;if(type==='ignored')this.metrics.ignored++;if(type==='idle-rescue')this.metrics.rescued++;}
  get holdsNightSpeed(){return !!(this.pending||this.active);}
  blocked(){const c=this.context();return [...this.state.pauses,...(this.state.raid?['raid']:[]),...(this.state.result?['result']:[]),...(document.hidden?['hidden']:[]),...(c.surface?['ui']:[]),...(c.tool?['tool']:[]),...(c.tutorial?['tutorial']:[]),...(c.cinematic||this.world.cinematic?['cinematic']:[]),...(c.notification?['notification']:[]),...(this.failed?['assets']:[])];}
  project(anchor){this.world.camera.updateMatrixWorld();this.point.set(anchor.entity.x+(anchor.offsetX??0),anchor.y,anchor.entity.z+(anchor.offsetZ??0)).project(this.world.camera);const r=this.world.canvas.getBoundingClientRect(),x=(this.point.x+1)*r.width/2,y=(1-this.point.y)*r.height/2;
    if(this.point.z< -1||this.point.z>1||x<100||y<105||x>r.width-100||y>r.height-95)return null;
    // The HUD is sparse. Test actual hit surfaces, not a guessed rectangular safe area.
    const hit=document.elementFromPoint(r.left+x,r.top+y);if(hit&&hit!==this.world.canvas)return null;return {x,y,left:r.left,top:r.top};
  }
  updateAnchors(){const visible=[...(this.world.microeventVisiblePlants??[]),...(this.world.microeventVisibleWood??[])];this.anchors.length=0;if(!visible.length)return;const offset=Math.floor(this.director.random()*visible.length);
    for(let i=0;i<Math.min(24,visible.length);i++){const entity=visible[(offset+i)%visible.length];if(!entity.alive&&!eligibleAnchor({anchor:'wood'},entity))continue;const groundY=this.world.nav.field.surface(entity.x,entity.z),anchor={entity,groundY,y:groundY+1.3};if(this.project(anchor))this.anchors.push(anchor);}
  }
  async spawn(def,anchor,{force=false,economy=true}={}){
    if(this.active||this.pending||this.disposed||!eligibleAnchor(def,anchor?.entity)||!this.project(anchor)||this.blocked().length||!compatible(def,this.state)||!force&&def.category==='nuisance'&&this.director.m.negativeTimes.length>=2||!force&&this.director.m.eventCooldowns[def.id]>0)return false;
    if(this.space){this.space.begin(def,anchor,this.world.camera);this.point.set(anchor.entity.x+(anchor.offsetX??0),anchor.y,anchor.entity.z+(anchor.offsetZ??0));if(this.space.occluded(this.point,this.world.camera,this.world))return false;}
    this.pending=true;const ticket=reserveEvent(this.state,def.id,anchor.entity.id);if(!ticket){this.pending=false;return false;}
    this.director.m.cooldown=MICROEVENT_CONFIG.cooldown;this.director.reserve(def);const commandCount=this.state.commandIds.length,pose=cameraPose(this.world.camera);
    try{
      await this.billboards.ready;const saved=await this.save();
      const cameraUnsafe=this.cameraPointers.size>0||this.owned.size>0||this.clock()<(this.wheelUntil??0)||poseChanged(cameraPose(this.world.camera),pose)||!force&&this.director.cameraStable<MICROEVENT_CONFIG.stable;
      if(!saved||this.disposed||this.blocked().length||cameraUnsafe||this.state.commandIds.length!==commandCount||this.settings.microevents==='off'||!compatible(def,this.state)||!eligibleAnchor(def,anchor.entity)||!this.project(anchor)){settleEvent(this.state,ticket,'cancelled',{enabled:false});return false;}
      this.active={def,anchor,ticket,economy,ending:0,outcome:null};this.director.begin(def,{reserved:true});this.particles.start(def,()=>this.director.random());this.particles.learned=this.learned?.has(def.primary.mode)??false;this.space?.begin(def,anchor,this.world.camera);return true;
    }catch(e){settleEvent(this.state,ticket,'cancelled',{enabled:false});this.failed=true;this.log('error',{message:e.message});return false;}
    finally{this.pending=false;}
  }
  finish(outcome){const a=this.active;if(!a||a.outcome)return;a.outcome=outcome;a.ending=.001;
    const result=settleEvent(this.state,a.ticket,outcome,{enabled:a.economy&&this.settings.microeventEconomy!==false&&this.settings.microevents!=='off',losses:this.settings.microeventLosses!==false});
    this.director.finish(outcome);this.log('economy',{eventId:a.ticket.id,eventType:a.def.id,targetId:a.ticket.targetId,...result,dailyCredit:this.director.m.rewards,dailyReservedLoss:this.director.m.losses});
    if(outcome==='completed'){this.learned?.add(a.def.primary.mode);this.log('completion-gesture',{eventType:a.def.id,method:this.particles?.usedFallback?'accessible-hold':a.def.primary.mode});}
    if(outcome==='completed'&&a.def.sound&&(a.def.sound!=='eco_gain'||result.delta>0)){try{Promise.resolve(this.sound(a.def.sound)).catch(()=>{});}catch{}}
    void this.save();
  }
  cancel(reason){if(this.active&&!this.active.outcome){this.log('cancel',{reason});this.finish('cancelled');}this.active=null;this.pointer.owned=false;this.billboards.clear();}
  refreshQaHit(){
    if(!this.debug||!this.active)return;this.qaTarget=-1;const r=this.world.canvas.getBoundingClientRect();
    for(let i=0;i<this.particles.count;i++){const p=this.particles.pool[i];if(p.progress>=.95||p.reveal<=.2)continue;const projected=this.space.project(p,this.world.camera,r);if(document.elementFromPoint(projected.x,projected.y)===this.world.canvas&&this.space.hit(this.particles,projected.x,projected.y,this.world.camera,r,this.world)>=0){this.qaTarget=i;break;}}
  }
  localPointer(clientX,clientY,rect,screen){return this.space?.anchor?this.space.toLocal(clientX,clientY,rect,this.world.camera)??this.pointer:{x:clientX-rect.left-(screen?.x??0),y:clientY-rect.top-(screen?.y??0)};}
  pointerMotion(clientX,clientY,rect,screen){const local=this.localPointer(clientX,clientY,rect,screen),x=local.x,y=local.y;let vx=this.trace.vx,vy=this.trace.vy;if(this.space?.anchor){const next=this.space.toLocal(clientX+vx*.016,clientY+vy*.016,rect,this.world.camera);if(next){vx=(next.x-x)/.016;vy=(next.y-y)/.016;}}return {x,y,vx,vy};}
  input(name,e){
    const wasOwned=this.owned.has(e.pointerId),onWorld=e.target===this.world.canvas;
    if(['pointerup','pointercancel','lostpointercapture'].includes(name))this.cameraPointers.delete(e.pointerId);
    if(name==='pointerdown'&&this.owned.size&&!wasOwned){this.cancel('multitouch');if(onWorld)this.owned.add(e.pointerId);}
    const a=this.active,screen=a&&this.project(a.anchor),r=this.world.canvas.getBoundingClientRect(),local=this.localPointer(e.clientX,e.clientY,r,screen),x=local.x,y=local.y,now=this.clock();
    const target=name==='pointerdown'&&a&&!a.outcome&&onWorld&&!this.owned.size&&!this.cameraPointers.size?(this.space?.anchor?this.space.hit(this.particles,e.clientX,e.clientY,this.world.camera,r,this.world):(this.particles.hit(x,y)?0:-1)):-1;
    if(name==='pointerdown'&&!this.owned.size&&!this.cameraPointers.size&&a&&!a.outcome&&onWorld&&e.button===0&&!e.shiftKey&&!this.blocked().length&&target>=0){
      this.owned.add(e.pointerId);try{this.world.canvas.setPointerCapture?.(e.pointerId);}catch{}Object.assign(this.pointer,{id:e.pointerId,owned:true,hold:0,x,y,vx:0,vy:0,present:true});this.trace.reset(e.clientX,e.clientY,now);const hit=this.particles.pool?.[target];this.particles.claim?.(target,x,y);this.particles.poke?.(hit?.x??x,hit?.y??y);this.director.interaction();this.metrics.claims=(this.metrics.claims??0)+1;
      const contact=a.def.feedback?.contactSound;if(contact&&!a.contactPlayed){a.contactPlayed=true;try{Promise.resolve(this.sound(contact)).catch(()=>{});}catch{}}
    }else if(name==='pointerdown'&&onWorld&&a&&Math.hypot(x,y)<150){this.metrics.misses++;this.log('gesture-miss',{eventType:a.def.id});}
    if(this.owned.has(e.pointerId)){
      e.preventDefault();e.stopImmediatePropagation();
      if(name==='pointermove'&&this.pointer.id===e.pointerId){this.trace.add(e.clientX,e.clientY,now);if(Math.hypot(this.trace.vx,this.trace.vy)>35)this.pointer.hold=0;Object.assign(this.pointer,this.pointerMotion(e.clientX,e.clientY,r,screen),{present:true});this.director.interaction();}
      if(['pointerup','pointercancel','lostpointercapture'].includes(name)){if(name==='pointerup'){this.pointer.x=x;this.pointer.y=y;this.particles.release?.(this.pointer);}this.owned.delete(e.pointerId);this.pointer.owned=false;this.pointer.present=e.pointerType==='mouse';try{this.world.canvas.releasePointerCapture(e.pointerId);}catch{}if(name!=='pointerup')this.cancel('pointer-cancel');}
      return;
    }
    if(name==='pointerdown'&&onWorld){this.cameraPointers.add(e.pointerId);this.director.cameraStable=0;}
    if(name==='pointermove'&&e.pointerType==='mouse'&&!e.buttons&&onWorld){this.trace.add(e.clientX,e.clientY,now);Object.assign(this.pointer,this.pointerMotion(e.clientX,e.clientY,r,screen),{present:true});}else if(!this.pointer.owned)this.pointer.present=false;
  }
  beforeSimulation(){
    if(this.settings.microevents==='off'||this.settings.microeventEconomy===false)disableMicroEconomy(this.state);
    else if(this.settings.microeventLosses===false)this.director.m.pendingLosses={};
  }
  tick(){
    const start=this.clock(),dt=this.debug&&this.qaFrozen?0:Math.max(0,(start-this.last)/1000);this.last=start;if(this.disposed)return;
    const events=this.state.events,index=events.findIndex(e=>e.id===this.eventTail),fresh=events.slice(index+1);
    if(fresh.some(e=>e.type==='Dawn'))this.log('economy-day',{economicDay:this.director.m.day,credit:this.director.m.rewards,reservedLoss:this.director.m.losses,settledLoss:this.director.m.settledDay===this.director.m.day?this.director.m.settledLoss:0});
    trackIncome(this.state,fresh);for(const e of fresh)if(e.type==='MicroeventHarvestLossApplied')this.log('harvest-loss',{targetId:e.targetId,delta:e.delta,economicDay:this.director.m.settledDay,dailySettledLoss:this.director.m.settledLoss});this.eventTail=events.at(-1)?.id;
    if(this.commandCount!==this.state.commandIds.length){this.commandCount=this.state.commandIds.length;this.director.coreAction();this.cancel('core-action');}
    this.beforeSimulation();
    const pose=cameraPose(this.world.camera),moving=this.cameraPointers.size>0||this.owned.size>0||poseChanged(pose,this.cameraPose)||start<(this.wheelUntil??0);this.cameraPose=pose;
    const blocked=this.blocked();if(this.pending)blocked.push('saving');if(dt>1)blocked.push('frame-gap');
    this.anchorTimer-=dt;if(this.anchorTimer<=0&&!this.active&&!this.pending&&!blocked.length&&FREQUENCIES[this.settings.microevents]&&this.director.coreIdleTime>=7){this.updateAnchors();this.anchorTimer=.75;}
    const opportunity=this.director.step(dt,{frequency:this.settings.microevents,blocked,cameraMoving:moving,state:this.state,anchors:this.anchors});
    if(opportunity?.cancel)this.cancel(opportunity.reason);else if(opportunity&&!this.pending&&!this.active)void this.spawn(opportunity.def,opportunity.anchor);
    const a=this.active;if(a){const reducedMotion=this.reducedMotion??matchMedia('(prefers-reduced-motion: reduce)').matches;const anchor=eligibleAnchor(a.def,a.anchor.entity)&&this.project(a.anchor);if(!anchor){this.cancel('invalid-anchor');return;}
      const sample=this.trace.latest();if(this.pointer.present&&sample){if(this.space?.anchor){const r=this.world.canvas.getBoundingClientRect(),point=this.space.toLocal(sample.x,sample.y,r,this.world.camera);if(point){this.pointer.x=point.x;this.pointer.y=point.y;}}else{this.pointer.x=sample.x-anchor.left-anchor.x;this.pointer.y=sample.y-anchor.top-anchor.y;}}
      if(a.outcome){a.ending+=dt;if(a.ending>.55){this.active=null;this.billboards.clear();return;}}
      else {if(this.pointer.owned){this.pointer.hold+=dt;this.director.interaction();}const completed=this.particles.step(dt,this.pointer,{reducedMotion,allowHold:!this.qaPrimaryOnly||a.def.primary.mode==='hold'});this.pointer.vx*=Math.exp(-10*dt);this.pointer.vy*=Math.exp(-10*dt);if(completed)this.finish('completed');else if(this.particles.time>=a.def.lifetime)this.finish('ignored');}
      this.billboards.draw(this.particles,this.space,{ending:a.ending,outcome:a.outcome,reducedMotion});
      if(this.debug){const data=this.diagnostic.dataset;data.microeventX=String(anchor.left+anchor.x);data.microeventY=String(anchor.top+anchor.y);data.instances=String(this.billboards.count);delete data.microeventHitX;delete data.microeventHitY;const r=this.world.canvas.getBoundingClientRect(),p=this.particles.pool[this.qaFrozen?this.qaTarget:0];if(p&&p.progress<.95&&p.reveal>.2){const projected=this.space.project(p,this.world.camera,r);if(document.elementFromPoint(projected.x,projected.y)===this.world.canvas){data.microeventHitX=String(projected.x);data.microeventHitY=String(projected.y);}}}
    }
    this.metrics.frameMs=this.clock()-start;
    if(this.debug&&a&&!a.outcome){this.frameSamples.push(this.metrics.frameMs);this.frameIntervals.push(dt*1000);if(this.frameSamples.length>256){this.frameSamples.shift();this.frameIntervals.shift();}}
    if(this.diagnostic&&start-(this.lastDiagnostic??0)>200){this.lastDiagnostic=start;this.diagnostic.dataset.metrics=JSON.stringify({...this.metrics,frameSamples:this.frameSamples,frameIntervals:this.frameIntervals});this.diagnostic.textContent=`Microevents · ${this.active?.def.id??'quiet'}\ncore ${this.director.coreIdleTime.toFixed(1)} · quiet ${this.director.microQuietTime.toFixed(1)} · stable ${this.director.cameraStable.toFixed(1)}\nscore ${this.director.score.toFixed(3)} · cooldown ${this.director.m.cooldown.toFixed(1)}\n${this.director.reasons.join(', ')}\n${this.metrics.frameMs.toFixed(2)} ms · done ${this.metrics.completed} · ignored ${this.metrics.ignored} · rescue ${this.metrics.rescued}`;}
  }
  async force(id,{economy=false}={}){this.updateAnchors();const def=EVENTS[id];if(!def)return false;for(const anchor of this.anchors)if(eligibleAnchor(def,anchor.entity)&&await this.spawn(def,anchor,{force:true,economy}))return true;return false;}
  dispose(){this.cancel('dispose');this.disposed=true;this.abort.abort();this.billboards.dispose();if(this.world.beforeMicroeventDraw===this.renderUpdate)this.world.beforeMicroeventDraw=this.previousBeforeDraw;this.diagnostic?.remove();this.qaControls?.remove();for(const id of this.owned)try{this.world.canvas.releasePointerCapture(id);}catch{}this.owned.clear();}
}
