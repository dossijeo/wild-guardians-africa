import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/hierarchical-wasm/spatial-movement-profiles.js';
import {gatePortalPoints} from '../../src/world/gate-passages.js';
import {cachedWateringRoute} from '../../src/world/watering-route-cache.js';
import {walkTo} from '../../src/simulation/game.js';

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
const gateWorker={...start,radius:.28},gatePlant={id:'gate-coherence',species:'mijo',...end};
const gateRoute=()=>{const points=nav.path(start,end,.28,null,true);
  return points?{destination:end,path:points}:null;};
const nativePairs=[[65,3,68,3],[65,3,10,3],[68,3,65,3],
  [10,3,68,3],[65,3,65,5]];
function compareNativeQueries(stage){
  const discrepancies=[];
  for(const profile of [{worker:true},{worker:false,species:'warthog'}]){
    session.actorRegions(start,profile);
    for(const [ax,az,bx,bz] of nativePairs){
    const cachedConnected=wasm.nav_cached_connected(ax,az,bx,bz),
      cachedReason=wasm.lazy_connected_reason();
    const freshConnected=wasm.lazy_connected(ax,az,bx,bz),
      freshReason=wasm.lazy_connected_reason();
    if(cachedConnected!==freshConnected||cachedReason!==freshReason)
      discrepancies.push({profile,query:'connected',ax,az,bx,bz,cachedConnected,
        freshConnected,cachedReason,freshReason});
    const cachedLength=wasm.nav_cached_route(ax,az,bx,bz),
      cachedRoute=Array.from(new Int32Array(wasm.memory.buffer,
        wasm.lazy_route_ptr(),Math.max(0,cachedLength)*2)),
      cachedRouteReason=wasm.lazy_connected_reason();
    const freshLength=wasm.lazy_route(ax,az,bx,bz),
      freshRoute=Array.from(new Int32Array(wasm.memory.buffer,
        wasm.lazy_route_ptr(),Math.max(0,freshLength)*2)),
      freshRouteReason=wasm.lazy_connected_reason();
    if(cachedLength!==freshLength||cachedRouteReason!==freshRouteReason||
       cachedRoute.some((value,index)=>value!==freshRoute[index]))
      discrepancies.push({profile,query:'route',ax,az,bx,bz,cachedLength,
        freshLength,cachedRouteReason,freshRouteReason});
    }
  }
  session.actorRegions(start,{worker:true});
  assert.deepEqual(discrepancies,[],`stale native answer at ${stage}`);
  return nativePairs.length*2;
}
function inspect(stage){
  const cachedPath=nav.workerPath(start,end),fresh=session.routeActor(start,end,{worker:true});
  const jsCached=cachedWateringRoute(gateWorker,gatePlant,nav,gateRoute);
  assert.equal(jsCached?.path?'found':'blocked',fresh.status,
    `stale JS watering route at ${stage}`);
  const animalFresh=session.actorConnectivity(start,end,{worker:false,species:'warthog'});
  const animalJs=nav.regionConnected(start,end,ANIMAL_SPATIAL_PROFILES.warthog.radius,null,false);
  assert.equal(animalJs,animalFresh==='possible'?true:
    animalFresh==='blocked'?false:null,`stale animal connectivity at ${stage}`);
  session.actorRegions(start,{worker:true});
  const cachedConnected=wasm.nav_cached_connected(65,3,68,3);
  const hitConnected=wasm.nav_cached_connected(65,3,68,3);
  const freshConnected=wasm.lazy_connected(65,3,68,3);
  const row={stage,jsPath:cachedPath?'found':'blocked',
    jsCachedPath:jsCached?.path?'found':'blocked',freshPath:fresh.status,
    animalJs,animalFresh,
    wasmCached:cachedConnected,wasmHit:hitConnected,wasmFresh:freshConnected,
    topologyRevision:session.topologySource.revision(),chunkRevision:session.core.chunkRevision(),
    sectorRevision:wasm.lazy_sector_updates(),nativePairs:compareNativeQueries(stage),
    nativeHits:wasm.nav_cache_total_hits(),
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

  // Placement previews temporarily edit the native graph without committing a
  // structure to the game state. Cached native answers must follow that graph
  // and return to the confirmed answer when the preview is discarded.
  const confirmed=session.actorConnectivity(start,end,{worker:true});
  const previewWall={...gate,id:'cache-preview-wall',gate:false};
  const missesBeforePreview=wasm.nav_cache_total_misses();
  session.withWallPreview([previewWall],[],()=>{
    const pairs=compareNativeQueries('uncommitted-wall-preview');
    const misses=wasm.nav_cache_total_misses();
    assert(misses>missesBeforePreview,
      'preview topology must invalidate previously cached native answers');
    const cached=session.core.wasm.nav_cached_connected(65,3,68,3);
    const fresh=session.core.wasm.lazy_connected(65,3,68,3);
    assert.equal(cached,fresh,'native cache hid a preview barrier');
    rows.push({stage:'uncommitted-wall-preview',pairs,cached,fresh,
      missesBeforePreview,misses});
  });
  const afterPreview=session.actorConnectivity(start,end,{worker:true});
  assert.equal(afterPreview,confirmed,'preview changed the confirmed graph');
  const missesBeforeDiscardedQuery=wasm.nav_cache_total_misses();
  const pairsAfterDiscard=compareNativeQueries('wall-preview-discarded');
  const missesAfterDiscardedQuery=wasm.nav_cache_total_misses();
  assert(missesAfterDiscardedQuery>missesBeforeDiscardedQuery,
    'discarding a preview must invalidate preview-only native answers');
  rows.push({stage:'wall-preview-discarded',pairs:pairsAfterDiscard,
    confirmed,afterPreview,missesBeforeDiscardedQuery,missesAfterDiscardedQuery});

  // A portal-only preview changes the C++ graph without changing the
  // committed topology or resident chunks. Compare a warmed JS route with a
  // fresh native answer while that provisional graph is active.
  const previewWorker={...start,radius:.28},previewPlant={id:'preview-gate',species:'mijo',...end};
  const previewCompute=()=>{const path=nav.path(start,end,.28,null,true);
    return path?{destination:end,path}:null;};
  assert(cachedWateringRoute(previewWorker,previewPlant,nav,previewCompute));
  const committedRevision=nav.version,committedResidency=nav.residencyRevision;
  gate.gate=false;
  try{
    session.withWallPreview([],[],()=>{
      const fresh=session.routeActor(start,end,{worker:true});
      const js=cachedWateringRoute(previewWorker,previewPlant,nav,previewCompute);
      rows.push({stage:'js-portal-only-preview',fresh:fresh.status,
        js:js?'found':'blocked',committedRevision,previewRevision:nav.version,
        committedResidency,previewResidency:nav.residencyRevision});
      assert.equal(js?'found':'blocked',fresh.status,
        'JS route cache hid a provisional native portal update');
    },true);
  }finally{gate.gate=true;}
  assert.equal(nav.version,committedRevision);
  assert.equal(nav.residencyRevision,committedResidency);

  session.actorRegions(start,{worker:true});
  const cross={ax:65,az:3,bx:10,bz:3};
  const before=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(before,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  assert(session.core.removeChunk(0,0));loaded.delete('0,0');
  const absentPairs=compareNativeQueries('residency-removed');
  const absent=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(absent,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  assert.equal(absent,-1,'an unloaded endpoint is unknown, not blocked');
  session.core.addChunk(0,0);loaded.set('0,0',session.core.chunkPayload());
  const restoredPairs=compareNativeQueries('residency-restored');
  const restored=wasm.nav_cached_connected(cross.ax,cross.az,cross.bx,cross.bz);
  assert.equal(restored,wasm.lazy_connected(cross.ax,cross.az,cross.bx,cross.bz));
  rows.push({stage:'residency-remove-and-restore',before,absent,restored,
    absentPairs,restoredPairs,
    nativeHits:wasm.nav_cache_total_hits(),nativeMisses:wasm.nav_cache_total_misses()});

  // A production JS route cache once retained this gate crossing after the
  // gate's chunk was unloaded because its key contained topology, not residency.
  const worker={...start,radius:.28},plant={id:'gate-crossing',species:'mijo',...end};
  const liveRoute=nav.workerPath(start,end),destination={id:'gate-crossing',...end};
  assert(liveRoute?.length,'expected an initially valid worker route');
  const walkingWorker={id:'cache-coherence-worker',status:'returning',...start,radius:.28,
    path:liveRoute,destinationId:destination.id,pathVersion:nav.version,
    pathResidencyRevision:nav.residencyRevision};
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
  assert.throws(()=>walkTo(state,walkingWorker,destination,0,nav),
    {name:'SpatialChunkUnavailable'},
    'an active actor route must not hide an unloaded gate sector');
  const nativeMissing=session.routeActor(start,end,{worker:true});
  let workerMissing='blocked';
  try{workerMissing=nav.workerPath(start,end)?'found':'blocked';}
  catch(error){if(error.name!=='SpatialChunkUnavailable')throw error;workerMissing='unknown';}
  assert.equal(workerMissing,nativeMissing.status,
    'a JS negative worker-route proof must not hide native unknown');
  assert.equal(computations,2);
  session.core.addChunk(1,0);loaded.set('1,0',session.core.chunkPayload());
  assert(cachedWateringRoute(worker,plant,nav,compute));
  assert.equal(walkTo(state,walkingWorker,destination,0,nav),false);
  assert(walkingWorker.path?.length,'worker route was not rebuilt after residency returned');
  const nativeResident=session.routeActor(start,end,{worker:true});
  assert.equal(nav.workerPath(start,end)?'found':'blocked',nativeResident.status);
  assert.equal(computations,3);
  rows.push({stage:'js-watering-route-residency',freshUnknown,cachedUnknown,
    workerMissing,nativeMissing:nativeMissing.status,nativeResident:nativeResident.status,
    computations,topologyRevision:nav.version,residencyRevision:nav.residencyRevision});
  rows.push({stage:'active-worker-route-residency',replanned:true,
    pathPoints:walkingWorker.path.length,residencyRevision:walkingWorker.pathResidencyRevision});

  // Portal revisions must invalidate a native answer even when no sector is
  // rebuilt: sector-update counters alone are insufficient cache versions.
  session.actorRegions(start,{worker:true});
  const portalBefore=wasm.nav_cached_connected(65,3,68,3),sectorBefore=wasm.lazy_sector_updates();
  wasm.lazy_clear_portals();wasm.lazy_commit_portals();
  const sectorAfter=wasm.lazy_sector_updates();
  const portalCached=wasm.nav_cached_connected(65,3,68,3);
  const portalFresh=wasm.lazy_connected(65,3,68,3);
  const portalPairs=compareNativeQueries('native-portal-only-revision');
  assert.equal(sectorBefore,sectorAfter);
  assert.equal(portalCached,portalFresh,'native cache missed a portal-only revision');
  rows.push({stage:'native-portal-only-revision',portalBefore,portalCached,portalFresh,
    sectorBefore,sectorAfter,portalPairs});

  // The production workerPath adapter also retains native `blocked` answers.
  // Reopen this portal only inside a preview, without changing either JS
  // epoch, and require the adapter to see the new native route.
  assert.equal(nav.workerPath(start,end),null);
  session.withWallPreview([],[],()=>{
    const fresh=session.routeActor(start,end,{worker:true});
    const js=nav.workerPath(start,end);
    assert.equal(fresh.status,'found');
    assert.equal(js?'found':'blocked',fresh.status,
      'JS negative worker route hid a provisional native portal update');
    rows.push({stage:'js-negative-portal-preview',fresh:fresh.status,
      js:js?'found':'blocked',topologyRevision:nav.version,
      residencyRevision:nav.residencyRevision});
  },true);

  const reloadedState=deserialize(serialize(state)),reloaded=create(reloadedState);
  try{
    assert.equal(reloaded.session.core.wasm.nav_cache_total_entries(),0,
      'restoration must create a fresh native cache');
    const freshNav=reloaded.nav,[a,b]=gatePortalPoints(reloadedState.structures.find(s=>s.id===gate.id),.28);
    const js=freshNav.workerPath(a,b),native=reloaded.session.routeActor(a,b,{worker:true});
    assert.equal(js?'found':'blocked',native.status);
    const stale=[{x:999,z:999}],savedWorker=JSON.parse(JSON.stringify({
      id:'restored-worker',status:'returning',...a,radius:.28,path:stale,
      destinationId:'restored-gate',pathVersion:freshNav.version,
      pathResidencyRevision:freshNav.residencyRevision}));
    assert.equal(walkTo(reloadedState,savedWorker,{id:'restored-gate',...b},0,freshNav),false);
    assert.notDeepEqual(savedWorker.path,stale,
      'a serialized route must not be trusted by a new navigation session');
    rows.push({stage:'save-load-new-session',jsPath:js?'found':'blocked',freshPath:native.status,
      nativeEntries:reloaded.session.core.wasm.nav_cache_total_entries(),
      restoredRouteReplanned:true});
  }finally{reloaded.session.dispose();}
}finally{session.dispose();}
const out=process.argv[2]??'docs/qa/wild-engine-cache-benchmark/coherence.json';
if(out==='--verify')console.log(JSON.stringify({fixture:'desierto983-d15',
  stages:rows.map(row=>row.stage),discrepancies:0}));
else{
  writeFileSync(out,JSON.stringify({fixture:'desierto983-d15',rows},null,2));
  console.log(JSON.stringify({out,rows},null,2));
}
