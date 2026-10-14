import {ANIMAL_SPATIAL_PROFILES,WORKER_SPATIAL_PROFILE} from './spatial-movement-profiles.js';
import {gateFrameFootprints,gateSwingPolygon} from '../gate-passages.js';
import {sweptFootprintDistance} from '../footprints.js';

const animalProfiles=Object.entries(ANIMAL_SPATIAL_PROFILES);
const finitePoint=point=>Number.isFinite(point?.x)&&Number.isFinite(point?.z);

export class SpatialChunkUnavailable extends Error {
  constructor(start,end){
    super('Spatial navigation needs more resident chunks');
    this.name='SpatialChunkUnavailable';
    this.start={x:start.x,z:start.z};
    this.end={x:end.x,z:end.z};
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
    const result=session.routeActor(start,end,profile(radius,worker,ignore));
    if(result.status==='unknown')throw new SpatialChunkUnavailable(start,end);
    return result.status==='found'?result.points:null;
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
  return {field:session.field,suppressed:session.suppressed,
    get version(){return session.topologySource.revision();},
    walkable,segmentClear,path,
    workerPath:(start,end,radius=.28,ignore=null)=>path(start,end,radius,ignore,true),
    workerMotionClear,
  };
}
