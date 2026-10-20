import {EVENTS,FREQUENCIES,MICROEVENT_CONFIG as C,compatible,eligibleAnchor} from './definitions.js';
export class AttentionDirector {
  constructor(memory,{random,telemetry=()=>{}}={}){this.m=memory;this.random=random??(()=>{let x=this.m.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.m.rng=x>>>0;return this.m.rng/4294967296;});this.log=telemetry;this.coreIdleTime=0;this.microQuietTime=0;this.cameraStable=0;this.time=0;this.rescue=[];this.score=0;this.reasons=[];this.active=null;this.m.ticket=null;this.m.cooldown=Math.max(C.cooldown,this.m.cooldown);}
  coreAction(){for(const r of this.rescue)if(this.time-r.at<=15&&!r.rescued){r.rescued=true;this.log('idle-rescue',{eventType:r.type,latency:this.time-r.at});}this.coreIdleTime=0;this.cancel('core-action');}
  interaction(){this.microQuietTime=0;if(this.active&&!this.active.interacted){this.active.interacted=true;this.log('first-interaction',{eventType:this.active.type,latency:this.active.age});}}
  step(dt,{frequency='adaptive',blocked=[],cameraMoving=false,state,anchors=[]}={}){
    this.time+=dt;this.coreIdleTime+=dt;this.microQuietTime+=dt;this.cameraStable=cameraMoving?0:this.cameraStable+dt;
    this.m.cooldown=Math.max(0,this.m.cooldown-dt);
    for(const id of Object.keys(this.m.eventCooldowns))this.m.eventCooldowns[id]=Math.max(0,this.m.eventCooldowns[id]-dt);
    this.m.negativeTimes=this.m.negativeTimes.map(t=>t-dt).filter(t=>t>0);
    this.rescue=this.rescue.filter(r=>this.time-r.at<=15);
    this.reasons=[...blocked];if(!FREQUENCIES[frequency])this.reasons.push('off');if(cameraMoving||this.cameraStable<C.stable)this.reasons.push('camera');
    if(this.active){if(blocked.length||!FREQUENCIES[frequency])return this.cancel(blocked[0]??'off');this.active.age+=dt;return null;}
    if(this.coreIdleTime<C.earliest)this.reasons.push('core-active');if(this.m.cooldown>0||this.microQuietTime<C.cooldown)this.reasons.push('cooldown');if(!anchors.length)this.reasons.push('no-anchor');
    this.score=0;if(this.reasons.length)return null;
    const candidates=Object.values(EVENTS).filter(d=>compatible(d,state)&&anchors.some(a=>!a.entity||eligibleAnchor(d,a.entity))&&(d.category!=='emergency'||!(this.m.eventCooldowns.__emergency>0))&&!(this.m.eventCooldowns[d.id]>0)&&(d.category!=='nuisance'||this.m.negativeTimes.length<2));
    if(!candidates.length)return null;
    const fatigue=this.m.ignored>=3?.5:1;
    this.score=C.opportunityRate*FREQUENCIES[frequency]*fatigue*Math.min(1,(this.coreIdleTime-C.earliest+3)/12);
    this.log('opportunity',{score:this.score});if(this.random()>=1-Math.exp(-this.score*dt))return null;
    const weighted=candidates.map(d=>[d,d.weight*(this.m.history.includes(d.id)?.35:1)*(this.m.ignored>=3&&d.category==='nuisance'?.2:1)]);
    let roll=this.random()*weighted.reduce((n,[,w])=>n+w,0);const def=weighted.find(([,w])=>(roll-=w)<=0)?.[0]??weighted.at(-1)[0];
    const eligible=anchors.filter(a=>!a.entity||eligibleAnchor(def,a.entity));return {def,anchor:eligible[Math.floor(this.random()*eligible.length)]};
  }
  reserve(def){this.m.history=[...this.m.history,def.id].slice(-6);this.m.eventCooldowns[def.id]=def.cooldown;if(def.category==='emergency')this.m.eventCooldowns.__emergency=360;if(def.category==='nuisance')this.m.negativeTimes=[...this.m.negativeTimes,120].slice(-2);}
  begin(def,{reserved=false}={}){const rescue={type:def.id,at:this.time,rescued:false};this.rescue.push(rescue);this.active={type:def.id,age:0,interacted:false,rescue};if(!reserved)this.reserve(def);this.log('spawn',{eventType:def.id,category:def.category});}
  finish(outcome){if(!this.active)return;const active=this.active;active.rescue.at=this.time;this.log(outcome,{eventType:active.type,duration:active.age});if(outcome==='ignored')this.m.ignored++;else if(outcome==='completed')this.m.ignored=Math.max(0,this.m.ignored-1);this.active=null;this.microQuietTime=0;this.m.cooldown=C.cooldown;}
  cancel(reason){if(!this.active)return null;this.log('cancel',{reason});return {cancel:true,reason};}
}
