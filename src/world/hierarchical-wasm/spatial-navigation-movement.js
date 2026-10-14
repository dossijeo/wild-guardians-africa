import {ANIMAL_SPATIAL_PROFILES,WORKER_SPATIAL_PROFILE} from './spatial-movement-profiles.js';
import {gateFrameFootprints,gateSwingPolygon} from '../gate-passages.js';
import {sweptFootprintDistance} from '../footprints.js';
import {createSpatialPlacement} from './spatial-placement.js';

const animalProfiles=Object.entries(ANIMAL_SPATIAL_PROFILES);
const finitePoint=point=>Number.isFinite(point?.x)&&Number.isFinite(point?.z);

export class SpatialChunkUnavailable extends Error {
  constructor(start,end,missing=[]){
    super('Spatial navigation needs more resident chunks');
    this.name='SpatialChunkUnavailable';
    this.start={x:start.x,z:start.z};
    this.end={x:end.x,z:end.z};
    this.missing=missing;
  }
}

// Movement-facing part of the legacy Navigation contract. The native graph is
// the only planner here; unsupported target exclusion is never silently lost.
export function createSpatialNavigationMovement(session,state){
  if(!session?.routeActor||!session?.actorCanStand||!session?.actorStepClear)
    throw TypeError('Expected a spatial game session');
  if(!Array.isArray(state?.structures))throw TypeError('Expected live game structures');
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
      throw new SpatialChunkUnavailable(start,end);
    }
    return result.status==='found'?result.points:null;
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
  const workerSurface=(x,z)=>session.field.canyon?
    Math.max(session.field.surface(x,z),session.field.riverLevel):session.field.surface(x,z);
  const actorSurface=(x,z)=>{
    const ground=session.field.surface(x,z),water=session.field.canyon&&session.field.waterInfo(x,z);
    return water?.inside?Math.max(ground,water.level-.10):ground;
  };
  return {field:session.field,suppressed:session.suppressed,state,
    get version(){return session.topologySource.revision();},
    walkable,segmentClear,path,propsAt,placement,wallPlacement,placementFootprint,
    workerSurface,actorSurface,
    setState,syncCropPlacement,
    workerPath:(start,end,radius=.28,ignore=null)=>path(start,end,radius,ignore,true),
    workerMotionClear,
  };
}
