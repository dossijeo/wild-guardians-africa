import {createWorld} from './mobility-worker-world-change.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
import {createWorldEventGate} from '../../tools/trees/prototype_world_event_order.mjs';
let oldWorld,core,gate=createWorldEventGate('original'),module;
try{const [world,response]=await Promise.all([createWorld(),fetch('/src/world/wild-engine/spatial-savanna.wasm')]);if(!response.ok)throw Error('Missing WASM');module=await WebAssembly.compile(await response.arrayBuffer());oldWorld=world;core=world.session.core;postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=event=>{const request=event.data;try{
 if(request.kind==='edit'){
  const result=gate.edit(request,()=>{if(request.action==='remove'){if(!core.removeBarrier(request.barrierId))throw Error('Remove failed');return request.barrierId;}const id=core.addOrientedBarrier(request.point.x,request.point.z,1.2,1.2,0,0);if(id<=0)throw Error('Add failed');if(request.failAfterMutation)throw Error('Injected partial failure');return id;});postMessage({kind:'result',id:request.id,...result});
 }else if(request.kind==='checkpoint'){
  const start=performance.now(),nextGate=createWorldEventGate(request.newSession,{initialVersion:request.version}),scratch=createSpatialWorld(module);
  if(request.notifyStart)postMessage({kind:'restoring',id:request.id,at:performance.timeOrigin+performance.now()});
  scratch.restoreState(request.snapshot,request.cx,request.cz);
  for(let z=request.cz-1;z<=request.cz+1;z++)for(let x=request.cx-1;x<=request.cx+1;x++)if(scratch.selectChunk(x,z)<0&&scratch.addChunk(x,z)<0)throw Error('Chunk restoration failed');
  const profile=ANIMAL_SPATIAL_PROFILES.hyena;if(!scratch.buildNavigationProfile(profile.index,profile.radius,false))throw Error('Profile restoration failed');
  core=scratch;gate=nextGate;if(oldWorld){oldWorld.session.dispose();oldWorld=null;}
  postMessage({kind:'restored',id:request.id,session:request.newSession,version:request.version,elapsed:performance.now()-start,chunks:9,at:performance.timeOrigin+performance.now()});
 }else if(request.kind==='query'){
  const result=gate.query(request,()=>({clear:request.points.map(p=>core.localClear(p,p)),routes:request.routes.map(({start,end})=>core.routeWorldNative(start,end)),spatial:core.snapshot()}));postMessage({kind:'result',id:request.id,...result});
 }
}catch(error){postMessage({kind:'error',id:request.id,error:String(error?.message??error)});}};
