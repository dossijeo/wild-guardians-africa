import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedHistoricalMotionGroup} from '../src/rendering/confirmed-historical-motion-group.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {scheduleRemoteFrame} from '../src/rendering/remote-frame-scheduler.js';

// Execute the surface's actual clock selection closures without bootstrapping
// another renderer. Roster lease inventories are doubles; clock/group/pump and
// scheduling are the production implementations. No GPU evidence is claimed.
const source=readFileSync(process.env.QA_CLOCK_SURFACE??new URL('../src/rendering/webgpu-world-surface.js',import.meta.url),'utf8');
const section=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);};
const blockers=section('function remotePresentationBlockers(){','\n');
const nativeLease=section('function nativeResourceLease(){','\n');
const remoteLease=section('function remoteClockLease(','  function renderScene(');
const preparation=section('canPrepareInterval:()=>{','},certify:group.certify').slice('canPrepareInterval:'.length)+'}';
const select=new Function('workers','settlements','crops','visualClock','remoteMotionGroup',`${nativeLease}\n${blockers}\n${remoteLease}\nconst group=remoteMotionGroup,historicalClock=visualClock;return {prepare:${preparation},clock:remoteClockLease,blockers:remotePresentationBlockers};`);

function fixture({gate=null,worker=null,provisional=0}={}){
 let now=0,sequence=0,lastElapsed=0,committed=null;
 const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now,timeOrigin:0});
 const support={sequence:1,start:0,end:.1,valid:()=>true,actors:[]};
 const animals={historicalActorIds:()=>[],prepareHistoricalMotion:()=>({ok:true,remoteAutonomous:true}),startHistoricalMotion:()=>true,historicalMotionCurrent:()=>true,finishHistoricalMotion(){},abortHistoricalMotion(){}};
 const group=createConfirmedHistoricalMotionGroup({animals,getSupport:()=>support,inputPolicy:'ordered-boundary'});
 const owners={gate,worker},surface=select({nativeRouteLease:()=>owners.worker},{nativeGateLease:()=>owners.gate,status:()=>({provisional})},null,clock,group);
 const segments={version:1,start:0,end:.1,startPauses:[],endPauses:[],complete:true,segments:[{start:0,end:.1,realDuration:.1,rate:1}]};
 const preview={sequence:1,start:0,end:.1,safeForAutonomousPlayback:false,reasons:['visual-time-and-support-unverified'],trace:{actors:[],spatialEvidence:{},separationEvidence:{},physicsActivity:{samplesComplete:true,observed:false},actorTickStates:{complete:true}},clockSegments:segments};
 const stream={status:()=>({closed:false,sequence,lastElapsed}),timelineStatus:()=>({receivedElapsed:.1}),lastConfirmedClockSegments:()=>committed,nextTimelineBoundary:()=>sequence?null:{sequence:1,elapsed:.1},previewNextMotionBoundary:()=>sequence?null:preview,advanceNextTimelineBoundary(){sequence=1;lastElapsed=.1;committed=segments;return true;}};
 const pump=createConfirmedTimelinePump({stream,preparedIntervals:true,historicalPlayback:{clock,now:()=>now,certify:group.certify,start:group.start,isCurrent:group.isCurrent,finish:group.finish,abort:group.abort,canPrepareInterval:surface.prepare}});
 return {owners,clock,pump,surface,advance(ms){now=ms;return pump.advance();},metadata:()=>({preparedInterval:pump.preparedInterval(),clock:surface.clock()}),close(){pump.dispose();clock.dispose();}};
}

for(const owner of ['gate','worker'])test(`${owner} ownership prevents a historical interval from claiming the native clock`,()=>{
 const lease=Object.freeze({start:0,end:7}),f=fixture({[owner]:lease});
 try{
  f.pump.advance();assert.equal(f.pump.preparedInterval(),null);
  assert(f.surface.prepare().remoteBlockers.includes('native-resource-clock'));
  assert(!f.surface.blockers().includes('native-resource-clock'),'native clock ownership must not disable the independent camera');
  const metadata=f.metadata();assert.equal(metadata.clock.paused,true);assert.equal(metadata.clock.safeUntil,7);assert.deepEqual(metadata.clock.segments,[]);
  assert.equal(scheduleRemoteFrame({metadata,receivedAt:0,now:0}).metadata,metadata);
  assert.equal(f.pump.status().historicalDiagnostics.preparationBlockers['native-resource-clock'],1);
  assert.equal(f.advance(150),1,'confirmed fallback still commits its real endpoint');assert.equal(f.clock.elapsed,.1);
  assert.equal(f.owners[owner],lease,'owner and its exact coverage are retained');
 }finally{f.close();}
});

test('removing the final actor preserves independent motor ownership',()=>{
 const gate=Object.freeze({start:0,end:7}),f=fixture({gate,worker:{start:0,end:2}});
 try{f.owners.worker=null;f.pump.advance();assert.equal(f.metadata().preparedInterval,null);assert.equal(f.metadata().clock.safeUntil,7);assert.equal(f.owners.gate,gate);assert.equal(f.advance(150),1);}finally{f.close();}
});

test('historical-only scenes keep their autonomous interval and receipt contract',()=>{
 const f=fixture();try{f.pump.advance();const metadata=f.metadata();assert.equal(metadata.preparedInterval.end,.1);assert.equal(metadata.clock.paused,false);assert.equal(metadata.clock.safeUntil,.1);assert(scheduleRemoteFrame({metadata,receivedAt:0,now:0}).ready);assert.equal(f.advance(150),0);f.pump.sealPreparedInterval(metadata.preparedInterval.token);assert.equal(f.advance(150),1);}finally{f.close();}
});

test('existing structure preparation blockers remain effective',()=>{
 const f=fixture({provisional:1});try{f.pump.advance();assert.equal(f.pump.preparedInterval(),null);assert(f.surface.blockers().includes('structure-provisional-transition'));assert.equal(f.advance(150),1);}finally{f.close();}
});

test('scheduler still rejects a forged autonomous interval over native coverage',()=>{
 const f=fixture({gate:{start:0,end:7}});try{f.pump.advance();assert.throws(()=>scheduleRemoteFrame({metadata:{...f.metadata(),preparedInterval:{start:0,end:.1}},receivedAt:0,now:0}),/complete autonomous clock lease/);}finally{f.close();}
});
