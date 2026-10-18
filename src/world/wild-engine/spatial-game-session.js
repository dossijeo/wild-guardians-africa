import {centerFootprint} from '../centers.js';
import {createSpatialWorld} from './spatial-world.js';
import {createSpatialTerrainView} from './spatial-terrain-view.js';
import {createSpatialChunkStream} from './spatial-chunk-stream.js';
import {createSpatialWallMirror} from './spatial-wall-mirror.js';
import {createSpatialCenterMirror} from './spatial-center-mirror.js';
import {createSpatialShieldMirror} from './spatial-shield-mirror.js';
import {createSpatialPropMirror} from './spatial-prop-mirror.js';
import {queryResidentSpatialProps} from './spatial-prop-query.js';
import {addSpatialVillageBuildings} from './spatial-village-bridge.js';
import {spatialStructureBarriers} from './spatial-wall-bridge.js';
import {gatePortalPoints} from '../gate-passages.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {BIOME_IDS} from '../biome-ids.js';

// One authoritative WASM instance supplies the renderer and the actor graph.
// This is a six-biome integration probe; it is not wired into normal gameplay.
export function createSpatialGameSession(module,state,streamOptions){
  if(!Object.hasOwn(BIOME_IDS,state?.biome)||!Array.isArray(state.villages)||!state.villages.length)
    throw TypeError('Expected a supported game biome and a village');
  let core=streamOptions.core??createSpatialWorld(module);
  const confirmedCore=core,first=state.villages[0];
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
  let activeWallPreview=null;
  let previewCore=null,previewKey='';
  function isolatedPreviewCore(){
    const stamp=routeStamp();
    // The JS mirrors cover ordinary game commands, but native-only topology
    // changes also invalidate a reusable hypothesis instance. A confirmed
    // native revision is cheap to read and cannot be advanced by the scratch
    // world's own speculative mutations.
    const key=`${stamp.wall}:${stamp.other}:${stamp.chunks}:`+
      `${confirmedCore.wasm.lazy_route_revision()}`;
    if(previewCore&&previewKey===key)return previewCore;
    const scratch=createSpatialWorld(module);
    const current=confirmedCore.currentChunk();
    scratch.restoreState(confirmedCore.snapshot(),current.cx,current.cz);
    for(const name of streamOptions.loaded().keys()){
      const [cx,cz]=name.split(',').map(Number);
      if(Number.isInteger(cx)&&Number.isInteger(cz))scratch.addChunk(cx,cz);
    }
    const movementProfiles=[WORKER_SPATIAL_PROFILE,
      ...Object.values(ANIMAL_SPATIAL_PROFILES)];
    for(const index of profiles){
      const profile=movementProfiles.find(item=>item.index===index);
      if(!profile)throw Error(`Unknown preview navigation profile ${index}`);
      scratch.buildNavigationProfile(profile.index,profile.radius,profile.worker);
    }
    previewCore=scratch;previewKey=key;
    return scratch;
  }
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
  function routeActorNative(start,end,{worker=true,species='warthog',cached=false}={}){
    actorProfile({worker,species});
    return core.routeWorldNative(start,end,{cached});
  }
  function routeActorNativeBatch(queries,{worker=true,species='warthog'}={}){
    actorProfile({worker,species});
    return core.routeWorldNativeBatch(queries);
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
    const previousCore=core;
    const portalRevisions=[workerPortalRevision,workerPortalChunkRevision,
      workerPortalTerrainRevision,workerPortalCenterRevision,workerPortalPropRevision];
    const previous=parent?.suppressed??[...props.suppressed];
    const desired=[...new Set([...props.suppressed,...suppress])];
    const records=ids=>ids.map(id=>{
      const match=/^spatial:([0-5]):(-?\d+):(-?\d+)$/.exec(id);
      if(!match)throw TypeError(`Unsupported spatial prop ID: ${id}`);
      return {group:Number(match[1]),gx:Number(match[2]),gz:Number(match[3])};
    });
    const barriers=proposed.flatMap(wall=>spatialStructureBarriers(wall));
    if(!parent){
      core=isolatedPreviewCore();
      try{installWorkerPortals();}
      catch(error){
        core=previousCore;previewCore=null;previewKey='';
        [workerPortalRevision,workerPortalChunkRevision,
          workerPortalTerrainRevision,workerPortalCenterRevision,
          workerPortalPropRevision]=portalRevisions;
        throw error;
      }
    }
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
      const answer=inspect();
      if(answer&&typeof answer.then==='function')
        throw TypeError('A wall preview must finish synchronously');
      return answer;
    }finally{
      let restored=false;
      try{
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
        restored=true;
      }finally{
        if(!parent){
          core=previousCore;
          [workerPortalRevision,workerPortalChunkRevision,
            workerPortalTerrainRevision,workerPortalCenterRevision,
            workerPortalPropRevision]=portalRevisions;
          if(!restored){previewCore=null;previewKey='';activeWallPreview=null;}
        }
      }
    }
  }
  // A repair can restore a solid wall and close a previously open passage.
  // Keep the confirmed mirror and graph untouched: the native overlay probes
  // the changed footprints against the current topology. An inconclusive
  // overlay is unknown, never evidence that access has been lost.
  function withWallStatePreview(structures,inspect){
    if(!Array.isArray(structures)||typeof inspect!=='function'||activeWallPreview)
      throw TypeError('Expected an isolated wall-state preview');
    const actual=new Map(state.structures.filter(wall=>wall.kind==='wall'&&
      wall.status!=='ruined').map(wall=>[wall.id,wall]));
    const proposed=new Map(structures.filter(wall=>wall.kind==='wall'&&
      wall.status!=='ruined').map(wall=>[wall.id,wall]));
    const signature=wall=>[wall.x,wall.z,wall.yaw??0,wall.baseScaleX??1,
      wall.material,Boolean(wall.gate)].join(':');
    const removeIds=[],barriers=[],portals=[];
    let unsupported=false;
    for(const id of new Set([...actual.keys(),...proposed.keys()])){
      const before=actual.get(id),after=proposed.get(id);
      if(before&&after&&signature(before)===signature(after))continue;
      if(before){
        // The overlay can add a gate portal but cannot suppress an existing
        // one. A changed/removed gate must remain inconclusive.
        if(before.gate)unsupported=true;
        const installed=walls.barrierIds(id);
        if(installed.length!==spatialStructureBarriers(before).length)
          unsupported=true;
        removeIds.push(...installed);
      }
      if(after){
        barriers.push(...spatialStructureBarriers(after));
        if(after.gate)portals.push(gatePortalPoints(after));
      }
    }
    const supported=!unsupported&&removeIds.length<=4&&
      barriers.length<=128&&portals.every(points=>points.length===2);
    const route=(start,end)=>{
      if(!supported)return {status:'unknown'};
      selectProfile(WORKER_SPATIAL_PROFILE);
      const result=core.overlayReachBatch(start,[end],removeIds,barriers,
        {margin:48,portals});
      return {status:result?.[0]??'unknown'};
    };
    return inspect({route});
  }
  function gateOverlayClear(candidate,points,extraSuppress=[]){
    const parent=activeWallPreview;
    if(!parent||typeof core.wasm.spatial_overlay_local_clear!=='function'||
      points?.length!==2||!Array.isArray(extraSuppress)||
      extraSuppress.some(id=>!parent.suppressed.includes(id)))return null;
    const index=parent.proposed.findIndex(wall=>wall.id===candidate.id);
    if(index<0)return null;
    let offset=0;
    for(let i=0;i<index;i++)offset+=spatialStructureBarriers(parent.proposed[i]).length;
    const count=spatialStructureBarriers(parent.proposed[index]).length;
    const ids=parent.ids.slice(offset,offset+count);
    if(ids.length!==count)return null;
    selectProfile(WORKER_SPATIAL_PROFILE);
    return core.overlayLocalClear(points[0],points[1],ids,
      spatialStructureBarriers(candidate));
  }
  // Short-lived read-only wall hypothesis for local room and gate probes.
  // It never changes the confirmed graph; unknown residency or prop removal
  // sends the caller back to the full construction preview.
  function wallLocalOverlay(proposed,suppress){
    if(activeWallPreview||typeof core.wasm.spatial_overlay_local_clear!=='function'||
      !Array.isArray(proposed)||!Array.isArray(suppress))return null;
    const pieces=proposed.map(wall=>spatialStructureBarriers(wall));
    const all=pieces.flat();
    if(all.length>128)return null;
    const additionalSuppress=suppress.filter(id=>!props.suppressed.has(id));
    const clear=(a,b,barriers)=>{
      selectProfile(WORKER_SPATIAL_PROFILE);
      return core.overlayLocalClear(a,b,[],barriers,additionalSuppress);
    };
    return {
      walkable:(x,z)=>clear({x,z},{x,z},all),
      gateClear:(candidate,points)=>{
        if(points?.length!==2)return null;
        const index=proposed.findIndex(wall=>wall.id===candidate.id);
        if(index<0)return null;
        const replacement=spatialStructureBarriers(candidate);
        const barriers=pieces.flatMap((parts,i)=>i===index?replacement:parts);
        if(barriers.length>128)return null;
        return clear(points[0],points[1],barriers);
      }
    };
  }
  function wallWorkerReachability(origin,targets,proposed=[],suppress=[],reverse=false,
    removedWallIds=[]){
    if(activeWallPreview||!Array.isArray(proposed)||!Array.isArray(suppress)||
      !Array.isArray(removedWallIds)||
      typeof core.wasm.spatial_overlay_reach_batch!=='function')return null;
    const barriers=proposed.flatMap(spatialStructureBarriers);
    if(barriers.length>128)return null;
    const removeIds=removedWallIds.flatMap(id=>walls.barrierIds(id));
    if(removeIds.length>4)return null;
    const portals=proposed.filter(wall=>wall.gate).map(gatePortalPoints)
      .filter(points=>points.length===2);
    selectProfile(WORKER_SPATIAL_PROFILE);
    return core.overlayReachBatch(origin,targets,removeIds,barriers,
      {reverse,margin:48,portals,
        propIds:suppress.filter(id=>!props.suppressed.has(id))});
  }
  function wallCutSolidFaces(boundary,proposed,suppress,radius){
    if(activeWallPreview||!Array.isArray(proposed)||!Array.isArray(suppress))
      return null;
    const existing=new Set(state.structures.filter(piece=>piece.kind==='wall'&&
      piece.status!=='ruined').map(piece=>piece.id));
    const removed=proposed.filter(piece=>existing.has(piece.id));
    const removeIds=removed.flatMap(piece=>walls.barrierIds(piece.id));
    const barriers=proposed.flatMap(spatialStructureBarriers);
    if(removeIds.length>4||barriers.length>128||
      removed.some(piece=>!walls.barrierIds(piece.id).length))return null;
    return core.overlayCutSolidFaces(boundary,radius,removeIds,barriers,
      suppress.filter(id=>!props.suppressed.has(id)));
  }
  function withVillageEntryPreview(buildings,inspect,suppress=[]){
    if(!Array.isArray(buildings)||typeof inspect!=='function')
      throw TypeError('Expected provisional village buildings and a callback');
    const polygons=buildings.filter(building=>building.kind!=='Zona común');
    if(polygons.some(building=>!Array.isArray(building.footprint)))
      throw TypeError('Provisional village buildings need physical footprints');
    const propIds=suppress.filter(id=>!props.suppressed.has(id));
    selectProfile(WORKER_SPATIAL_PROFILE);
    const reach=(start,end,withCost)=>core.overlayReachBatch(start,[end],[],[],
      {margin:48,polygons,propIds,withCost})?.[0]??
      (withCost?{status:'unknown',cost:null}:'unknown');
    return inspect({
      walkable:point=>core.overlayLocalClear(point,point,[],[],propIds,polygons),
      reachable:(start,end)=>reach(start,end,false),
      reachCost:(start,end)=>reach(start,end,true)
    });
  }
  // Only settlements change the far relief. Walls, crop turnover, shield HP and
  // removed props leave its mesh intact, so they must not queue new horizons.
  const horizonSource={revision:()=>terrainRevision,snapshot:()=>core.terrainState()};
  // Region memberships expire only after changes to physical passability.
  // Crop turnover and structure HP updates keep the same component IDs.
  const topologySource={revision:()=>terrainRevision+walls.revision()+
    centers.revision()+shields.revision()+props.revision()};
  const routeStamp=()=>({wall:walls.revision(),
    other:terrainRevision+centers.revision()+shields.revision()+props.revision(),
    chunks:core.chunkRevision()});
  const routeUnaffectedByWalls=(stamp,points,radius)=>{
    if(!stamp)return false;
    const now=routeStamp();
    return stamp.other===now.other&&stamp.chunks===now.chunks&&
      walls.routeUnaffectedSince(stamp.wall,points,radius);
  };
  const queryPropsAt=(x,z,radius)=>queryResidentSpatialProps(
    streamOptions.loaded(),props.suppressed,x,z,radius,
    key=>chunkRevisions.get(key)??0);
  return {get core(){return core;},field,stream,horizonSource,topologySource,routeStamp,
    routeUnaffectedByWalls,suppressed:props.suppressed,syncState,
    routeActor,routeActorNative,routeActorNativeBatch,actorConnectivity,actorSectorRevision,actorRegions,actorEnclosure,actorRegionsBatch,actorCanStand,actorStepClear,
    actorStepClearExceptWalls,
    queryPropsAt,withWallPreview,withWallStatePreview,gateOverlayClear,
    wallLocalOverlay,wallWorkerReachability,wallCutSolidFaces,
    withVillageEntryPreview,
    dispose:()=>{previewCore=null;stream.dispose();}};
}
