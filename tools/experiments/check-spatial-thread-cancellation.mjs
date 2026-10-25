import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import factory from '../../public/wild-engine/spatial-threaded.mjs';
import {createThreadedSpatialWorld} from '../../src/world/wild-engine/spatial-thread-runtime.js';
import {createSpatialChunkStream} from '../../src/world/wild-engine/spatial-chunk-stream.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const handle=await createThreadedSpatialWorld(factory),core=handle.core,p=core.preparation,loaded=new Map(),releases=[],errors=[];
let cancellations=0;const cancel=p.cancel,release=p.release;
p.cancel=()=>{cancellations++;return cancel();};
p.release=()=>{releases.push({id:p.metric(3),cancelled:p.metric(2),worker:p.metric(0)});return release();};
core.generate(712,0,0,'manglares');for(const profile of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
const stream=createSpatialChunkStream(core,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data),onError:error=>errors.push(String(error))});
try{
 const plan=(x,force=false)=>stream.plan(new Map([[`${x},0`,{cx:x,cz:0,score:0}]]),force);
 const running=async()=>{const deadline=performance.now()+10000;while(p.status()!==2){assert(performance.now()<deadline);assert(p.status()<3,'Missed running job');await new Promise(r=>setTimeout(r,0));}};
 plan(1);await running();plan(2);await stream.whenIdle();
 assert.equal(cancellations,1,'Obsolete running job must notify native cancellation');
 assert.equal(releases[0].cancelled,1);assert(!loaded.has('1,0'));assert(loaded.has('2,0'));assert.equal(core.selectChunk(1,0),-1);
 plan(3);await running();plan(3,true);await stream.whenIdle();
 assert.equal(cancellations,2,'Forced revision must cancel old snapshot');assert.equal(releases[2].cancelled,1);assert(loaded.has('3,0'));
 plan(4);await running();stream.plan(new Map());
 const deadline=performance.now()+10000;while(cancellations<3){assert(performance.now()<deadline);await new Promise(r=>setTimeout(r,0));}
 plan(4);await stream.whenIdle();assert(loaded.has('4,0'));assert.equal(cancellations,3);
 assert.deepEqual(errors,[]);assert.equal(stream.summary().failed,0);
 await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-stream-cancellation.json',JSON.stringify({scope:'Real pthread queue cancellation for obsolete camera demand and forced epoch; not timing benchmark',cancellations,releases,stream:stream.summary(),loaded:[...loaded.keys()],errors},null,2)+'\n');
 console.log('Native cancellation and subsequent queue jobs passed');
}finally{stream.dispose();await handle.dispose();}
