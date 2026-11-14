import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const key=p=>`${p.group}:${p.gx}:${p.gz}`;
const identity=p=>({group:p.group,gx:p.gx,gz:p.gz});
const solid=p=>p.slot<=3||p.slot>=10&&p.slot<=12||p.slot>=18;
const start=f=>assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
function props(f){
 const core=f.session.core,selected=core.currentChunk(),found=new Map();
 try{
  for(const value of core.captureResidentChunks().keys){const [x,z]=value.split(',').map(Number);
   core.selectChunk(x,z);for(const p of core.props())if(p.group<=5)found.set(key(p),p);}
 }finally{if(selected&&core.hasResidentChunk(selected.cx,selected.cz))core.selectChunk(selected.cx,selected.cz);}
 return [...found.values()];
}
function restore(f,excluded=[]){
 const omit=new Set(excluded.map(key));
 f.session.core.restoreRemovedProps(f.session.core.snapshot().removedProps.filter(p=>!omit.has(key(p))));
}
function candidate(f,mode='under',{isSolid=true,far=true,radius=.28}={}){
 const core=f.session.core,base=core.snapshot().removedProps,anchor=f.point(0,0);
 f.session.actorSectorRevision(radius===.28?{worker:true}:{worker:false,species:'warthog'});
 for(const p of props(f)){
  if(solid(p)!==isSolid||far&&Math.hypot(p.x-anchor.x,p.z-anchor.z)<35||mode==='corner'&&p.radius<2)continue;
  assert.equal(core.removeProp(identity(p)),1);
  const r=p.radius,
   a=mode==='through'?{x:p.x-r-2.5,z:p.z}:mode==='corner'?{x:p.x+.8*r,z:p.z+.9*r}:{x:p.x,z:p.z},
   b=mode==='through'?{x:p.x+r+2.5,z:p.z}:mode==='corner'?{x:p.x+1.2*r,z:p.z+.9*r}:{x:p.x+.25,z:p.z};
  if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,radius)===1)return {p,a,b,base};
  core.restoreRemovedProps(base);
 }
 assert.fail(`native fixture needs a ${mode} corridor for a ${isSolid?'solid':'decorative'} prop`);
}
async function prepared(core,cx,cz){
 const p=core.preparation,id=p.start(cx,cz);assert(id>0);
 for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);
 assert.equal(p.status(),3);assert.equal(p.metric(0),1);return id;
}

test('suppressing a prop is a monotonic geometry edit, not a global execution invalidation',()=>{
 const f=fixture();
 try{
  const p=props(f).find(p=>solid(p)&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35);assert(p);
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const plan=f.bridge.nativeRouteTiming(handle),queries=f.w.nav_intent_route_queries(),checks=f.w.spatial_execution_clearance_checks();
  assert.equal(f.session.core.removeProp(identity(p)),1);assert.equal(f.session.core.removeProp(identity(p)),0);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);
  assert.equal(f.w.nav_intent_props_mutation_candidates(),0);assert.equal(f.w.nav_intent_props_mutation_body_checks(),0);
  assert.equal(f.w.nav_intent_route_queries(),queries);assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.equal(f.w.nav_intent_props_mutation_commits(),1);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('restoring a distant solid uses canonical geometry without checking or replacing unrelated routes',()=>{
 const f=fixture();
 try{
  const {p}=candidate(f),handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);
  const plan=f.bridge.nativeRouteTiming(handle),checks=f.w.spatial_execution_clearance_checks();
  restore(f,[p]);assert(props(f).some(v=>key(v)===key(p)));
  assert.equal(f.w.nav_intent_props_mutation_candidates(),0);assert.equal(f.w.nav_intent_props_mutation_segments(),0);
  assert(f.w.nav_intent_props_mutation_recipe_chunks()>0);assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('canonical restoration under a current worker is rejected without publishing scratch data or swapping suppression history',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f),handle=f.worker(1,a,b);start(f);
  const before=f.session.core.snapshot(),selected=f.session.core.captureResidentChunks(),payload=f.session.core.chunkPayload(),
   sequence=f.w.nav_intent_transition_sequence(),revision=f.session.core.farVisualRevision();
  assert.throws(()=>restore(f,[p]),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.session.core.captureResidentChunks(),selected);
  assert.deepEqual(f.session.core.chunkPayload(),payload);assert.equal(f.session.core.farVisualRevision(),revision);
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_props_mutation_rejected(),1);
  assert(f.bridge.nativeRouteExecution(handle));assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});

test('the same native prop frontier protects a current animal footprint',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f,'under',{radius:1.1}),handle=f.animal(a,b);start(f);
  const before=f.session.core.snapshot(),body=f.body(10);
  assert.throws(()=>restore(f,[p]),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.body(10),body);
  assert(f.bridge.nativeRouteExecution(handle));assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});

test('retiring the last route does not let a prop be restored through its still-live body',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f);f.worker(1,a,b);start(f);
  assert.equal(f.w.nav_intent_cancel_home(900011),1);f.bridge.intentChanges();
  const before=f.session.core.snapshot();
  assert.throws(()=>restore(f,[p]),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.w.spatial_body_remove(1),1);
  restore(f,[p]);assert(props(f).some(q=>key(q)===key(p)));
 }finally{f.session.dispose();}
});

test('restoration intercepts only future worker corridors and preserves a disjoint generation',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f,'through'),moving=f.worker(1,a,b),other=f.worker(4,f.point(-6,6),f.point(6,6));
  start(f);f.advance(11);const body=f.body(1),plan=f.bridge.nativeRouteTiming(other);
  restore(f,[p]);const [event]=f.bridge.intentChanges();
  assert.deepEqual(event.revokedRouteHandle,moving);assert.equal(event.effectiveTime,11);
  assert.equal(f.w.nav_intent_props_mutation_revocations(),1);assert.equal(f.bridge.nativeRouteExecution(moving),null);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.body(1),body);
  assert.deepEqual(f.bridge.nativeRouteTiming(other),plan);
 }finally{f.session.dispose();}
});

test('a newly restored solid revokes a prepared lease before execution or late resource admission',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f,'through'),handle=f.worker(1,a,b);restore(f,[p]);
  const [event]=f.bridge.intentChanges();assert.deepEqual(event.revokedRouteHandle,handle);
  assert.equal(f.bridge.nativeRouteTiming(handle),null);assert.equal(f.bridge.beginNativeRouteExecution().status,'inactive');
 }finally{f.session.dispose();}
});

test('prop restoration uses the disc, not its enclosing box, for a grazing future route',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f,'corner'),handle=f.worker(1,a,b);start(f);
  const plan=f.bridge.nativeRouteTiming(handle);restore(f,[p]);
  assert(f.w.nav_intent_props_mutation_candidates()>0);assert.equal(f.w.nav_intent_props_mutation_revocations(),0);
  assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);assert.equal(f.advance(10.1).status,'advanced');
  assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('restoring decoration under a body cannot invent a solid collision rule',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f,'under',{isSolid:false}),handle=f.worker(1,a,b);start(f);
  const plan=f.bridge.nativeRouteTiming(handle);restore(f,[p]);
  assert(props(f).some(v=>key(v)===key(p)));assert.equal(f.w.nav_intent_props_mutation_body_checks(),0);
  assert.equal(f.w.nav_intent_props_mutation_revocations(),0);assert.equal(f.advance(10.1).status,'advanced');
  assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);
 }finally{f.session.dispose();}
});

test('a mixed restore/suppress transaction is wholly rejected before any prop, witness or route is committed',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f),other=props(f).find(q=>key(q)!==key(p));assert(other);
  const handle=f.worker(1,a,b);start(f);
  const before=f.session.core.snapshot(),sequence=f.w.nav_intent_transition_sequence(),
   proposed=[...before.removedProps.filter(q=>key(q)!==key(p)),identity(other)];
  assert.throws(()=>f.session.core.restoreRemovedProps(proposed),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert(props(f).some(q=>key(q)===key(other)));
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert(f.bridge.nativeRouteExecution(handle));
  assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});

test('missing geometry witnesses cannot bypass the canonical preflight',()=>{
 const f=fixture();
 try{
  const {p,a,b}=candidate(f);
  f.session.core.addSettlement(1000,1000,1,1); // Canonical operation clears the old prop witness cache.
  const handle=f.worker(1,a,b);start(f);const before=f.session.core.snapshot();
  assert.throws(()=>restore(f,[p]),/Could not restore removed spatial props/);
  assert.deepEqual(f.session.core.snapshot(),before);assert(f.w.nav_intent_props_mutation_recipe_chunks()>0);
  assert(f.bridge.nativeRouteExecution(handle));assert.equal(f.advance(10.1).status,'advanced');
 }finally{f.session.dispose();}
});

test('restoring an unloaded prop with no witness does not publish scratch chunks or stop unrelated motion',()=>{
 const f=fixture();
 try{
  assert(f.session.core.addChunk(4,4)>=0);f.session.core.selectChunk(4,4);
  const p=f.session.core.props().find(p=>p.group<=5&&solid(p));assert(p);
  assert.equal(f.session.core.removeProp(identity(p)),1);assert.equal(f.session.core.removeChunk(4,4),1);
  f.session.core.addSettlement(1000,1000,1,1);
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const before=f.session.core.captureResidentChunks();restore(f,[p]);
  assert.deepEqual(f.session.core.captureResidentChunks(),before);assert(!f.session.core.hasResidentChunk(4,4));
  assert.equal(f.w.nav_intent_props_mutation_recipe_chunks(),0);assert.equal(f.advance(11).status,'advanced');
  assert(f.bridge.nativeRouteExecution(handle));assert(f.session.core.addChunk(4,4)>=0);
  f.session.core.selectChunk(4,4);assert(f.session.core.props().some(q=>key(q)===key(p)));
  assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('an absent prop owner cannot hide a restored collision in a resident halo',()=>{
 const f=fixture();
 try{
  const core=f.session.core,base=core.snapshot().removedProps;let chosen;
  f.session.actorSectorRevision({worker:true});
  for(let extent=1;extent<=3&&!chosen;extent++){
   if(extent>1)for(let z=-extent;z<=extent;z++)for(let x=-extent;x<=extent;x++)
    if(!core.hasResidentChunk(x,z))assert(core.addChunk(x,z)>=0);
   for(const p of props(f).filter(p=>solid(p)&&p.radius>2.1)){
    const cx=Math.floor((p.x+24)/48),cz=Math.floor((p.z+24)/48);
    if(!core.hasResidentChunk(cx,cz))continue;
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){
     if(!core.hasResidentChunk(cx+dx,cz+dz))continue;
     const border={x:dx?cx*48-24+(dx>0?48:0):p.x,z:dz?cz*48-24+(dz>0?48:0):p.z},
      b={x:Math.fround(border.x+dx*2.2),z:Math.fround(border.z+dz*2.2)},
      a={x:p.x+dx*(p.radius+2.5),z:p.z+dz*(p.radius+2.5)};
     if(Math.hypot(b.x-p.x,b.z-p.z)>=p.radius+.18)continue;
     core.selectChunk(cx,cz);if(!core.props().some(q=>key(q)===key(p)))continue;
     assert.equal(core.removeProp(identity(p)),1);assert.equal(core.removeChunk(cx,cz),1);
     if(f.w.spatial_execution_segment_clear(a.x,a.z,b.x,b.z,.28)===1){chosen={p,a,b,cx,cz};break;}
     assert(core.addChunk(cx,cz)>=0);core.restoreRemovedProps(base);
    }
    if(chosen)break;
   }
  }
  assert(chosen,'canonical seed must provide a solid prop crossing a resident chunk halo');
  const {p,a,b,cx,cz}=chosen;core.addSettlement(1000,1000,1,1);
  const handle=f.worker(1,a,b);start(f);f.advance(10.5);const before=core.captureResidentChunks();
  restore(f,[p]);assert(!core.hasResidentChunk(cx,cz));assert.deepEqual(core.captureResidentChunks(),before);
  assert.deepEqual(f.bridge.intentChanges()[0].revokedRouteHandle,handle);
  assert(f.w.nav_intent_props_mutation_recipe_chunks()>0);assert.equal(f.bridge.nativeRouteExecution(handle),null);
 }finally{f.session.dispose();}
});

test('bulk suppression alone does not stop existing routes or run future collision checks',()=>{
 const f=fixture();
 try{
  const available=props(f).filter(p=>Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35).slice(0,4);
  assert.equal(available.length,4);const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const before=f.session.core.snapshot().removedProps,sequence=f.w.nav_intent_transition_sequence();
  f.session.core.restoreRemovedProps([...before,...available.map(identity)]);
  assert.equal(f.w.nav_intent_props_mutation_candidates(),0);assert.equal(f.w.nav_intent_props_mutation_body_checks(),0);
  assert.equal(f.w.nav_intent_props_mutation_recipe_chunks(),0,'monotonic suppression needs no speculative recipe generation');
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.advance(11).status,'advanced');
  assert(f.bridge.nativeRouteExecution(handle));
 }finally{f.session.dispose();}
});

test('a large mixed prop history stays local even beyond the old 64-record refresh cutoff',()=>{
 const f=fixture();
 try{
  for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++)if(!f.session.core.hasResidentChunk(x,z))assert(f.session.core.addChunk(x,z)>=0);
  const anchor=f.point(0,0),available=props(f).filter(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)>35).slice(0,80);
  assert(available.length>64,'fixture must exercise the previous global refresh fallback');
  const base=f.session.core.snapshot().removedProps,handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);
  const plan=f.bridge.nativeRouteTiming(handle),queries=f.w.nav_intent_route_queries(),checks=f.w.spatial_execution_clearance_checks();
  f.session.core.restoreRemovedProps([...base,...available.map(identity)]);
  assert.equal(f.advance(11).status,'advanced');f.session.core.restoreRemovedProps(base);
  assert.equal(f.advance(12).status,'advanced');assert.deepEqual(f.bridge.nativeRouteTiming(handle),plan);
  assert.equal(f.w.nav_intent_route_queries(),queries);assert.equal(f.w.spatial_execution_clearance_checks(),checks);
  assert.equal(f.w.nav_intent_props_mutation_revocations(),0);assert.deepEqual(f.bridge.intentChanges(),[]);
 }finally{f.session.dispose();}
});

test('malformed or unsupported replacement histories remain atomic and do not restamp execution',()=>{
 const f=fixture();
 try{
  const original=f.session.core.snapshot().removedProps,unsupported={group:0,gx:2147483647,gz:2147483647};
  f.session.core.restoreRemovedProps([...original,unsupported]);
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);const before=f.session.core.snapshot();
  assert.throws(()=>f.session.core.restoreRemovedProps([unsupported,unsupported]),/Could not restore/);
  assert.throws(()=>f.session.core.restoreRemovedProps(original),/Could not restore/);
  assert.deepEqual(f.session.core.snapshot(),before);assert.equal(f.advance(11).status,'advanced');
  assert(f.bridge.nativeRouteExecution(handle));
 }finally{f.session.dispose();}
});

test('a rejected world replacement preserves the proof used by monotonic prop suppression',()=>{
 const f=fixture();
 try{
  const p=props(f).find(p=>solid(p)&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35);assert(p);
  f.worker(1,f.point(-6,0),f.point(6,0));start(f);f.advance(11);const body=f.body(1);
  assert.throws(()=>f.session.core.generate(999,0,0,'desert'),/retire the authority/);assert.deepEqual(f.body(1),body);
  assert.equal(f.session.core.removeProp(identity(p)),1);assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();}
});

test('a rejected prop mutation leaves a real in-flight pthread result publishable',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
 const runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  const {p,a,b}=candidate(f),handle=f.worker(1,a,b);start(f);
  const id=await prepared(f.session.core,4,4);
  assert.throws(()=>restore(f,[p]),/Could not restore removed spatial props/);
  assert(f.session.core.preparation.publish(id,4,4)>0);assert.equal(f.session.core.preparation.release(),1);
  assert.equal(f.advance(10.1).status,'advanced');assert(f.bridge.nativeRouteExecution(handle));
 }finally{f.session.dispose();await runtime.dispose();}
});

test('a committed prop change invalidates stale pthread output without invalidating unrelated execution',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');
 const runtime=await createThreadedSpatialWorld(factory),f=fixture({core:runtime.core});
 try{
  const p=props(f).find(p=>solid(p)&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35);assert(p);
  const handle=f.worker(1,f.point(-6,0),f.point(6,0));start(f);const id=await prepared(f.session.core,4,4);
  assert.equal(f.session.core.removeProp(identity(p)),1);
  assert.equal(f.session.core.preparation.publish(id,4,4),-2);assert.equal(f.session.core.preparation.release(),1);
  assert(!f.session.core.hasResidentChunk(4,4));assert.equal(f.advance(11).status,'advanced');
  assert(f.bridge.nativeRouteExecution(handle));
 }finally{f.session.dispose();await runtime.dispose();}
});
