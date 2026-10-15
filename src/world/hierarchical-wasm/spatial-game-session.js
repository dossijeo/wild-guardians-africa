import {centerFootprint} from '../centers.js';
import {createSpatialWorld} from './spatial-world.js';
import {createSpatialTerrainView} from './spatial-terrain-view.js';
import {createSpatialChunkStream} from './spatial-chunk-stream.js';
import {createSpatialWallMirror} from './spatial-wall-mirror.js';
import {createSpatialCenterMirror} from './spatial-center-mirror.js';
import {createSpatialShieldMirror} from './spatial-shield-mirror.js';
import {createSpatialPropMirror} from './spatial-prop-mirror.js';
import {queryResidentSpatialProps} from './spatial-prop-query.js';
import {addSpatialVillageBuildings,removeSpatialVillageBuildings} from './spatial-village-bridge.js';
import {spatialStructureBarriers} from './spatial-wall-bridge.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {BIOME_IDS} from '../biome-ids.js';

// One authoritative WASM instance supplies the renderer and the actor graph.
// This is a six-biome integration probe; it is not wired into normal gameplay.
export function createSpatialGameSession(module,state,streamOptions){
  if(!Object.hasOwn(BIOME_IDS,state?.biome)||!Array.isArray(state.villages)||!state.villages.length)
    throw TypeError('Expected a supported game biome and a village');
  const core=streamOptions.core??createSpatialWorld(module,{
    experimentalNativeCache:streamOptions.experimentalNativeCache}),first=state.villages[0];
  const cx=Math.floor((first.x+24)/48),cz=Math.floor((first.z+24)/48);
  if(streamOptions.core){
    const generated=core.terrainState();
    if(String(generated.seed)!==String(state.seed)||
      generated.biome!==BIOME_IDS[state.biome])
      throw TypeError('Pre-generated spatial world does not match game state');
  }else core.generate(state.seed,cx,cz,state.biome);
  const field=createSpatialTerrainView(core);
  const villages=new Map();
  const chunkRevisions=new Map();
  let terrainRevision=0;
  let stream=null;
  function installVillage(village,gameState,initial=false){
    if(village?.id==null||villages.has(village.id)||!Array.isArray(village.buildings))
      throw TypeError('Expected a new spatial village with buildings');
    const activeCenters=gameState.structures.filter(s=>s.kind==='center'&&
      s.villageId===village.id&&s.status!=='ruined');
    const planned=village.center;
    const plannedCenters=planned&&Number.isFinite(planned.x)&&Number.isFinite(planned.z)&&
      !activeCenters.some(center=>Math.hypot(center.x-planned.x,center.z-planned.z)<.01&&
        Math.abs((center.yaw??0)-(planned.yaw??0))<1e-6&&
        (center.culture??village.culture)===(planned.culture??village.culture))?
      [planned]:[];
    const footprints=[...village.buildings.filter(b=>b.kind!=='Zona común').map(b=>b.footprint),
      ...[...activeCenters,...plannedCenters].map(s=>centerFootprint(s,gameState).footprint)];
    const points=footprints.flat();
    if(!points.length)throw TypeError('A spatial village needs physical buildings');
    const sites=gameState.biome==='gran-canon'?footprints.map(footprint=>{
      const xs=footprint.map(point=>point.x),zs=footprint.map(point=>point.z);
      const minX=Math.min(...xs),maxX=Math.max(...xs),
        minZ=Math.min(...zs),maxZ=Math.max(...zs);
      return {x:(minX+maxX)/2,z:(minZ+maxZ)/2,
        hx:(maxX-minX)/2+1.25,hz:(maxZ-minZ)/2+1.25};
    }):[{x:village.x,z:village.z,
      hx:Math.max(...points.map(p=>Math.abs(p.x-village.x)))+1.25,
      hz:Math.max(...points.map(p=>Math.abs(p.z-village.z)))+1.25}];
    const changed=new Set();
    for(const [i,site] of sites.entries()){
      if(!Object.values(site).every(Number.isFinite)||site.hx>100||site.hz>100)
        throw RangeError('Spatial settlement exceeds supported bounds');
      const level=initial&&i===0?core.setSettlement(site.x,site.z,site.hx,site.hz):
        core.addSettlement(site.x,site.z,site.hx,site.hz);
      if(!Number.isFinite(level))throw Error('Could not create spatial settlement');
      for(const {cx,cz} of core.changedChunks())changed.add(`${cx},${cz}`);
    }
    for(const key of changed)chunkRevisions.set(key,(chunkRevisions.get(key)??0)+1);
    villages.set(village.id,addSpatialVillageBuildings(core,village));
    terrainRevision++;
    if(stream)stream.invalidate([...changed]);
  }
  for(const village of state.villages)installVillage(village,state,village===first);
  const walls=createSpatialWallMirror(core),centers=createSpatialCenterMirror(core),
    shields=createSpatialShieldMirror(core),props=createSpatialPropMirror(core,state.suppressed);
  walls.sync(state.structures);
  centers.sync(state);shields.sync(state.spells);
  const profiles=new Set();
  let workerPortalRevision=-1,workerPortalChunkRevision=-1,
    workerPortalTerrainRevision=-1,workerPortalCenterRevision=-1,
    workerPortalPropRevision=-1;
  let activeWallPreview=null,villagePreviewDepth=0;
  function installWorkerPortals(extra=[]){
    const gates=new Map(state.structures.filter(s=>s.kind==='wall'&&s.gate)
      .map(s=>[s.id,s]));
    for(const wall of extra)if(wall.kind==='wall'){
      if(wall.gate)gates.set(wall.id,wall);
      else gates.delete(wall.id);
    }
    core.setWorkerGatePortals([...gates.values()]);
    workerPortalRevision=walls.revision();
    workerPortalChunkRevision=core.chunkRevision();
    workerPortalTerrainRevision=terrainRevision;
    workerPortalCenterRevision=centers.revision();
    workerPortalPropRevision=props.revision();
  }
  function selectProfile(profile){
    if(!profiles.has(profile.index)){
      core.buildNavigationProfile(profile.index,profile.radius,profile.worker);
      profiles.add(profile.index);
    }else core.selectNavigationProfile(profile.index);
    if(profile.worker&&(workerPortalRevision!==walls.revision()||
      workerPortalChunkRevision!==core.chunkRevision()||
      workerPortalTerrainRevision!==terrainRevision||
      workerPortalCenterRevision!==centers.revision()||
      workerPortalPropRevision!==props.revision())){
      installWorkerPortals(activeWallPreview?.proposed??[]);
    }
  }
  function actorProfile({worker=true,species='warthog'}={}){
    const profile=worker?WORKER_SPATIAL_PROFILE:ANIMAL_SPATIAL_PROFILES[species];
    if(!profile)throw RangeError('Unsupported spatial actor profile');
    selectProfile(profile);
    return profile;
  }
  selectProfile(WORKER_SPATIAL_PROFILE);
  selectProfile(ANIMAL_SPATIAL_PROFILES.warthog);
  stream=createSpatialChunkStream(core,{...streamOptions,
    onData:data=>{
      data.terrainRevision=chunkRevisions.get(`${data.cx},${data.cz}`)??0;
      streamOptions.onData(data);
    }});
  function syncState(next){
    if(next.seed!==state.seed||next.biome!==state.biome)
      throw TypeError('A spatial session cannot change seed or biome');
    // A founded village can clear props that were present at preview time.
    // Register its paid suppressions before the settlement regenerates those
    // chunks, so the native prop identity is still available to remove.
    const propChanges=props.sync(next.suppressed);
    for(const village of next.villages)if(!villages.has(village.id))installVillage(village,next);
    walls.sync(next.structures);centers.sync(next);shields.sync(next.spells);
    return {suppressed:props.suppressed,removedProps:propChanges.added};
  }
  function routeActor(start,end,{worker=true,species='warthog'}={}){
    actorProfile({worker,species});
    return core.routeWorld(start,end);
  }
  function actorConnectivity(start,end,options){
    actorProfile(options);
    return core.connectedWorld(start,end);
  }
  function actorSectorRevision(options){
    actorProfile(options);
    return core.wasm.lazy_sector_updates();
  }
  function actorRegions(point,options){
    actorProfile(options);
    return core.componentsWorld(point);
  }
  function actorEnclosure(point,options){
    actorProfile(options);
    return core.enclosureWorld(point);
  }
  function actorRegionsBatch(points,options){
    actorProfile(options);
    return core.componentsWorldBatch(points);
  }
  function actorCanStand(point,options){
    if(!Number.isFinite(point?.x)||!Number.isFinite(point?.z))
      throw TypeError('Expected a finite actor position');
    actorProfile(options);
    return core.localClear(point,point);
  }
  function actorStepClear(start,end,options){
    if(![start?.x,start?.z,end?.x,end?.z].every(Number.isFinite))
      throw TypeError('Expected finite actor step endpoints');
    actorProfile(options);
    return core.localClear(start,end);
  }
  function actorStepClearExceptWalls(start,end,wallIds,options){
    if(!Array.isArray(wallIds)||wallIds.length<1||wallIds.length>4)
      throw TypeError('Expected 1–4 overlapping wall IDs');
    actorProfile(options);
    const ids=wallIds.flatMap(id=>walls.barrierIds(id));
    if(ids.length!==wallIds.length)return false;
    return core.localClearExcept(start,end,ids);
  }
  function withWallPreview(proposed,suppress,inspect,refreshPortals=false){
    if(!Array.isArray(proposed)||!Array.isArray(suppress)||typeof inspect!=='function')
      throw TypeError('Expected proposed walls, suppressed props and a callback');
    const parent=activeWallPreview;
    const previous=parent?.suppressed??[...props.suppressed];
    const desired=[...new Set([...props.suppressed,...suppress])];
    const records=ids=>ids.map(id=>{
      const match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
      if(!match)throw TypeError(`Unsupported spatial prop ID: ${id}`);
      return {group:Number(match[1]),gx:Number(match[2]),gz:Number(match[3])};
    });
    const barriers=proposed.flatMap(wall=>spatialStructureBarriers(wall));
    let ids=[],context=null,parentRemoved=false;
    try{
      if(parent?.ids.length){core.applyBarrierChanges(parent.ids,[]);parent.ids=[];parentRemoved=true;}
      if(desired.length!==previous.length||desired.some(id=>!previous.includes(id)))
        core.restoreRemovedProps(records(desired));
      if(barriers.length)ids=core.applyBarrierChanges([],barriers);
      context={ids,barriers,suppressed:desired,proposed,
        refreshPortals:refreshPortals||parent?.refreshPortals};
      activeWallPreview=context;
      if(context.refreshPortals){
        selectProfile(WORKER_SPATIAL_PROFILE);
        installWorkerPortals(proposed);
      }
      return inspect();
    }finally{
      if(context?.ids.length)core.applyBarrierChanges(context.ids,[]);
      else if(!context&&ids.length)core.applyBarrierChanges(ids,[]);
      activeWallPreview=parent;
      if(context?.refreshPortals){
        selectProfile(WORKER_SPATIAL_PROFILE);
        installWorkerPortals(parent?.proposed??[]);
      }
      if(desired.length!==previous.length||desired.some(id=>!previous.includes(id)))
        core.restoreRemovedProps(records(previous));
      if(parentRemoved)parent.ids=core.applyBarrierChanges([],parent.barriers);
    }
  }
  function withVillageEntryPreview(buildings,inspect){
    if(!Array.isArray(buildings)||typeof inspect!=='function')
      throw TypeError('Expected provisional village buildings and a callback');
    const ids=addSpatialVillageBuildings(core,{id:'entry-preview',buildings:
      buildings.map((building,index)=>({...building,key:`entry-preview-${index}`}))});
    villagePreviewDepth++;
    try{return inspect();}finally{villagePreviewDepth--;removeSpatialVillageBuildings(core,ids);}
  }
  // Only settlements change the far relief. Walls, crop turnover, shield HP and
  // removed props leave its mesh intact, so they must not queue new horizons.
  const horizonSource={revision:()=>terrainRevision,snapshot:()=>core.terrainState()};
  // Region memberships expire only after changes to physical passability.
  // Crop turnover and structure HP updates keep the same component IDs.
  const topologySource={revision:()=>terrainRevision+walls.revision()+
    centers.revision()+shields.revision()+props.revision()};
  const queryPropsAt=(x,z,radius)=>queryResidentSpatialProps(
    streamOptions.loaded(),props.suppressed,x,z,radius,
    key=>chunkRevisions.get(key)??0);
  return {core,field,stream,horizonSource,topologySource,suppressed:props.suppressed,syncState,
    graphPreviewActive:()=>activeWallPreview!==null||villagePreviewDepth>0,
    routeActor,actorConnectivity,actorSectorRevision,actorRegions,actorEnclosure,actorRegionsBatch,actorCanStand,actorStepClear,
    actorStepClearExceptWalls,
    queryPropsAt,withWallPreview,withVillageEntryPreview,
    dispose:()=>stream.dispose()};
}
