import {ANIMAL_SPATIAL_PROFILES,WORKER_SPATIAL_PROFILE} from './spatial-movement-profiles.js';
import {gateFrameFootprints,gateSwingPolygon} from '../gate-passages.js';
import {sweptFootprintDistance} from '../footprints.js';
import {createSpatialPlacement} from './spatial-placement.js';
import {BIOME_IDS} from '../biome-ids.js';
import {centerFootprint} from '../centers.js';
import {validActiveBounds} from '../active-region.js';

const animalProfiles=Object.entries(ANIMAL_SPATIAL_PROFILES);
const finitePoint=point=>Number.isFinite(point?.x)&&Number.isFinite(point?.z);

export class SpatialChunkUnavailable extends Error {
  constructor(start,end,missing=[],details=null){
    super('Spatial navigation needs more resident chunks');
    this.name='SpatialChunkUnavailable';
    this.start={x:start.x,z:start.z};
    this.end={x:end.x,z:end.z};
    this.missing=missing;
    if(details)this.details=details;
  }
}

// Movement-facing part of the legacy Navigation contract. The native graph is
// the only planner here; unsupported target exclusion is never silently lost.
export function createSpatialNavigationMovement(session,state){
  if(!session?.routeActor||!session?.actorCanStand||!session?.actorStepClear)
    throw TypeError('Expected a spatial game session');
  if(!Array.isArray(state?.structures))throw TypeError('Expected live game structures');
  const config={seed:String(state.seed),biome:BIOME_IDS[state.biome],
    relief:1,density:1,river:!['desert','mangrove'].includes(BIOME_IDS[state.biome]),
    n:1,cx:0,cz:0,layers:[true,true,true,true,true,true]};
  const profile=(radius,worker,ignore)=>{
    if(ignore!=null)throw Error('Native target exclusion is not implemented');
    if(worker){
      if(Math.abs(radius-WORKER_SPATIAL_PROFILE.radius)>1e-6)
        throw RangeError('Unsupported worker radius');
      return {worker:true};
    }
    const match=animalProfiles.find(([,value])=>Math.abs(radius-value.radius)<1e-6);
    if(!match)throw RangeError('Unsupported animal radius');
    return {worker:false,species:match[0]};
  };
  const validate=(start,end)=>{
    if(!finitePoint(start)||!finitePoint(end))throw TypeError('Expected finite actor positions');
  };
  const walkable=(x,z,radius=.28,ignore=null,worker=true)=>{
    if(!Number.isFinite(x)||!Number.isFinite(z))throw TypeError('Expected a finite actor position');
    return session.actorCanStand({x,z},profile(radius,worker,ignore));
  };
  const segmentClear=(start,end,radius=.28,ignore=null,worker=true)=>{
    validate(start,end);
    const options=profile(radius,worker,ignore),distance=Math.hypot(end.x-start.x,end.z-start.z);
    const count=Math.max(1,Math.ceil(distance/1.25));
    let previous=start;
    for(let i=1;i<=count;i++){
      const point={x:start.x+(end.x-start.x)*i/count,z:start.z+(end.z-start.z)*i/count};
      if(!session.actorStepClear(previous,point,options))return false;
      previous=point;
    }
    return true;
  };
  const path=(start,end,radius=.28,ignore=null,worker=true)=>{
    validate(start,end);
    const options=profile(radius,worker,ignore);
    const result=session.routeActor(start,end,options);
    if(result.status==='unknown'){
      // The native route can also be unknown when a fractional endpoint has
      // no physically valid connector to its nearby grid anchors. If its
      // entire local neighborhood is resident, this is a blocked endpoint,
      // not missing terrain that should trigger more chunk generation.
      const knownBlocked=point=>session.queryPropsAt?.(point.x,point.z,1.5).status===
        'ready'&&!session.actorCanStand(point,options);
      if(knownBlocked(start)||knownBlocked(end))return null;
      const startRegions=session.actorRegions(start,options),
        endRegions=session.actorRegions(end,options);
      // A standable service point may sit in a sub-grid pocket beside a wall.
      // If its entire local neighborhood is resident but has no connector to
      // an integer cell, this candidate is physically unusable by the graph;
      // let the caller try another point instead of demanding more chunks.
      if(!startRegions.unknown&&!startRegions.ids.length||
         !endRegions.unknown&&!endRegions.ids.length)return null;
      throw new SpatialChunkUnavailable(start,end,[],{
        startRegions,endRegions,
        startProps:session.queryPropsAt?.(start.x,start.z,1.5).status,
        endProps:session.queryPropsAt?.(end.x,end.z,1.5).status});
    }
    return result.status==='found'?result.points:null;
  };
  const regionFor=(point,radius=.28,ignore=null,worker=true)=>{
    if(!finitePoint(point))throw TypeError('Expected a finite actor position');
    const result=session.actorRegions(point,profile(radius,worker,ignore));
    if(result.unknown||!result.ids.length)return null;
    // Several local connectors can reach distinct components at a boundary.
    // Keep all of them in the grouping key; connectivity itself still queries
    // the graph and never rejects a route from this grouping approximation.
    const ids=[...result.ids].sort((a,b)=>a-b);
    return {key:ids.join('|'),ids};
  };
  const regionConnected=(start,end,radius=.28,ignore=null,worker=true)=>{
    validate(start,end);
    const result=session.actorConnectivity(start,end,profile(radius,worker,ignore));
    return result==='blocked'?false:result==='possible'?true:null;
  };
  const propsAt=(x,z,radius)=>{
    if(!session.queryPropsAt)throw TypeError('Spatial prop query is unavailable');
    const result=session.queryPropsAt(x,z,radius);
    if(result.status==='unknown')throw new SpatialChunkUnavailable({x,z},{x,z},result.missing);
    return result.props;
  };
  const {placement,wallPlacement,placementFootprint}=
    createSpatialPlacement(session,state,propsAt);
  const setState=next=>{
    if(next!==state)throw TypeError('A spatial movement adapter needs its owning game state');
    return session.syncState(next);
  };
  const syncCropPlacement=(next,removedProps=[])=>{
    if(!Array.isArray(removedProps))throw TypeError('Expected removed spatial prop IDs');
    return setState(next);
  };
  let gateRevision=null,gateSource=null,gates=[];
  const activeGates=()=>{
    const revision=session.topologySource.revision();
    if(revision!==gateRevision||state.structures!==gateSource){
      gates=state.structures.filter(item=>item.gate);
      gateRevision=revision;gateSource=state.structures;
    }
    return gates;
  };
  const workerMotionClear=(start,end,radius=.28)=>{
    if(!segmentClear(start,end,radius,null,true))return false;
    // Only the moving gate leaf remains in JS. The native graph owns the rigid
    // frame and plans through its fully open portal.
    for(const gate of activeGates()){
      if(!gate.gate||gate.status==='ruined')continue;
      const frames=gateFrameFootprints(gate,gate.status==='collapsing'?0:gate.gateOpen??0);
      if(frames?.some(p=>sweptFootprintDistance(start,end,p)<radius))return false;
      const opening=gate.gateOpen??0;
      if(opening>0&&opening<1){
        const area=gateSwingPolygon(gate);
        if(area&&sweptFootprintDistance(start,end,area)<radius)return false;
      }
    }
    return true;
  };
  const wallOverlapMotionClear=(start,end,radius,wallIds)=>{
    validate(start,end);
    const options=profile(radius,true,null);
    const distance=Math.hypot(end.x-start.x,end.z-start.z);
    const count=Math.max(1,Math.ceil(distance/1.25));
    let previous=start;
    for(let i=1;i<=count;i++){
      const point={x:start.x+(end.x-start.x)*i/count,
        z:start.z+(end.z-start.z)*i/count};
      if(!session.actorStepClearExceptWalls(previous,point,wallIds,options))return false;
      previous=point;
    }
    return true;
  };
  const workerSurface=(x,z)=>session.field.canyon?
    Math.max(session.field.surface(x,z),session.field.riverLevel):session.field.surface(x,z);
  const actorSurface=(x,z)=>{
    const ground=session.field.surface(x,z),water=session.field.canyon&&session.field.waterInfo(x,z);
    return water?.inside?Math.max(ground,water.level-.10):ground;
  };
  const chunk=(cx,cz)=>{
    if(session.core.selectChunk(cx,cz)<0)
      throw new SpatialChunkUnavailable({x:cx*48,z:cz*48},
        {x:cx*48,z:cz*48},[{cx,cz}]);
    return session.core.chunkPayload();
  };
  const withWallPreview=(walls,suppressed,inspect)=>
    session.withWallPreview(walls,suppressed,()=>inspect({walkable,segmentClear}));
  const terrainValid=(x,z,radius=.28,worker=false)=>{
    for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){
      const px=x+dx,pz=z+dz;
      if(!worker&&session.field.fluidInside(px,pz))return false;
      if(!Number.isFinite(session.field.slope(px,pz))||session.field.slope(px,pz)>.5)
        return false;
    }
    return true;
  };
  let obstacleVersion=-1,obstacleStructures=null,obstacleVillages=null,
    obstacleList=null;
  const view={field:session.field,config,chunk,suppressed:session.suppressed,state,
    get obstacles(){
      // The geometry is unchanged between topology revisions. A stable source
      // identity lets worker service-point and collision indexes reuse their
      // results instead of invalidating on every read of this adapter.
      const version=session.topologySource.revision();
      if(obstacleList===null||obstacleVersion!==version||
        obstacleStructures!==state.structures||obstacleVillages!==state.villages){
        obstacleList=[
          ...state.structures.filter(item=>item.status!=='ruined').map(item=>
            item.kind==='center'?centerFootprint(item,state):{...item,radius:.7}),
          ...state.villages.flatMap(village=>(village.buildings??[])
            .filter(item=>item.kind!=='Zona común').map(item=>({...item,radius:item.radius??2.8})))
        ];
        obstacleVersion=version;obstacleStructures=state.structures;
        obstacleVillages=state.villages;
      }
      return obstacleList;
    },
    get version(){return session.topologySource.revision();},
    walkable,segmentClear,path,regionFor,regionConnected,terrainValid,withWallPreview,
    approachPath:(start,end,radius)=>path(start,end,radius,null,false),
    propsAt,placement,wallPlacement,placementFootprint,
    workerSurface,actorSurface,
    setState,syncCropPlacement,
    workerPath:(start,end,radius=.28,ignore=null)=>path(start,end,radius,ignore,true),
    workerMotionClear,wallOverlapMotionClear,
  };
  // The ordinary exterior witness extends its ray beyond the active box.
  // A resident-only C++ world cannot certify that unloaded destination, so
  // prove a native route to an inset of the already resident camera boundary.
  // This remains conservative: the whole actor must first lie outside the
  // constructed envelope, and an unknown/blocked native route is rejected.
  view.spatialExteriorWitness=(point,radius,wallBox)=>{
    const bounds=view.activeBounds;
    if(!bounds||!(point.x-radius>wallBox[2]||point.x+radius<wallBox[0]||
      point.z-radius>wallBox[3]||point.z+radius<wallBox[1]))return false;
    const inset=radius+2;
    const [x0,z0,x1,z1]=bounds;
    const clamp=(value,lo,hi)=>Math.min(hi,Math.max(lo,value));
    if(x1-x0<=inset*2||z1-z0<=inset*2)return false;
    const x=clamp(point.x,x0+inset,x1-inset),
      z=clamp(point.z,z0+inset,z1-inset);
    const edges=[{x,z:z0+inset},{x:x0+inset,z},
      {x:x1-inset,z},{x,z:z1-inset}];
    edges.sort((a,b)=>Math.hypot(point.x-a.x,point.z-a.z)-
      Math.hypot(point.x-b.x,point.z-b.z));
    const options=profile(radius,false,null);
    for(const edge of edges){
      if(!session.actorCanStand(edge,options))continue;
      if(session.routeActor(point,edge,options).status==='found')return true;
    }
    return false;
  };
  view.setActiveBounds=bounds=>{
    if(!validActiveBounds(bounds))throw new RangeError('Invalid active terrain bounds');
    view.activeBounds=[...bounds];
  };
  view.setRaidView=(eye,target)=>{
    if(![eye?.x,eye?.z,target?.x,target?.z].every(Number.isFinite))return;
    view.raidView={eye:{x:eye.x,z:eye.z},target:{x:target.x,z:target.z}};
  };
  return view;
}
