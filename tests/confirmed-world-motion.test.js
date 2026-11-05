import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {validateConfirmedMotion} from '../src/rendering/confirmed-motion-validation.js';
import {createConfirmedMotionFeed} from '../src/rendering/confirmed-motion-feed.js';

function sample(){const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),at=state.elapsed,actors=[...(state.raid?.animals??[]),...state.workers].map(actor=>({actorId:actor.id,start:{at,x:actor.x,z:actor.z},end:{at,x:actor.x,z:actor.z},startStatus:actor.status,endStatus:actor.status,radius:actor.radius??.28,segments:[],continuous:true,timed:true}));return {state,packet:{elapsed:at,terrainChanged:false,worldMotionTrace:{start:at,end:at,actors,rosterChanged:false,topologyChanged:false,chunkChanged:false,terrainChanged:false}}};}
test('validates full observed roster and rejects incomplete, forged or terrain-inconsistent batches',()=>{
 const {state,packet}=sample(),world=packet.worldMotionTrace;assert.equal(validateConfirmedMotion(packet,state,state.elapsed).worldTrace,world);
 for(const invalid of [{...world,actors:world.actors.slice(1)},{...world,actors:[...world.actors,world.actors[0]]},{...world,actors:[{...world.actors[0],end:{...world.actors[0].end,x:world.actors[0].end.x+1}},...world.actors.slice(1)]},{...world,start:world.start-.05}])assert.throws(()=>validateConfirmedMotion({...packet,worldMotionTrace:invalid},state,state.elapsed),/observed world/);
 assert.throws(()=>validateConfirmedMotion({...packet,terrainChanged:true},state,state.elapsed),/observed world/);
});
test('world observations are revoked after later changes and never claim autonomous playback',()=>{
 const {state,packet}=sample(),feed=createConfirmedMotionFeed(),event={sequence:1,elapsed:state.elapsed,pauses:[],physicsPose:null,worldTrace:packet.worldMotionTrace,terrainChanged:false,eventful:false};
 feed.accept(event);assert.equal(feed.getWorld().representable,true);assert.equal(feed.getWorld().safeForAutonomousPlayback,false);feed.accept({...event,sequence:2,eventful:true});assert.equal(feed.getWorld().representable,false);feed.accept({...event,sequence:3,worldTrace:null});assert.equal(feed.getWorld(),null);feed.dispose();
});
