import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM;
test('standalone spatial services initialize C++ globals before body registry use',
 {skip:!binary&&'Build and select a candidate WASM'},()=>{
 const module=new WebAssembly.Module(readFileSync(binary));
 const w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}}}).exports;
 assert.equal(typeof w._initialize,'function',
  'a standalone reactor must export its C++ initializer');
 w._initialize();w.spatial_bodies_reset();
 // Crossing the index threshold causes unordered maps and sets to rehash.
 // Without global constructors their load factors are zero and this traps.
 for(let id=1;id<=128;id++)
  assert.equal(w.spatial_body_upsert(id,id*3,0,.5,0,1),1);
 assert.equal(w.spatial_body_count(),128);
 assert.equal(w.spatial_body_segment_clear(1,3,0,6,0,1),0);
 w.spatial_bodies_reset();assert.equal(w.spatial_body_count(),0);
});
test('native dynamic body registry retains ordered updates and clears', {skip:!binary&&'Build and select a candidate WASM'},()=>{
 const mod=new WebAssembly.Module(readFileSync(binary));const instance=new WebAssembly.Instance(mod,{env:{emscripten_notify_memory_growth(){}}});const w=instance.exports;w._initialize?.();
 const query=(x,z,r)=>{const n=w.spatial_bodies_near(x,z,r);assert.ok(n>=0);return Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*6));};
 w.spatial_bodies_reset();assert.equal(w.spatial_body_upsert(9,1,2,.5,0,3),1);assert.equal(w.spatial_body_upsert(2,3,2,1,1,4),1);assert.equal(w.spatial_body_count(),2);
 assert.deepEqual(query(1,2,1),[2,3,2,1,1,4,9,1,2,.5,0,3]);assert.equal(w.spatial_body_upsert(9,100,2,.5,0,3),1);assert.deepEqual(query(1,2,1),[2,3,2,1,1,4]);
 assert.equal(w.spatial_body_upsert(9,NaN,2,.5,0,3),0);assert.equal(w.spatial_body_count(),2);assert.equal(w.spatial_body_remove(2),1);assert.equal(w.spatial_body_remove(2),0);w.spatial_bodies_reset();assert.equal(w.spatial_body_count(),0);
});
import {actorSegmentClear,prepareActorMotion} from '../src/simulation/actor-motion.js';
import {movePath} from '../src/simulation/locomotion.js';
test('native swept collision matches JS for movement, overlaps and masked bodies',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();
 let seed=2718;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let trial=0;trial<3000;trial++){
  w.spatial_bodies_reset();const actor={x:rnd()*4-2,z:rnd()*4-2,radius:.28+rnd()};w.spatial_body_upsert(1,actor.x,actor.z,actor.radius,0,1);const blockers=[];
  for(let i=0;i<5;i++){const b={x:rnd()*6-3,z:rnd()*6-3,radius:.1+rnd()};blockers.push(b);w.spatial_body_upsert(i+2,b.x,b.z,b.radius,0,1);}
  const start=trial%2?actor:{x:rnd()*4-2,z:rnd()*4-2},end={x:rnd()*4-2,z:rnd()*4-2};assert.equal(Boolean(w.spatial_body_segment_clear(1,start.x,start.z,end.x,end.z,1)),actorSegmentClear(start,end,actor,blockers),'trial '+trial);
 }
 assert.equal(w.spatial_body_segment_clear(999,0,0,1,1,1),-1);assert.equal(w.spatial_body_segment_clear(1,0,0,1,1,0),1);
 w.spatial_bodies_reset();w.spatial_body_upsert(1,0,0,.5,0,1);assert.equal(w.spatial_body_segment_clear(1,0,0,4,0,-1),1);w.spatial_body_upsert(2,2,0,.5,0,1);assert.equal(w.spatial_body_segment_clear(1,0,0,4,0,-1),0);w.spatial_body_upsert(2,2,3,.5,0,1);assert.equal(w.spatial_body_segment_clear(1,0,0,4,0,-1),1);w.spatial_body_upsert(2,2,0,.5,0,1);w.spatial_body_remove(2);assert.equal(w.spatial_body_segment_clear(1,0,0,4,0,-1),1);
});
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
test('cached native terrain edges preserve exact detours across moving bodies and topology changes',{skip:!binary||!process.env.WILD_ENGINE_BASE_WASM?'Build and select both candidate WASM binaries':false},()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/spatial-animal-wall-overlap.json',import.meta.url),'utf8'));
 const sessions=[process.env.WILD_ENGINE_BASE_WASM,binary].map(path=>{const state=structuredClone(fixture),loaded=new Map(),module=new WebAssembly.Module(readFileSync(path)),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}return {session,nav:createSpatialNavigationMovement(session,state),w:session.core.wasm};});
 try{
  const origin=fixture.raid.animals[0].exit;let start;for(let z=origin.z-8;z<origin.z+8&&!start;z+=.5)for(let x=origin.x-8;x<origin.x+8;x+=.5)if(sessions.every(({nav})=>nav.segmentClear({x,z},{x:x+4,z},.28,null,true)&&nav.walkable(x+2,z+1.3,.28,null,true))){start={x,z};break;}assert.ok(start);
  for(const {w} of sessions){w.spatial_bodies_reset();w.spatial_body_upsert(1,start.x,start.z,.28,0,1);}
  let seed=54117;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let barriers=[];
  for(let step=0;step<80;step++){
   if(step===30)barriers=sessions.map(({session})=>session.core.addOrientedBarrier(start.x+3,start.z,.2,.6,0,0));
   if(step===55)sessions.forEach(({session},i)=>session.core.removeBarrier(barriers[i]));
   const bx=start.x+1.5+rnd(),bz=start.z+(rnd()-.5)*1.1;
   for(const {w,nav} of sessions){w.spatial_body_upsert(1,start.x,start.z,.28,0,step%9===0?3:1);w.spatial_body_upsert(2,bx,bz,.2+(step%4)*.05,step%3===0?1:0,step%6===0?9:1);if(step%10===0)w.spatial_body_remove(3);else w.spatial_body_upsert(3,start.x+2.5,start.z+.5,.35,0,step%11===0?0:1);nav.walkable(start.x,start.z,.28,null,true);}
   const routes=sessions.map(({w})=>{const n=w.spatial_body_detour(1,start.x+4,start.z,-1);assert.ok(n>=0);return [...new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*2)];});assert.deepEqual(routes[1],routes[0],`same detour at step ${step}`);
   const again=sessions[1].w.spatial_body_detour(1,start.x+4,start.z,-1);assert.deepEqual([...new Float64Array(sessions[1].w.memory.buffer,sessions[1].w.spatial_bodies_result_ptr(),again*2)],routes[1]);
  }
  for(const {w} of sessions)for(let id=10;id<90;id++)w.spatial_body_upsert(id,start.x+200+id*3,start.z+200,.28,0,1);
  for(let step=0;step<30;step++){
   const bx=start.x+1.5+rnd(),bz=start.z+(rnd()-.5)*1.1;
   for(const {w,nav} of sessions){w.spatial_body_upsert(2,bx,bz,.28,0,1);if(step%3===0)w.spatial_body_remove(3);else w.spatial_body_upsert(3,start.x+2.5,start.z+.5,.35,0,1);nav.walkable(start.x,start.z,.28,null,true);}
   const routes=sessions.map(({w})=>{const n=w.spatial_body_detour(1,start.x+4,start.z,-1);assert.ok(n>=0);return [...new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*2)];});assert.deepEqual(routes[1],routes[0],`same indexed detour at step ${step}`);
  }
  assert.ok(sessions[1].w.spatial_body_terrain_cache_hits()>0);assert.ok(sessions[1].w.spatial_body_blocked_edge_hits()>0,'blocked edges reuse a live witness');assert.ok(sessions[1].w.spatial_body_terrain_cache_entries()<=6*8192,'bounded terrain cache');assert.ok(sessions[1].w.spatial_body_blocked_edge_entries()<=32768,'bounded witness cache');sessions[1].w.spatial_bodies_reset();assert.equal(sessions[1].w.spatial_body_terrain_cache_entries(),0);assert.equal(sessions[1].w.spatial_body_terrain_cache_hits(),0);assert.equal(sessions[1].w.spatial_body_blocked_edge_entries(),0);
 }finally{for(const {session} of sessions)session.dispose();}
});
test('native local detour produces clear deterministic segments in real terrain',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/spatial-animal-wall-overlap.json',import.meta.url),'utf8')),mod=new WebAssembly.Module(readFileSync(binary)),state=structuredClone(fixture),loaded=new Map();const session=createSpatialGameSession(mod,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{for(let z=-1;z<=1;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const nav=createSpatialNavigationMovement(session,state),w=session.core.wasm,e=state.raid.animals[0].exit;let start;
 for(let z=e.z-8;z<e.z+8&&!start;z+=.5)for(let x=e.x-8;x<e.x+8;x+=.5)if(nav.segmentClear({x,z},{x:x+4,z},.28,null,true)&&nav.walkable(x+2,z+1.3,.28,null,true)){start={x,z};break;}
 assert.ok(start,'resident open corridor');w.spatial_bodies_reset();w.spatial_body_upsert(1,start.x,start.z,.28,0,1);w.spatial_body_upsert(2,start.x+2,start.z,.28,0,1);const n=w.spatial_body_detour(1,start.x+4,start.z,1);assert.ok(n>1,'route around body');const points=Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*2));let last=start;
 for(let i=0;i<n;i++){let next={x:points[2*i],z:points[2*i+1]};assert.equal(w.spatial_body_segment_clear(1,last.x,last.z,next.x,next.z,1),1);assert.equal(nav.segmentClear(last,next,.28,null,true),true);last=next;}
 const hitsBefore=w.spatial_body_terrain_cache_hits();assert.equal(w.spatial_body_detour(1,start.x+4,start.z,1),n);assert.deepEqual(Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*2)),points);assert.ok(w.spatial_body_terrain_cache_hits()>hitsBefore,'identical static edges reuse their terrain proof');
 const missesBefore=w.spatial_body_terrain_cache_misses(),wall=session.core.addOrientedBarrier(start.x+3,start.z,.2,.6,0,0);assert.ok(wall>0,'barrier installed');try{assert.equal(nav.segmentClear({x:start.x+2.4,z:start.z},{x:start.x+3.6,z:start.z},.28,null,true),false);const changed=w.spatial_body_detour(1,start.x+4,start.z,1);assert.ok(w.spatial_body_terrain_cache_misses()>missesBefore,'topology changes invalidate cached terrain proofs');assert.ok(changed>=0);if(changed){const route=Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),changed*2));let previous=start;for(let j=0;j<changed;j++){const next={x:route[j*2],z:route[j*2+1]};assert.equal(nav.segmentClear(previous,next,.28,null,true),true,'changed topology must be respected');previous=next;}}}finally{session.core.removeBarrier(wall);}

 const actor={id:'test-worker',...start,radius:.28,status:'arriving',path:[{x:start.x+4,z:start.z}]},blocker={id:'test-blocker',x:start.x+2,z:start.z,radius:.28,status:'idle'},stateForMove={workers:[actor,blocker],raid:null};
 const review=attachDynamicBodyReview(nav,session);try{nav.dynamicBodies.sync(stateForMove);let calls=0;const native=review.service.detour;review.service.detour=(...args)=>{calls++;return native(...args);};const clear=prepareActorMotion(stateForMove,actor,nav,true);assert.ok(calls>0,'movement requests native detour');assert.ok(actor.path.length>1,'movement accepts the native route');let from=start;for(const to of actor.path){assert.equal(actorSegmentClear(from,to,actor,[blocker]),true);assert.equal(nav.segmentClear(from,to,.28,null,true),true);from=to;}assert.equal(typeof clear,'function');for(let step=0;step<200&&actor.path.length;step++){const guard=prepareActorMotion(stateForMove,actor,nav,true);movePath(actor,.1,(a,b)=>guard(a,b)&&nav.segmentClear(a,b,.28,null,true));nav.dynamicBodies.update(actor,0);assert.ok(Math.hypot(actor.x-blocker.x,actor.z-blocker.z)>=actor.radius+blocker.radius-1e-8,'no body overlap');}assert.equal(actor.path.length,0,'worker reaches destination');assert.ok(Math.hypot(actor.x-(start.x+4),actor.z-start.z)<1e-6);
 actor.x=start.x;actor.z=start.z;actor.path=[{x:start.x+4,z:start.z}];blocker.x=start.x+4;blocker.z=start.z;blocker.path=[{x:start.x,z:start.z}];review.service.nativeOnly=true;nav.dynamicBodies.sync(stateForMove);
 for(let step=0;step<600&&(actor.path.length||blocker.path.length);step++)for(const person of [actor,blocker]){if(!person.path.length)continue;const guard=prepareActorMotion(stateForMove,person,nav,true);movePath(person,.05,(a,b)=>guard(a,b)&&nav.segmentClear(a,b,.28,null,true));nav.dynamicBodies.update(person,0);assert.ok(Math.hypot(actor.x-blocker.x,actor.z-blocker.z)>=.56-1e-8,'opposing bodies must not overlap');}
 assert.equal(actor.path.length,0,'first actor completes opposing traffic');assert.equal(blocker.path.length,0,'second actor completes opposing traffic');
}finally{review.dispose();}

 }finally{session.dispose();}
});
import {createSpatialDynamicBodies} from '../src/world/wild-engine/spatial-dynamic-bodies.js';
test('dynamic bridge publishes ordered changes and releases its session',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();const bridge=createSpatialDynamicBodies(w);
 bridge.publish('worker',{x:0,z:0,radius:.5,kind:0,flags:1});bridge.publish('animal',{x:2,z:0,radius:.5,kind:1,flags:1});assert.equal(bridge.clear('worker',{x:0,z:0},{x:3,z:0},1),false);
 bridge.publish('animal',{x:2,z:5,radius:.5,kind:1,flags:1});assert.equal(bridge.clear('worker',{x:0,z:0},{x:3,z:0},1),true);assert.equal(bridge.remove('animal'),true);assert.equal(bridge.remove('animal'),false);bridge.dispose();assert.equal(w.spatial_body_count(),0);assert.throws(()=>bridge.remove('worker'));
});
import {createDynamicBodyProjection} from '../src/world/wild-engine/spatial-dynamic-projection.js';
test('dynamic projection publishes changes, retirements and lifecycle in order',()=>{
 const calls=[],registry={publish:(k,v)=>calls.push(['put',k,{...v}]),remove:k=>calls.push(['remove',k])},p=createDynamicBodyProjection(registry),worker={id:'1',x:0,z:1,status:'idle'},animal={id:'1',x:3,z:4,radius:1,status:'walking'};
 const state={workers:[worker],raid:{animals:[animal]}};p.sync(state);assert.deepEqual(calls.map(c=>c[1]),['0:1','1:1']);calls.length=0;p.sync(state);assert.equal(calls.length,0);
 worker.x=2;animal.status='gone';p.sync(state);assert.deepEqual(calls.map(c=>[c[1],c[2].flags]),[['0:1',1],['1:1',0]]);calls.length=0;state.raid=null;p.sync(state);assert.deepEqual(calls,[['remove','1:1']]);calls.length=0;p.clear();assert.deepEqual(calls,[['remove','0:1']]);
});
test('projection preserves collision-relevant activity flags independently',()=>{
 const rows=new Map(),p=createDynamicBodyProjection({publish:(k,v)=>rows.set(k,v),remove:k=>rows.delete(k)}),worker={id:'w',x:0,z:0,status:'incapacitated',incapacitated:true},animal={id:'a',x:1,z:0,status:'retreating',hitsRemaining:2};
 p.sync({workers:[worker],raid:{animals:[animal]}});assert.equal(rows.get('0:w').flags,3);assert.equal(rows.get('1:a').flags,13);
 worker.status='home';animal.hitsRemaining=0;p.sync({workers:[worker],raid:{animals:[animal]}});assert.equal(rows.get('0:w').flags,2);assert.equal(rows.get('1:a').flags,5);
});
import {actorBlockers} from '../src/simulation/actor-motion.js';
test('native actor-specific blocking matches simulation policy',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();
 for(const worker of [true,false])for(const incapacitated of [false,true])for(const retreating of [false,true])for(const hits of [0,1])for(const otherIncapacitated of [false,true])for(const otherRetreating of [false,true])for(const otherHits of [0,1])for(const homeOrGone of [false,true]){
  const actor={id:'actor',x:0,z:0,radius:.5,status:retreating?'retreating':'walking',incapacitated,hitsRemaining:hits},other={id:'other',x:1,z:0,radius:.5,status:homeOrGone?(worker?'gone':'home'):otherRetreating?'retreating':'walking',incapacitated:otherIncapacitated,hitsRemaining:otherHits};
  const flags=a=>(a.status==='home'||a.status==='gone'?0:1)|(a.incapacitated?2:0)|(a.status==='retreating'?4:0)|((a.hitsRemaining??0)>0?8:0);w.spatial_bodies_reset();w.spatial_body_upsert(1,0,0,.5,worker?0:1,flags(actor));w.spatial_body_upsert(2,1,0,.5,worker?1:0,flags(other));
  const state=worker?{workers:[actor],raid:{animals:[other]}}:{workers:[other],raid:{animals:[actor]}};const expected=actorBlockers(state,actor,worker);assert.equal(Boolean(w.spatial_body_has_blockers(1,worker?8:-1)),expected.length>0,'native participation');assert.equal(Boolean(w.spatial_body_segment_clear(1,0,0,2,0,-1)),actorSegmentClear(actor,{x:2,z:0},actor,expected));
 }
});
test('projection publishes each actor movement before the next actor is queried',()=>{
 const live=new Map(),r={publish:(key,value)=>live.set(key,{...value}),remove:key=>live.delete(key)},p=createDynamicBodyProjection(r),a={id:'a',x:0,z:0},b={id:'b',x:3,z:0};p.sync({workers:[a,b]});a.x=1;p.update(a,0);assert.equal(live.get('0:a').x,1);assert.equal(live.get('0:b').x,3);b.x=2;p.update(b,0);assert.equal(live.get('0:b').x,2);assert.throws(()=>p.update({id:'missing'},0));
});
import {attachDynamicBodyReview} from '../src/world/wild-engine/spatial-dynamic-review.js';
test('experimental attachment keeps actor state native and cleans session',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();const nav={},review=attachDynamicBodyReview(nav,{core:{wasm:w}}),worker={id:'w',x:0,z:0,radius:.5,status:'idle'},animal={id:'a',x:2,z:0,radius:.5,status:'retreating'};
 nav.dynamicBodies.sync({workers:[worker],raid:{animals:[animal]}});assert.equal(w.spatial_body_count(),2);assert.equal(review.service.clear('0:w',{x:0,z:0},{x:3,z:0},-1),false);animal.z=3;nav.dynamicBodies.update(animal,1);assert.equal(review.service.clear('0:w',{x:0,z:0},{x:3,z:0},-1),true);review.dispose();assert.equal(w.spatial_body_count(),0);assert.equal(nav.dynamicBodies,undefined);
});
test('native nearby filter honors radius boundaries and updates',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();w.spatial_bodies_reset();w.spatial_body_upsert(1,0,0,.5,0,1);w.spatial_body_upsert(2,9,0,.5,0,1);assert.equal(w.spatial_body_has_blockers(1,8),1);w.spatial_body_upsert(2,9.001,0,.5,0,1);assert.equal(w.spatial_body_has_blockers(1,8),0);assert.equal(w.spatial_body_has_blockers(1,-1),1);w.spatial_body_remove(2);assert.equal(w.spatial_body_has_blockers(1,-1),0);assert.equal(w.spatial_body_has_blockers(99,8),-1);
});
test('indexed body queries match brute force across movement, removals and cell boundaries',{skip:!binary&&'Build and select a candidate WASM'},()=>{
 const m=new WebAssembly.Module(readFileSync(binary)),w=new WebAssembly.Instance(m,{env:{emscripten_notify_memory_growth(){}}}).exports;w._initialize?.();w.spatial_bodies_reset();
 let seed=94271;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),actors=new Map();
 const put=(id,b)=>{actors.set(id,b);assert.equal(w.spatial_body_upsert(id,b.x,b.z,b.radius,0,1),1);};
 for(let id=1;id<=600;id++)put(id,{x:rnd()*400-200,z:rnd()*400-200,radius:.1+rnd()*2});
 // Include an unindexable centre and a previously large radius. Both must
 // remain correct even when their bounds force the conservative full scan.
 put(601,{x:1e15,z:-1e15,radius:.5});put(602,{x:150,z:150,radius:20});w.spatial_body_remove(602);actors.delete(602);
 for(let step=0;step<350;step++){
  const id=1+Math.floor(rnd()*600);if(step%9===0){w.spatial_body_remove(id);actors.delete(id);}else put(id,{x:rnd()*400-200,z:rnd()*400-200,radius:.1+rnd()*2});
  const x=rnd()*360-180,z=rnd()*360-180,reach=rnd()*15,expected=[...actors].filter(([,b])=>Math.abs(b.x-x)<=reach+b.radius&&Math.abs(b.z-z)<=reach+b.radius).map(([key])=>key).sort((a,b)=>a-b);
  const n=w.spatial_bodies_near(x,z,reach),rows=new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),n*6),actual=Array.from({length:n},(_,i)=>rows[i*6]);assert.deepEqual(actual,expected,'nearby query '+step);
  const [actorId,actor]=actors.entries().next().value,end={x:actor.x+rnd()*30-15,z:actor.z+rnd()*30-15},others=[...actors].filter(([key])=>key!==actorId).map(([,b])=>b);
  assert.equal(Boolean(w.spatial_body_segment_clear(actorId,actor.x,actor.z,end.x,end.z,1)),actorSegmentClear(actor,end,actor,others),'segment '+step);
 }
 assert.ok(w.spatial_body_remove(601));assert.equal(w.spatial_bodies_near(1e15,-1e15,0),0);w.spatial_bodies_reset();
 for(let id=1;id<=70;id++)w.spatial_body_upsert(id,id*10,0,.5,0,1);
 for(let id=1;id<=45;id++)w.spatial_body_remove(id);
 assert.equal(w.spatial_body_has_blockers(46,9),1,'lookup after dropping the index');
 for(let id=1;id<=45;id++)w.spatial_body_upsert(id,id*10,0,.5,0,1);
 assert.equal(w.spatial_body_has_blockers(46,9),1,'lookup after rebuilding the index');
 w.spatial_body_upsert(47,470,20,.5,0,1);assert.equal(w.spatial_body_segment_clear(46,460,0,469,0,1),1,'updated cell has no stale body');w.spatial_bodies_reset();
});
