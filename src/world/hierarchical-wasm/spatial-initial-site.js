import {centerFootprint,centerServicePoint} from '../centers.js';
import {villageLayout} from '../villages.js';
import {footprintsOverlap} from '../footprints.js';
import {createSpatialGameSession} from './spatial-game-session.js';
import {createSpatialWorld} from './spatial-world.js';
import {createSpatialTerrainView} from './spatial-terrain-view.js';
import {spatialCanyonLayout} from './spatial-canyon-layout.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from './spatial-navigation-movement.js';
import {createSpatialPlacement} from './spatial-placement.js';
import {canyonLandAccess} from '../canyon-land-access.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';

const chunkCoordinate=value=>Math.floor((value+24)/48);
const chunkJobs=(points,margin=20)=>{
  const xs=points.map(point=>point.x),zs=points.map(point=>point.z),jobs=new Map();
  for(let cz=chunkCoordinate(Math.min(...zs)-margin);cz<=chunkCoordinate(Math.max(...zs)+margin);cz++)
    for(let cx=chunkCoordinate(Math.min(...xs)-margin);cx<=chunkCoordinate(Math.max(...xs)+margin);cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  return jobs;
};

const ordinaryBiomes=new Set(['sabana','gran-rio','manglares','volcanes','desierto']);

// Integration probe. All terrain, prop and movement decisions below
// come from one C++ world; the game-state clone is only a proposed layout.
// Start with the chunks touched by the proposal; request additional neighbors
// only if a native route or prop query proves they are needed.
export async function probeSpatialStart(module,state,payload,
  {x=60,z=0,chunkMargin=0,measure=false}={}){
  if(!(ordinaryBiomes.has(state?.biome)||state?.biome==='gran-canon')||
    !state.villages?.length||state.structures?.length||
    !Array.isArray(payload?.units)||![x,z,chunkMargin].every(Number.isFinite)||
    chunkMargin<0)
    throw TypeError('Expected a new supported game and an authored village');
  const started=measure?performance.now():0;
  const trial=structuredClone(state),village=trial.villages[0];
  let core=null,layout=null;
  if(state.biome==='gran-canon'){
    core=createSpatialWorld(module);
    core.generate(state.seed,chunkCoordinate(x),chunkCoordinate(z),state.biome);
    layout=spatialCanyonLayout(payload,createSpatialTerrainView(core),z);
    x=layout.x;
  }
  Object.assign(village,{x,z,buildings:layout?.buildings??villageLayout(payload,x,z)});
  const center={id:'spatial-start-center',kind:'center',x:layout?.center.x??x+23,
    z:layout?.center.z??z,
    culture:village.culture,villageId:village.id,status:'intact',hp:600,maxHp:600};
  trial.structures.push(center);
  const shape=centerFootprint(center,trial),loaded=new Map();
  const session=createSpatialGameSession(module,trial,{
    core,loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const setupMs=measure?performance.now()-started:0;
  let streamMs=0,evaluateMs=0;
  const finish=result=>measure?{...result,timings:{setupMs,streamMs,evaluateMs,
    totalMs:performance.now()-started}}:result;
  try{
    let chunkExpansions=0;
    const extent=[...village.buildings.flatMap(building=>building.footprint??[building]),
      ...shape.footprint,{x:center.x+16,z:center.z+10},
      {x:center.x+4,z:center.z-10}];
    session.stream.plan(chunkJobs(extent,chunkMargin));
    const firstStreamAt=measure?performance.now():0;
    await session.stream.whenIdle();
    if(measure)streamMs+=performance.now()-firstStreamAt;
    const nativeProps=(px,pz,radius)=>{
      const result=session.queryPropsAt(px,pz,radius);
      if(result.status==='unknown')throw new SpatialChunkUnavailable(
        {x:px,z:pz},{x:px,z:pz},result.missing);
      return result.props;
    };
    const evaluate=()=>{
      // The proposed buildings are not yet pre-existing placement obstacles.
      const proposal=createSpatialPlacement(session,{structures:[],villages:[]},nativeProps);
      const checks=village.buildings.map(building=>proposal.placementFootprint(building));
      const centerCheck=proposal.placementFootprint(shape);
      if(checks.some(check=>!check.valid)||!centerCheck.valid||
        village.buildings.some(building=>building.kind!=='Zona común'&&
          building.footprint&&footprintsOverlap(shape.footprint,building.footprint)))
        return {valid:false,reason:'building-placement',checks,centerCheck};
      const nav=createSpatialNavigationMovement(session,trial);
      const departure=centerServicePoint(center,trial,.8);
      let unresolved=null;
      const reaches=(start,end)=>{
        if(nav.segmentClear(start,end,.28,null,true))return true;
        try{return Boolean(nav.path(start,end,.28,null,true));}
        catch(error){
          if(!(error instanceof SpatialChunkUnavailable))throw error;
          unresolved??=error;
          return false;
        }
      };
      let entry=null;
      for(let radius=0;radius<=20&&!entry;radius+=2)
        for(let angle=0,count=radius?16:1;angle<count&&!entry;angle++){
          const point={x:x+Math.cos(angle/count*Math.PI*2)*radius,
            z:z+Math.sin(angle/count*Math.PI*2)*radius};
          if(nav.walkable(point.x,point.z,.28,null,true)&&
            reaches(point,departure))entry=point;
        }
      if(!entry){if(unresolved)throw unresolved;return {valid:false,reason:'village-entry'};}
      const farm=[];
      for(let dz=-9;dz<=9&&farm.length<12;dz+=1.5)
        for(let dx=4.5;dx<=15&&farm.length<12;dx+=1.5){
          const point={x:Math.round((center.x+dx)/1.5)*1.5,
            z:Math.round((center.z+dz)/1.5)*1.5};
          if(nav.placement(point.x,point.z,.4).valid&&
            reaches(departure,point)&&reaches(point,departure))farm.push(point);
        }
      if(farm.length<12){if(unresolved)throw unresolved;return {valid:false,reason:'farm-access',entry,farm};}
      let landAccess=null;
      if(state.biome==='gran-canon'){
        landAccess=canyonLandAccess(nav,farm,
          {radius:ANIMAL_SPATIAL_PROFILES.warthog.radius});
        if(!landAccess){if(unresolved)throw unresolved;
          return {valid:false,reason:'no-hostile-land-access',entry,farm};}
      }
      return {valid:true,site:{x,z,buildings:village.buildings,
        center:{kind:'center',x:center.x,z:center.z,culture:center.culture},entry,
        suppress:[...new Set([...checks,centerCheck].flatMap(check=>check.suppress??[]))]},
      farm,landAccess,loadedChunks:session.core.metrics().loadedChunks,
      chunkExpansions};
    };
    for(let attempt=0;attempt<4;attempt++){
      const evaluationAt=measure?performance.now():0;
      let result,error,failed=false;
      try{result=evaluate();}catch(caught){error=caught;failed=true;}
      if(measure)evaluateMs+=performance.now()-evaluationAt;
      if(!failed)return finish(result);
      if(!(error instanceof SpatialChunkUnavailable))throw error;
      const needed=error.missing.length?error.missing:
        [...chunkJobs([error.start,error.end],48).values()];
      const desired=new Map(session.stream.desired);
      for(const point of needed)desired.set(`${point.cx},${point.cz}`,
        {cx:point.cx,cz:point.cz,score:0});
      if(desired.size===session.stream.desired.size)
        return finish({valid:false,reason:'unresolved-native-route',
          start:error.start,end:error.end,chunkExpansions});
      session.stream.plan(desired);
      const expansionAt=measure?performance.now():0;
      await session.stream.whenIdle();
      if(measure)streamMs+=performance.now()-expansionAt;
      chunkExpansions++;
    }
    throw Error('Spatial starting site exceeded bounded chunk-demand retries');
  }finally{session.dispose();}
}

// Preserve the existing deterministic expanding-ring search, but evaluate
// every candidate against the C++ world instead of a second JS terrain recipe.
export async function findSpatialStart(module,state,payload,{signal}={}){
  let attempts=0;
  for(let ring=0;ring<70;ring++){
    const count=ring?Math.max(24,Math.ceil(2*Math.PI*ring)):1;
    for(let angle=0;angle<count;angle++){
      if(signal?.aborted)throw new DOMException('Initial location cancelled','AbortError');
      const canyon=state.biome==='gran-canon';
      const x=canyon?0:60+Math.cos(angle/count*Math.PI*2)*ring*12;
      const z=canyon?ring*24+angle*12-30:Math.sin(angle/count*Math.PI*2)*ring*12;
      const result=await probeSpatialStart(module,state,payload,{x,z});
      attempts++;
      if(result.valid)return {...result,attempts};
    }
  }
  throw Error('No native starting site was found');
}
