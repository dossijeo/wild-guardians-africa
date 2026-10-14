import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {cachedWateringRoute} from '../../src/world/watering-route-cache.js';

const snapshot=gunzipSync(readFileSync(new URL(
  '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString();
const module=new WebAssembly.Module(readFileSync(new URL('./nav-cache-prototype.wasm',import.meta.url)));
function create(state){
  const loaded=new Map(),session=createSpatialGameSession(module,state,{
    experimentalNativeCache:true,loaded:()=>loaded,
    onData:data=>loaded.set(`${data.cx},${data.cz}`,data)
  });
  for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
    if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
    loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  return {session,nav:createSpatialNavigationMovement(session,state),loaded};
}
const state=deserialize(snapshot),{session,nav,loaded}=create(state),rows=[];
const gate=state.structures.find(s=>s.id==='structure-9865');
assert(gate?.gate);
const [start,end]=gatePortalPoints(gate,.28),wasm=session.core.wasm;
function inspect(stage){
  const cachedPath=nav.workerPath(start,end),fresh=session.routeActor(start,end,{worker:true});
  const animalFresh=session.actorConnectivity(start,end,{worker:false,species:'warthog'});
  const animalJs=nav.regionConnected(start,end,ANIMAL_SPATIAL_PROFILES.warthog.radius,null,false);
  assert.equal(animalJs,animalFresh==='possible'?true:
    animalFresh==='blocked'?false:null,`stale animal connectivity at ${stage}`);
  session.actorRegions(start,{worker:true});
  const cachedConnected=wasm.nav_cached_connected(65,3,68,3);
  const hitConnected=wasm.nav_cached_connected(65,3,68,3);
  const freshConnected=wasm.lazy_connected(65,3,68,3);
  const row={stage,jsPath:cachedPath?'found':'blocked',freshPath:fresh.status,
    animalJs,animalFresh,
    wasmCached:cachedConnected,wasmHit:hitConnected,wasmFresh:freshConnected,
    topologyRevision:session.topologySource.revision(),chunkRevision:session.core.chunkRevision(),
    sectorRevision:wasm.lazy_sector_updates(),nativeHits:wasm.nav_cache_total_hits(),
    nativeMisses:wasm.nav_cache_total_misses()};
  assert.equal(row.jsPath,row.freshPath,`stale JavaScript route at ${stage}`);
  assert.equal(row.wasmCached,row.wasmFresh,`stale native connectivity at ${stage}`);
  assert.equal(row.wasmHit,row.wasmFresh,`stale native hit at ${stage}`);
  rows.push(row);
}
try{
  inspect('automatic-gate-open');
  gate.gate=false;session.syncState(state);inspect('gate-converted-to-solid');
  gate.gate=true;session.syncState(state);inspect('gate-restored');
  state.structures.splice(state.structures.indexOf(gate),1);
  session.syncState(state);inspect('wall-removed-breach');
  state.structures.push(gate);session.syncState(state);inspect('wall-restored');

  session.actorRegions(start,{worker:true});
  const cross={ax:65,az:3,bx:10,bz:3};
  const before=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(before,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  assert(session.core.removeChunk(0,0));loaded.delete('0,0');
  const absent=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(absent,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  assert.equal(absent,-1,'an unloaded endpoint is unknown, not blocked');
  session.core.addChunk(0,0);loaded.set('0,0',session.core.chunkPayload());
  const restored=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(restored,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  rows.push({stage:'residency-remove-and-restore',before,absent,restored,
    nativeHits:wasm.nav_cache_total_hits(),nativeMisses:wasm.nav_cache_total_misses()});

  // A production JS route cache once retained this gate crossing after the
  // gate's chunk was unloaded because its key contained topology, not residency.
  const worker={...start,radius:.28},plant={id:'gate-crossing',species:'mijo',...end};
  let computations=0;
  const compute=()=>{
    computations++;
    const path=nav.path(start,end,.28,null,true);
    return path?{destination:end,path}:null;
  };
  assert(cachedWateringRoute(worker,plant,nav,compute));
  assert(cachedWateringRoute(worker,plant,nav,compute));
  assert.equal(computations,1);
  assert(session.core.removeChunk(1,0));loaded.delete('1,0');
  let freshUnknown=false,cachedUnknown=false;
  try{nav.path(start,end,.28,null,true);}catch(error){freshUnknown=error.name==='SpatialChunkUnavailable';}
  try{cachedWateringRoute(worker,plant,nav,compute);}
  catch(error){cachedUnknown=error.name==='SpatialChunkUnavailable';}
  assert(freshUnknown&&cachedUnknown,'JS cache must not hide an unloaded sector');
  const nativeMissing=session.routeActor(start,end,{worker:true});
  let workerMissing='blocked';
  try{workerMissing=nav.workerPath(start,end)?'found':'blocked';}
  catch(error){if(error.name!=='SpatialChunkUnavailable')throw error;workerMissing='unknown';}
  assert.equal(workerMissing,nativeMissing.status,
    'a JS negative worker-route proof must not hide native unknown');
  assert.equal(computations,2);
  session.core.addChunk(1,0);loaded.set('1,0',session.core.chunkPayload());
  assert(cachedWateringRoute(worker,plant,nav,compute));
  const nativeResident=session.routeActor(start,end,{worker:true});
  assert.equal(nav.workerPath(start,end)?'found':'blocked',nativeResident.status);
  assert.equal(computations,3);
  rows.push({stage:'js-watering-route-residency',freshUnknown,cachedUnknown,
    workerMissing,nativeMissing:nativeMissing.status,nativeResident:nativeResident.status,
    computations,topologyRevision:nav.version,residencyRevision:nav.residencyRevision});

  // Portal revisions must invalidate a native answer even when no sector is
  // rebuilt: sector-update counters alone are insufficient cache versions.
  session.actorRegions(start,{worker:true});
  const portalBefore=wasm.nav_cached_connected(65,3,68,3),sectorBefore=wasm.lazy_sector_updates();
  wasm.lazy_clear_portals();wasm.lazy_commit_portals();
  const sectorAfter=wasm.lazy_sector_updates();
  const portalCached=wasm.nav_cached_connected(65,3,68,3);
  const portalFresh=wasm.lazy_connected(65,3,68,3);
  assert.equal(sectorBefore,sectorAfter);
  assert.equal(portalCached,portalFresh,'native cache missed a portal-only revision');
  rows.push({stage:'native-portal-only-revision',portalBefore,portalCached,portalFresh,
    sectorBefore,sectorAfter});

  const reloadedState=deserialize(serialize(state)),reloaded=create(reloadedState);
  try{
    assert.equal(reloaded.session.core.wasm.nav_cache_total_entries(),0,
      'restoration must create a fresh native cache');
    const freshNav=reloaded.nav,[a,b]=gatePortalPoints(reloadedState.structures.find(s=>s.id===gate.id),.28);
    const js=freshNav.workerPath(a,b),native=reloaded.session.routeActor(a,b,{worker:true});
    assert.equal(js?'found':'blocked',native.status);
    rows.push({stage:'save-load-new-session',jsPath:js?'found':'blocked',freshPath:native.status,
      nativeEntries:reloaded.session.core.wasm.nav_cache_total_entries()});
  }finally{reloaded.session.dispose();}
}finally{session.dispose();}
const out=process.argv[2]??'docs/qa/wild-engine-cache-benchmark/coherence.json';
writeFileSync(out,JSON.stringify({fixture:'desierto983-d15',rows},null,2));
console.log(JSON.stringify({out,rows},null,2));
