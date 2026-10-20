import {clamp,circulation,interactionRate} from './interactions.js';
export class InteractiveParticles {
  constructor(capacity=30){this.pool=Array.from({length:capacity},()=>({}));this.count=0;this.time=0;}
  start(def,random=Math.random){
    this.def=def;this.count=Math.min(def.count,this.pool.length);this.time=0;this.progress=0;this.engaged=false;this.usedFallback=false;
    for(let i=0;i<this.count;i++){
      const a=random()*Math.PI*2,r=15+random()*43,p=this.pool[i];
      Object.assign(p,{x:Math.cos(a)*r,y:Math.sin(a)*r*.65,vx:(random()-.5)*14,vy:(random()-.5)*12,rotation:def.formation==='ground'?0:random()*6.28,spin:(random()-.5)*.7,size:def.size,phase:random()*6.28,progress:0,reveal:1,feedbackAt:-10,feedbackProgress:0,disturbed:false,claimed:false,claimX:0,claimY:0,dragX:0,dragY:0});
      if(def.formation==='trail'){p.x=(i-this.count/2)*7;p.y=Math.sin(i*.7)*8;}
      if(def.formation==='cloud'){p.x-=85;p.y-=40;}
      if(def.formation==='ground'){p.x=(i-this.count/2)*8;p.y=15+random()*8;}
      if(def.formation==='ring'){p.x=Math.cos(a)*48;p.y=Math.sin(a)*30;}
      if(def.formation==='fall'){p.x=(random()-.5)*150;p.y=-95+random()*90;p.vy=20+random()*20;}
      if(def.formation==='comet'){p.x=-110;p.y=-55;p.vx=110;p.vy=24;}
      if(def.formation==='spill'){p.x=35+random()*75;p.y=-35+random()*60;}
      if(def.formation==='chain'){p.x=45-i*12;p.y=Math.sin(i*.65)*10;p.vx=15;}
      if(def.formation==='tower'){p.x=(random()-.5)*45;p.y=20-i*7;}
      if(def.flight){p.heading=p.phase;p.vx=Math.cos(p.heading)*def.flight.speed;p.vy=Math.sin(p.heading)*def.flight.speed;}
      p.homeX=p.x;p.homeY=p.y;
    }
  }
  claim(target,x,y){
    this.engaged=true;
    for(let i=0;i<this.count;i++){const p=this.pool[i];p.claimed=i===target||this.def.primary?.drag==='cluster';p.claimX=x;p.claimY=y;p.dragX=p.x-x;p.dragY=p.y-y;}
  }
  release(pointer){
    const policy=this.def.primary;if(!pointer?.owned||!policy)return;
    for(let i=0;i<this.count;i++){const p=this.pool[i];
      if(policy.mode==='gather'&&Math.hypot(p.x,p.y)<policy.targetRadius)this.advance(p,1);
      if(policy.mode==='pull'&&p.claimed&&Math.hypot(pointer.x-p.claimX,pointer.y-p.claimY)>36)this.advance(p,1);
    }
  }
  advance(p,amount){
    if(amount<=0)return;p.progress=clamp(p.progress+amount,0,1);
    if(p.progress-p.feedbackProgress>=.18){p.feedbackAt=this.time;p.feedbackX=p.x;p.feedbackY=p.y;p.feedbackProgress=p.progress;}
  }
  poke(x,y){
    if(!this.def.interactions.includes('tap'))return false;
    let touched=false;for(let i=0;i<this.count;i++){const p=this.pool[i];if(p.reveal>.2&&Math.hypot(x-p.x,y-p.y)<(this.def.hitRadius??40)){this.engaged=true;this.advance(p,this.def.tapStrength??.65);touched=true;}}
    return touched;
  }
  step(dt,pointer,{reducedMotion=false,allowHold=true}={}){
    this.time+=dt;const simulated=Math.min(dt,.25),steps=Math.max(1,Math.ceil(simulated/(1/120))),h=simulated/steps,b=this.def.behavior;
    for(let step=0;step<steps;step++)for(let i=0;i<this.count;i++){
      const time=this.time-simulated+(step+1)*h,p=this.pool[i],dx=(pointer?.x??1e5)-p.x,dy=(pointer?.y??1e5)-p.y,d=Math.hypot(dx,dy),range=95,near=pointer?.present&&d<range,f=near?1-d/range:0;
      p.reveal=this.def.reveal?Math.max(.05,Math.sin(time*2.8+p.phase)):1;
      if(near&&(!b.chain||i===0)){
        const sign=b.repel?-1:1,strength=(b.repel??b.attract??0)*f;
        p.vx+=sign*dx/Math.max(1,d)*strength*h;p.vy+=sign*dy/Math.max(1,d)*strength*h;
        p.vx+=(pointer.vx??0)*(b.advection??0)*f*h;p.vy+=(pointer.vy??0)*(b.advection??0)*f*h;
        const spin=clamp(circulation(pointer)/160,-1,1);
        p.vx+=-dy/Math.max(1,d)*(b.swirl??0)*spin*f*h;p.vy+=dx/Math.max(1,d)*(b.swirl??0)*spin*f*h;

      }
      const policy=this.def.primary??{mode:this.def.objective==='gather'?'gather':'brush',targetRadius:38};
      const rate=interactionRate(policy,pointer,p,d,f);if(rate>0)p.disturbed=true;this.advance(p,h*rate);
      if(pointer?.owned&&p.claimed&&(policy.drag==='cluster'||policy.mode==='pull')){
        const gather=policy.drag==='cluster'&&Math.hypot(pointer.x,pointer.y)<55 ? .45 : 1;
        p.vx+=(pointer.x+p.dragX*gather-p.x)*32*h;p.vy+=(pointer.y+p.dragY*gather-p.y)*32*h;
      }
      // Hold is an accessible alternative after a visible particle has claimed input.
      if(allowHold&&pointer?.owned&&pointer.hold>.2){this.advance(p,h/this.def.hold);if(policy.mode!=='hold')this.usedFallback=true;}
      if(b.disperse&&p.progress){p.vx+=Math.cos(p.phase)*p.progress*70*h;p.vy-=p.progress*40*h;}
      if(b.pull)p.vy-=p.progress*70*h;
      if(b.rooted&&p.progress<.6){p.vx+=(p.homeX-p.x)*b.rooted*h;p.vy+=(p.homeY-p.y)*b.rooted*h;}
      if(b.orbit){const radius=Math.max(1,Math.hypot(p.x,p.y));p.vx+=(-p.y/radius*b.orbit-p.x*(radius-45)*.04)*h;p.vy+=(p.x/radius*b.orbit-p.y*(radius-45)*.04)*h;}
      if(b.chain&&i){const previous=this.pool[i-1],cx=previous.x-p.x,cy=previous.y-p.y,length=Math.max(1,Math.hypot(cx,cy)),pull=(length-b.chain)*65;p.vx+=cx/length*pull*h;p.vy+=cy/length*pull*h;}
      p.vx+=(Math.cos(time*1.7+p.phase)*(b.wander??8)+(b.wind??0))*h;
      p.vy+=(Math.sin(time*1.3+p.phase)*(b.wander??7)+(b.gravity??0))*h;
      if(this.def.flight){const f=this.def.flight;let heading=p.phase+Math.sin(time*2.3+p.phase)*1.5+time*.8;
        // Steer back before reaching the local volume edges; no camera-following teleport.
        if(Math.abs(p.x)>f.width-35||Math.abs(p.y)>f.height-30)heading=Math.atan2(-p.y,-p.x);
        const steering=1-Math.exp(-f.turn*h),speed=f.speed*(.85+.15*Math.sin(time*3+p.phase));
        p.vx+=(Math.cos(heading)*speed-p.vx)*steering;p.vy+=(Math.sin(heading)*speed-p.vy)*steering;
      }
      const damping=Math.exp(-(this.def.flight ? .25 : b.damping)*h);p.vx*=damping;p.vy*=damping;const speed=Math.hypot(p.vx,p.vy);if(speed>b.maxSpeed){p.vx*=b.maxSpeed/speed;p.vy*=b.maxSpeed/speed;}
      const motion=reducedMotion?.45:1;p.x+=p.vx*h*motion;p.y+=p.vy*h*motion;p.rotation+=p.spin*h;
      if(this.def.formation==='fall'&&p.progress<.1&&p.y>125){p.y=-110;p.x=clamp(p.x,-150,150);}
      if(b.chain&&i){const previous=this.pool[i-1],cx=p.x-previous.x,cy=p.y-previous.y,length=Math.hypot(cx,cy);if(length>b.chain){p.x=previous.x+cx/length*b.chain;p.y=previous.y+cy/length*b.chain;}}
      const bounds=this.def.bounds;
      if(bounds){
        if(p.x<bounds.minX||p.x>bounds.maxX)p.vx*=-.35;
        if(p.y<bounds.minY||p.y>bounds.maxY)p.vy*=-.35;
      }
      p.x=clamp(p.x,bounds?.minX??-190,bounds?.maxX??190);p.y=clamp(p.y,bounds?.minY??-135,bounds?.maxY??135);
      if(policy.clearDistance&&p.disturbed&&Math.hypot(p.x-p.homeX,p.y-p.homeY)>=policy.clearDistance)this.advance(p,1);
    }
    if(this.def.primary?.mode==='guide'&&pointer?.owned){const head=this.pool[0],distance=Math.hypot(head.x,head.y);if(distance>=this.def.primary.exitRadius)for(let i=0;i<this.count;i++)this.advance(this.pool[i],1);}
    let total=0;for(let i=0;i<this.count;i++)total+=this.pool[i].progress;this.progress=total/this.count;
    return this.progress>=this.def.threshold;
  }
  hit(x,y){for(let i=0;i<this.count;i++){const p=this.pool[i];if(p.progress<.95&&p.reveal>.2&&Math.hypot(x-p.x,y-p.y)<(this.def.hitRadius??40))return true;}return false;}
}
