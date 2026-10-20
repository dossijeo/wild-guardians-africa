import test from 'node:test';
import assert from 'node:assert/strict';
import {EVENTS} from '../src/microevents/definitions.js';
import {INTERACTIONS,interactionRate,circulation} from '../src/microevents/interactions.js';
import {InteractiveParticles} from '../src/microevents/particles.js';
const random=()=>{let n=341;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};};
const started=id=>{const p=new InteractiveParticles();p.start(EVENTS[id],random());return p;};

test('every catalogue event has an explicit shared primary interaction and hold alternative',()=>{
 assert.equal(Object.keys(INTERACTIONS).length,40);for(const d of Object.values(EVENTS)){assert.ok(d.primary?.mode,d.id);assert.ok(d.interactions.includes('hold'),d.id);if(d.primary.mode==='catch'){assert.ok(d.interactions.includes('tap'));assert.equal(d.tapStrength,1);}}
});
test('radial sweeps do not count as circular movement; either circular direction works',()=>{
 const p={x:0,y:0,reveal:1},pointer={owned:true,present:true,x:30,y:0,vx:300,vy:0};
 assert.equal(circulation(pointer),0);assert.equal(interactionRate(INTERACTIONS.vortex,pointer,p,30,.7),0);
 for(const vy of [-300,300])assert.ok(interactionRate(INTERACTIONS.vortex,{...pointer,vx:0,vy},p,30,.7)>1);
});
test('swirl physics follows pointer circulation instead of imposing a constant spin',()=>{
 function response(vy){const p=started('vortex');p.start({...EVENTS.vortex,count:1,behavior:{swirl:500,damping:0,maxSpeed:1000,wander:0}},()=>.5);Object.assign(p.pool[0],{x:0,y:0,vx:0,vy:0});p.step(.1,{present:true,owned:false,x:30,y:0,vx:0,vy});return p.pool[0].vy;}
 assert.equal(response(0),0);assert.ok(response(250)>0);assert.ok(response(-250)<0);
});
test('brushing and rubbing require motion; a motionless contact uses the explicit hold alternative',()=>{
 const pointer={owned:true,present:true,x:0,y:0,vx:0,vy:0},p={x:0,y:0,reveal:1};
 for(const id of ['fire','web','termites','hail']){assert.equal(interactionRate(INTERACTIONS[id],pointer,p,0,1),0);assert.ok(interactionRate(INTERACTIONS[id],{...pointer,vx:160},p,0,1)>0);}
});
test('a full touch catch emits immediate contact VFX even when released before the next frame',()=>{
 for(const id of ['beetle','spirit','star','feather','rareseed']){const p=started(id),target=p.pool[0];assert.equal(p.poke(target.x,target.y),true);assert.equal(target.progress,1,id);assert.equal(target.feedbackAt,0,id);p.step(1/60,null);assert.ok(p.progress>=p.def.threshold,id);}
});
test('rain cloud can be dragged and dropped over its crop target without hold',()=>{
 const p=started('raincloud'),first=p.pool[0],start={x:first.x,y:first.y};p.claim(0,start.x,start.y);
 for(let i=1;i<=120;i++){const t=i/120;p.step(1/60,{owned:true,present:true,x:start.x*(1-t),y:start.y*(1-t),vx:-start.x/2,vy:-start.y/2,hold:0});}
 p.release({owned:true,x:0,y:0});p.step(1/60,null);assert.ok(p.progress>=p.def.threshold,p.progress);assert.equal(p.usedFallback,false);
});
test('gathering outside the destination cannot settle on release, and cancellation cannot collect',()=>{
 const p=started('grain');for(let i=0;i<p.count;i++)Object.assign(p.pool[i],{x:100,y:0});p.claim(0,100,0);p.release({owned:true,x:100,y:0});assert.ok(p.pool.slice(0,p.count).every(p=>p.progress===0));
 for(let i=0;i<p.count;i++)Object.assign(p.pool[i],{x:0,y:0});p.release({owned:false,x:0,y:0});assert.ok(p.pool.slice(0,p.count).every(p=>p.progress===0));p.release({owned:true,x:0,y:0});assert.ok(p.pool.slice(0,p.count).every(p=>p.progress===1));
});
test('a weed needs a deliberate pull; release uproots only the claimed clump',()=>{
 const p=started('weeds'),a=p.pool[0];p.claim(0,a.x,a.y);p.release({owned:true,x:a.x,y:a.y});assert.equal(a.progress,0);p.release({owned:true,x:a.claimX,y:a.claimY-50});assert.equal(a.progress,1);assert.ok(p.pool.slice(1,p.count).every(p=>p.progress===0));
});
test('snake guidance moves the head away and preserves the following body',()=>{
 const p=started('snake');let complete=false;for(let i=0;i<420;i++){const head=p.pool[0];complete=p.step(1/60,{owned:true,present:true,x:head.x-35,y:head.y,vx:110,vy:0,hold:0})||complete;for(let k=1;k<p.count;k++)assert.ok(Math.hypot(p.pool[k].x-p.pool[k-1].x,p.pool[k].y-p.pool[k-1].y)<=p.def.behavior.chain+.001);if(complete)break;}assert.equal(complete,true);assert.equal(p.usedFallback,false);
});
test('accessible hold remains explicit and is reset when a pooled event restarts',()=>{
 const p=started('vortex');for(let i=0;i<120;i++)p.step(1/60,{owned:true,present:true,x:0,y:0,hold:1});assert.equal(p.usedFallback,true);assert.ok(p.progress>=p.def.threshold);p.start(EVENTS.vortex,random());assert.equal(p.usedFallback,false);assert.equal(p.engaged,false);
});


test('slow presentation frames preserve real-time hold completion for the entire catalogue',()=>{
 for(const def of Object.values(EVENTS))for(const fps of [5,10,15]){const p=new InteractiveParticles();p.start(def,random());p.claim(0,p.pool[0].x,p.pool[0].y);for(let i=0;i<fps*2;i++)p.step(1/fps,{owned:true,present:true,x:0,y:0,hold:1});assert.ok(p.progress>=def.threshold,def.id+'/'+fps);}
});
test('cloud drag remains usable at low frame rates without an accessible hold contribution',()=>{
 for(const fps of [10,15,30,60,120]){const p=started('raincloud'),start={x:p.pool[0].x,y:p.pool[0].y};p.claim(0,start.x,start.y);for(let i=1;i<=fps*2;i++){const t=i/(fps*2);p.step(1/fps,{owned:true,present:true,x:start.x*(1-t),y:start.y*(1-t),vx:-start.x/2,vy:-start.y/2,hold:0});}p.release({owned:true,x:0,y:0});p.step(1/fps,null);assert.ok(p.progress>=p.def.threshold,'fps '+fps);assert.equal(p.usedFallback,false);}
});


test('primary-only verification cannot be satisfied by stationary accessible hold',()=>{
 const p=started('vortex');p.claim(0,p.pool[0].x,p.pool[0].y);for(let i=0;i<120;i++)p.step(1/60,{owned:true,present:true,x:0,y:0,vx:0,vy:0,hold:1},{allowHold:false});assert.equal(p.progress,0);assert.equal(p.usedFallback,false);
 for(let i=0;i<360;i++){const a=i/60*6;p.step(1/60,{owned:true,present:true,x:65*Math.cos(a),y:65*Math.sin(a),vx:-390*Math.sin(a),vy:390*Math.cos(a),hold:1},{allowHold:false});}assert.ok(p.progress>=p.def.threshold);assert.equal(p.usedFallback,false);
});


test('wood-attached insects remain within the visible face band after strong sweeps',()=>{
 const p=started('termites'),bounds=p.def.bounds;for(let i=0;i<420;i++){p.step(1/60,{owned:true,present:true,x:0,y:35,vx:-500,vy:-500,hold:0},{allowHold:false});for(let k=0;k<p.count;k++){assert.ok(p.pool[k].y>=bounds.minY);assert.ok(p.pool[k].y<=bounds.maxY);}}assert.equal(p.usedFallback,false);
});
test('clearing an insect from its local patch requires a real brush, not ambient hover',()=>{
 for(const owned of [false,true]){const p=started('termites'),a=p.pool[0];Object.assign(a,{x:80,y:0,homeX:0,homeY:0,vx:0,vy:0});p.step(1/60,{present:true,owned,x:80,y:0,vx:200,vy:0,hold:0},{allowHold:false});assert.equal(a.progress===1,owned);}
});
