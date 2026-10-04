import test from 'node:test';
import assert from 'node:assert/strict';
import {TerrainField} from '../src/world/terrain.js';
import {mudPatchGeometry,mudContainsPoint,residentMudSurface} from '../src/rendering/mud-patches.js';
import {MovementAudio} from '../src/audio/movement-audio.js';
import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';
const flush=()=>new Promise(done=>setImmediate(done));
test('every emitted mud triangle centroid is classified by its exact resident outline in signed chunks',()=>{
  const field=new TerrainField({seed:'712',biome:'mangrove',river:true,relief:1}),chunks=new Map();let checked=0;
  for(const [cx,cz] of [[0,0],[1,0],[-1,-1]]){
    const geometry=mudPatchGeometry(field,cx,cz);assert.ok(geometry);chunks.set(cx+','+cz,{userData:{mudSurface:geometry.userData}});const p=geometry.attributes.position;
    for(let i=0;i<p.count;i+=3){const x=cx*48+(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=cz*48+(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;assert.equal(residentMudSurface(chunks,x,z),'mud');checked++;}
    for(const [k,contour] of geometry.userData.mudOutlines.entries()){const c=geometry.userData.mudCenters[k];assert.equal(mudContainsPoint(geometry.userData,c.x,c.z),true);assert.equal(mudContainsPoint(geometry.userData,contour[0][0],contour[0][1]),true);}
    const c=geometry.userData.mudCenters[0];chunks.delete(cx+','+cz);assert.equal(residentMudSurface(chunks,c.x,c.z),null,'Disposed chunks cannot retain an audible surface');geometry.dispose();
  }
  assert.ok(checked>1000);assert.equal(residentMudSurface(chunks,NaN,0),null);
});
test('concave contour rejects its bounding-circle corners and includes edges',()=>{
  const surface={mudCenters:[{x:0,z:0,radius:3}],mudOutlines:[[[-2,-2],[2,-2],[2,-1],[-1,-1],[-1,2],[-2,2]]]};
  assert.equal(mudContainsPoint(surface,1,1),false);assert.equal(mudContainsPoint(surface,-1.5,1),true);assert.equal(mudContainsPoint(surface,-1,1),true);assert.equal(mudContainsPoint(surface,100,100),false);assert.equal(mudContainsPoint(null,0,0),false);
});
for(const profile of ['youngMale','youngFemale','olderMale','olderFemale'])test(profile+': the authored toe point chooses mud even when the body is on moss',async()=>{
  const clip=FOOTSTEPS.sources[profile].clips.Walk_Skip,step=clip.contacts[0],actor={id:'worker',profile,x:0,z:0,status:'walking',walkPhase:step.time-.04,heading:.8},s={elapsed:0,biome:'manglares',pauses:[],workers:[actor]},calls=[],queries=[];
  const audio=new MovementAudio((id,o)=>{calls.push({id,o});return null;},()=>{},()=>0);audio.update(s);actor.x=.06;actor.walkPhase=step.time+.04;s.elapsed=.08;
  audio.update(s,{surfaceAt:(x,z)=>{queries.push([x,z]);return 'mud';}});await flush();assert.equal(calls.length,1);assert.equal(calls[0].id,'step_mud');
  const [px,pz]=step.point,c=Math.cos(actor.heading),sin=Math.sin(actor.heading);assert.ok(Math.abs(queries[0][0]-(.03+c*px+sin*pz))<1e-8);assert.ok(Math.abs(queries[0][1]-(-sin*px+c*pz))<1e-8);
  const n=queries.length;s.elapsed+=.08;actor.walkPhase+=.08;audio.update(s,{surfaceAt:()=>{throw Error('Stationary pose should not query ground');}});assert.equal(queries.length,n);audio.dispose();
});
for(const actor of [{id:'runner',profile:'olderMale',status:'walking',running:true,runPhase:0,x:0,z:0},{id:'beast',species:'warthog',status:'walking',motionPhase:0,x:0,z:0}])test(actor.id+': surface-independent originals never query mud',async()=>{
  const calls=[],s={elapsed:0,biome:'manglares',pauses:[],workers:actor.profile?[actor]:[],raid:actor.profile?null:{animals:[actor]}},key=actor.profile?'runPhase':'motionPhase',audio=new MovementAudio(id=>{calls.push(id);return null;},()=>{},()=>0),options={surfaceAt:()=>{throw Error('Unnecessary terrain query');}};
  audio.update(s,options);for(let i=0;i<100;i++){actor[key]+=.05;actor.x+=.07;s.elapsed+=.05;audio.update(s,options);}await flush();assert.ok(calls.length>0);assert.ok(calls.every(id=>id===(actor.profile?'run_surface_set':'beast_step_light')));audio.dispose();
});
