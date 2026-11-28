import test from 'node:test';import assert from 'node:assert/strict';import {FOOTSTEPS} from '../src/rendering/footsteps-data.js';import {actorTickState} from '../src/simulation/worker-actor-tick-states.js';import {movingPose,locomotionStepsBetween,createLocomotionStepTracker} from '../src/rendering/locomotion-contact.js';
for(const [id,source] of Object.entries(FOOTSTEPS.sources))for(const [name,clip] of Object.entries(source.clips))test(`${id}/${name}: shared contact rule matches live tracker`,()=>{
 const worker=id.endsWith('Male')||id.endsWith('Female'),base=worker?{id,profile:id,status:name==='Carry_Crate'?'carrying':'walking',running:name==='Run'}:{id,species:id,status:name==='Running'?'entering':'walking'},phaseKey=worker?name==='Carry_Crate'?'carryPhase':name==='Run'?'runPhase':'walkPhase':'motionPhase',phase=clip.duration+clip.contacts[0].time-.02,actor={...base,x:0,z:0,[phaseKey]:phase},state={elapsed:10,workers:worker?[actor]:[],raid:worker?null:{animals:[actor]}},tracker=createLocomotionStepTracker(),previous={x:actor.x,z:actor.z,pose:movingPose(actor)};assert.deepEqual(tracker.observe(state,()=>.7),[]);actor.x=.2;actor.z=.1;actor[phaseKey]=phase+.04;state.elapsed=10.1;const expected=locomotionStepsBetween(actor,previous,10,10.1,.7);assert.ok(expected.length);const marker=clip.contacts[0],step=expected.find(item=>item.key.endsWith('/1/0'));assert.ok(step);assert.ok(Math.abs(step.birth-10.05)<1e-9);assert.ok(Math.abs(step.x-(.1+Math.cos(.7)*marker.point[0]+Math.sin(.7)*marker.point[1]))<1e-9);assert.ok(Math.abs(step.z-(.05-Math.sin(.7)*marker.point[0]+Math.cos(.7)*marker.point[1]))<1e-9);assert.deepEqual(tracker.observe(state,()=>.7),expected);assert.deepEqual(locomotionStepsBetween(actor,previous,10,10.3,.7),[]);
});

test('preview preserves the live tracker and requires exact observations and a known heading',()=>{
 const clip=FOOTSTEPS.sources.youngMale.clips.Walk_Skip,phase=clip.duration+clip.contacts[0].time-.02,actor={id:'w',profile:'youngMale',status:'walking',x:0,z:0,heading:.7,walkPhase:phase},state={elapsed:10,workers:[actor],tasks:[],raid:null},tracker=createLocomotionStepTracker();tracker.observe(state,()=>.7);const first=actorTickState(actor,10),end={...actor,x:.2,z:.1,walkPhase:phase+.04},last=actorTickState(end,10.1),preview={start:10,end:10.1,trace:{actorTickStates:{complete:true,actors:[{actorId:'w',samples:[first,last]}]}}};
 assert.equal(tracker.preview(state,preview,{headingAtEnd:()=>null}),null);const forecast=tracker.preview(state,preview,{headingAtEnd:()=>.7});assert.equal(forecast.length,1);assert.deepEqual(tracker.preview(state,preview,{headingAtEnd:()=>.7}),forecast);const bad=structuredClone(preview);bad.trace.actorTickStates.actors[0].samples[0].x=1;assert.equal(tracker.preview(state,bad,{headingAtEnd:()=>.7}),null);Object.assign(actor,end);state.elapsed=10.1;assert.deepEqual(tracker.observe(state,()=>.7),forecast);assert.equal(tracker.preview(state,preview,{headingAtEnd:()=>.7}),null);
});

test('the first night continuation at the contact horizon survives clock rounding',()=>{
 const start=299.99999999996135,end=300.2499999999614;
 const tracker=createLocomotionStepTracker();
 const resting={id:'worker-6',profile:'youngMale',status:'home',x:60,z:0,heading:0};
 const home={elapsed:start,workers:[resting],tasks:[],raid:null};
 const preview={start,end,trace:{actorTickStates:{complete:true,actors:[{
  actorId:resting.id,samples:[actorTickState(resting,start),actorTickState(resting,end)],
 }]}}};
 const headingAtEnd=()=>{throw Error('A stationary interval has no contact heading');};
 assert.ok(end-start>.25);
 tracker.observe(home);
 assert.deepEqual(tracker.preview(home,preview,{headingAtEnd}),[]);
 assert.equal(tracker.preview(home,{...preview,end:end+1e-6},{headingAtEnd}),null);

 const clip=FOOTSTEPS.sources.youngMale.clips.Walk_Skip;
 const phase=clip.duration+clip.contacts[0].time;
 const worker={...resting,status:'walking',x:0,heading:.7,walkPhase:phase-.02};
 const walking={elapsed:start,workers:[worker],tasks:[],raid:null};
 const next={...worker,x:.2,walkPhase:phase+.02};
 const first=actorTickState(worker,start),last=actorTickState(next,end);
 const movement={...preview,trace:{actorTickStates:{complete:true,actors:[{actorId:worker.id,samples:[first,last]}]}}};
 tracker.observe(walking);
 const forecast=tracker.preview(walking,movement,{headingAtEnd:()=>.7});
 assert.equal(forecast.length,1);
 assert.ok(Math.abs(forecast[0].birth-(start+(end-start)/2))<1e-10);
 assert.deepEqual(locomotionStepsBetween(next,{x:worker.x,z:worker.z,pose:movingPose(worker)},start,end+1e-6,.7),[]);
 Object.assign(worker,next);
 walking.elapsed=end;
 assert.deepEqual(tracker.observe(walking),forecast);
});
