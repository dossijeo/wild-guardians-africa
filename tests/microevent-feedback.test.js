import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENTS} from '../src/microevents/definitions.js';
import {InteractiveParticles} from '../src/microevents/particles.js';
import {FEEDBACK_SPRITES} from '../src/microevents/feedback.js';

test('flying creatures move quickly without pointer input and turn inside a bounded volume',()=>{
 for(const id of ['birds','fireflies','butterflies','beetle','locusts','insects','spirit']){
  const d=EVENTS[id],p=new InteractiveParticles();p.start(d,()=>.37);let travel=0,turns=0,previous={...p.pool[0]};
  for(let i=0;i<240;i++){p.step(1/60,null);const a=p.pool[0];travel+=Math.hypot(a.x-previous.x,a.y-previous.y);if(a.vx*previous.vx<0)turns++;assert.ok(Math.abs(a.x)<180&&Math.abs(a.y)<125,id);previous={...a};}
  assert.ok(travel/4>70,id+' must remain visibly mobile');assert.ok(turns>0,id+' changes horizontal direction');assert.equal(p.progress,0);
 }
});
test('fast flight remains catchable by accessible owned hold at 30, 60 and 120 Hz',()=>{
 for(const d of Object.values(EVENTS).filter(d=>d.flight))for(const fps of [30,60,120]){
  const p=new InteractiveParticles();p.start(d,()=>.37);let complete=false;for(let i=0;i<fps*2;i++)complete=p.step(1/fps,{owned:true,hold:1,x:0,y:0,present:true})||complete;assert.equal(complete,true,d.id);
 }
});
test('contact VFX require earned progress; hover and ignoring do not emit completion feedback',()=>{
 const p=new InteractiveParticles();p.start(EVENTS.birds,()=>.37);p.step(.1,{present:true,x:0,y:0,owned:false});assert.ok(p.pool.slice(0,p.count).every(p=>p.feedbackAt<0));
 for(let i=0;i<20;i++)p.step(.05,{present:true,owned:true,hold:1,x:0,y:0});assert.ok(p.pool.slice(0,p.count).some(p=>p.feedbackAt>0));
 p.start(EVENTS.birds,()=>.37);assert.ok(p.pool.slice(0,p.count).every(p=>p.feedbackAt<0));
});
test('all feedback uses authored atlas sprites and existing short non-looping SFX',()=>{
 const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url))).items;
 for(const d of Object.values(EVENTS)){assert.ok(FEEDBACK_SPRITES[d.feedback.vfx],d.id);for(const id of [d.sound,d.feedback.contactSound].filter(Boolean)){const clip=bank.find(x=>x.id===id);assert.ok(clip,id);assert.equal(clip.loop,false);assert.ok(clip.duration<=2,id);}}
 assert.equal(EVENTS.birds.sound,null);assert.equal(EVENTS.birds.feedback.contactSound,null);
});
