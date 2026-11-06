import {actorTickState} from '../src/simulation/worker-actor-tick-states.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {createConfirmedMotionFeed} from '../src/rendering/confirmed-motion-feed.js';
test('preview is tied to the current boundary and revoked on terrain change',()=>{const feed=createConfirmedMotionFeed(),boundary={sequence:4,lastElapsed:2},preview={sequence:5,start:2,end:3,reasons:['visual-time-and-support-unverified'],safeForAutonomousPlayback:false,trace:{actors:[]}};try{feed.offerPreview(preview,boundary);assert.equal(feed.getPreview().sequence,5);preview.trace.actors.push({id:'changed'});assert.deepEqual(feed.getPreview().trace.actors,[]);assert.throws(()=>feed.offerPreview({...preview,sequence:6},boundary),/boundary/);assert.equal(feed.invalidateTerrain(),true);assert.equal(feed.getPreview(),null);assert.throws(()=>feed.offerPreview({...preview,safeForAutonomousPlayback:true},boundary),/boundary/);}finally{feed.dispose();}});

function sample(){const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),at=state.elapsed,actors=[...(state.raid?.animals??[]),...state.workers].map(actor=>({actorId:actor.id,start:{at,x:actor.x,z:actor.z},end:{at,x:actor.x,z:actor.z},startStatus:actor.status,endStatus:actor.status,radius:actor.radius??.28,segments:[],continuous:true,timed:true}));return {state,packet:{elapsed:at,terrainChanged:false,worldMotionTrace:{start:at,end:at,actors,rosterChanged:false,topologyChanged:false,chunkChanged:false,terrainChanged:false}}};}
test('validates full observed roster and rejects incomplete, forged or terrain-inconsistent batches',()=>{
 const {state,packet}=sample(),world=packet.worldMotionTrace;assert.equal(validateConfirmedMotion(packet,state,state.elapsed).worldTrace,world);
 for(const invalid of [{...world,actors:world.actors.slice(1)},{...world,actors:[...world.actors,world.actors[0]]},{...world,actors:[{...world.actors[0],end:{...world.actors[0].end,x:world.actors[0].end.x+1}},...world.actors.slice(1)]},{...world,start:world.start-.05}])assert.throws(()=>validateConfirmedMotion({...packet,worldMotionTrace:invalid},state,state.elapsed),/observed world/);
 assert.throws(()=>validateConfirmedMotion({...packet,terrainChanged:true},state,state.elapsed),/observed world/);
});
test('world observations are revoked after later changes and never claim autonomous playback',()=>{
 const {state,packet}=sample(),feed=createConfirmedMotionFeed(),event={sequence:1,elapsed:state.elapsed,pauses:[],physicsPose:null,worldTrace:{...packet.worldMotionTrace,actorTickStates:{complete:true},physicsActivity:{samplesComplete:true,observed:false}},terrainChanged:false,eventful:false,terrainReady:true};
 feed.accept({...event,terrainReady:false});assert.equal(feed.getWorld().representable,false);feed.accept({...event,sequence:2});assert.equal(feed.getWorld().representable,true);assert.equal(feed.getWorld().safeForAutonomousPlayback,false);feed.accept({...event,sequence:3,eventful:true});assert.equal(feed.getWorld().representable,false);feed.accept({...event,sequence:4,worldTrace:null});assert.equal(feed.getWorld(),null);feed.dispose();
});

test('rejects incomplete actor samples and physics active anywhere in observed batch',()=>{
 const {state,packet}=sample(),feed=createConfirmedMotionFeed(),base={sequence:1,elapsed:state.elapsed,pauses:[],physicsPose:null,terrainChanged:false,eventful:false,terrainReady:true},trace={...packet.worldMotionTrace,actorTickStates:{complete:true},physicsActivity:{samplesComplete:true,observed:false}};
 for(const [i,invalid] of [{...trace,physicsActivity:{samplesComplete:true,observed:true}},{...trace,physicsActivity:{samplesComplete:false,observed:false}},{...trace,physicsActivity:undefined},{...trace,actorTickStates:{complete:false}}].entries()){feed.accept({...base,sequence:i+1,worldTrace:invalid});assert.equal(feed.getWorld().representable,false);}
 feed.accept({...base,sequence:5,worldTrace:trace});assert.equal(feed.getWorld().representable,true);assert.equal(feed.getWorld().safeForAutonomousPlayback,false);feed.dispose();
});

test('validates observed hyena samples against the confirmed end state',()=>{
 const {state,packet}=sample(),hyenas=(state.raid?.animals??[]).filter(actor=>actor.species==='hyena');const observed={complete:true,actors:hyenas.map(actor=>({actorId:actor.id,samples:[{at:state.elapsed,status:actor.status,motionPhase:actor.motionPhase??null,hasPath:!!actor.path?.length,recovery:!!actor.recovery,fallRemaining:actor.fallRemaining??null,magicImpact:!!actor.magicImpact}]}))};packet.worldMotionTrace.hyenaTickSamples=observed;assert.doesNotThrow(()=>validateConfirmedMotion(packet,state,state.elapsed));if(observed.actors.length){observed.actors[0].samples[0].status='forged';assert.throws(()=>validateConfirmedMotion(packet,state,state.elapsed),/hyena ticks/);}
});

test('world starts and tick states must match the previously displayed roster',()=>{const {state,packet}=sample(),world=packet.worldMotionTrace,roster=[...(state.raid?.animals??[]),...state.workers];world.actorTickStates={complete:true,actors:roster.map(actor=>({actorId:actor.id,samples:[actorTickState(actor,state.elapsed)]}))};assert.doesNotThrow(()=>validateConfirmedMotion(packet,state,state.elapsed,state));const forged=structuredClone(packet);forged.worldMotionTrace.actors[0].startStatus='forged';assert.throws(()=>validateConfirmedMotion(forged,state,state.elapsed,state),/world actor start/);const wrongTick=structuredClone(packet);wrongTick.worldMotionTrace.actorTickStates.actors[0].samples[0].yaw=123;assert.throws(()=>validateConfirmedMotion(wrongTick,state,state.elapsed,state),/actor tick/);const wrongRoster=structuredClone(state);wrongRoster.workers.pop();assert.throws(()=>validateConfirmedMotion(packet,state,state.elapsed,wrongRoster),/start roster/);});
