import test from 'node:test';import assert from 'node:assert/strict';
import {nativeInitialIdleBodyGraphicsFixture} from './helpers/native-initial-idle-body-graphics.js';
import {PROFILES} from '../src/simulation/workforce.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};},turn=()=>new Promise(resolve=>setImmediate(resolve));
for(const profile of PROFILES)for(const mode of ['rest','watch'])test(`${profile.id} cold ${mode}: Idle20 waits for the actual stationary owner then installs Walk once`,async()=>{
 const walk=deferred(),stationary=deferred(),loads=[],clip=mode==='rest'?'Idle':'Alert';let f,part,preparing,outcome;
 try{
  f=await nativeInitialIdleBodyGraphicsFixture({profile:profile.id,mode,coldWalk:true,beforeBake:async name=>{loads.push(name);if(name==='Walk_Skip')await walk.promise;else if(name===clip)await stationary.promise;}});
  const actor=f.roster.get(f.actor),root=actor.root,geometries=[];root.traverse(mesh=>{if(mesh.isMesh)geometries.push([mesh,mesh.geometry,mesh.geometry.index]);});const body=f.body(1);
  assert(loads.includes('Walk_Skip'));assert(loads.includes(clip));assert.equal(actor.hasBakedWalking(),false);
  let installs=0;const install=actor.installBakedWalk;actor.installBakedWalk=async(...args)=>{installs++;return install.apply(actor,args);};
  preparing=f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge}).then(value=>(outcome='ready',part=value),error=>{outcome=error;throw error;});preparing.catch(()=>{});
  await turn();walk.resolve();await turn();await turn();assert.equal(outcome,undefined,'download alone cannot complete or fail a blocked installation');assert.equal(installs,0);
  stationary.resolve();part=await preparing;assert(part.valid());assert.equal(installs,1);assert.equal(loads.filter(name=>name==='Walk_Skip').length,1);
  part.activate();part.finalize(f.commit());f.sync();f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert.deepEqual(f.body(1),body);assert.equal(f.acquires,1);
  for(const [mesh,geometry,index]of geometries){assert.equal(mesh.geometry,geometry);assert.equal(mesh.geometry.index,index);}assert.deepEqual(f.errors,[]);
 }finally{walk.resolve();stationary.resolve();await preparing?.catch(()=>{});part?.cancel();f?.close();}
});

for(const reason of ['abort','remove','changed-pose'])test(`cold Idle dependency ${reason} cannot publish a stale native candidate`,async()=>{
 const walk=deferred(),idle=deferred(),controller=new AbortController();let f,preparing;
 try{
  f=await nativeInitialIdleBodyGraphicsFixture({coldWalk:true,beforeBake:async name=>{if(name==='Walk_Skip')await walk.promise;else if(name==='Idle')await idle.promise;}});
  preparing=f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:f.getPickAge,signal:controller.signal});preparing.catch(()=>{});
  walk.resolve();await turn();
  if(reason==='abort')controller.abort();else if(reason==='remove'){f.state.workers=[];f.roster.sync();}else{f.state.workers[0].x+=1;f.roster.sync();}
  idle.resolve();await assert.rejects(preparing,{name:'AbortError'});await turn();f.flush();assert.equal(f.roster.status().native,0);assert.equal(f.roster.status().nativePreparing,0);assert.deepEqual(f.errors,[]);
 }finally{walk.resolve();idle.resolve();await preparing?.catch(()=>{});f?.close();}
});
