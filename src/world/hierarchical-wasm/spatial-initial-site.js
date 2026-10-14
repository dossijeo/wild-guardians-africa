import {centerFootprint,centerServicePoint} from '../centers.js';
import {villageLayout} from '../villages.js';
import {footprintsOverlap} from '../footprints.js';
import {createSpatialGameSession} from './spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from './spatial-navigation-movement.js';
import {createSpatialPlacement} from './spatial-placement.js';

const chunkCoordinate=value=>Math.floor((value+24)/48);
const chunkJobs=(points,margin=20)=>{
  const xs=points.map(point=>point.x),zs=points.map(point=>point.z),jobs=new Map();
  for(let cz=chunkCoordinate(Math.min(...zs)-margin);cz<=chunkCoordinate(Math.max(...zs)+margin);cz++)
    for(let cx=chunkCoordinate(Math.min(...xs)-margin);cx<=chunkCoordinate(Math.max(...xs)+margin);cx++)
      jobs.set(`${cx},${cz}`,{cx,cz,score:Math.hypot(cx,cz)});
  return jobs;
};

// Sabana integration probe. All terrain, prop and movement decisions below
// come from one C++ world; the game-state clone is only a proposed layout.
export async function probeSpatialSavannaStart(module,state,payload,{x=60,z=0}={}){
  if(state?.biome!=='sabana'||!state.villages?.length||state.structures?.length||
    !Array.isArray(payload?.units)||![x,z].every(Number.isFinite))
    throw TypeError('Expected a new Sabana game and an authored village');
  const trial=structuredClone(state),village=trial.villages[0];
  Object.assign(village,{x,z,buildings:villageLayout(payload,x,z)});
  const center={id:'spatial-start-center',kind:'center',x:x+23,z,
    culture:village.culture,villageId:village.id,status:'intact',hp:600,maxHp:600};
  trial.structures.push(center);
  const shape=centerFootprint(center,trial),loaded=new Map();
  const session=createSpatialGameSession(module,trial,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const extent=[...village.buildings.flatMap(building=>building.footprint??[building]),
      ...shape.footprint,{x:center.x+16,z:center.z+10},
      {x:center.x+4,z:center.z-10}];
    session.stream.plan(chunkJobs(extent));
    await session.stream.whenIdle();
    const nativeProps=(px,pz,radius)=>{
      const result=session.queryPropsAt(px,pz,radius);
      if(result.status==='unknown')throw new SpatialChunkUnavailable(
        {x:px,z:pz},{x:px,z:pz},result.missing);
      return result.props;
    };
    // Evaluate the proposed buildings against ground and props without treating
    // those same proposed buildings as pre-existing placement obstructions.
    const proposal=createSpatialPlacement(session,{structures:[],villages:[]},nativeProps);
    const checks=village.buildings.map(building=>proposal.placementFootprint(building));
    const centerCheck=proposal.placementFootprint(shape);
    if(checks.some(check=>!check.valid)||!centerCheck.valid||
      village.buildings.some(building=>building.kind!=='Zona común'&&
        building.footprint&&footprintsOverlap(shape.footprint,building.footprint)))
      return {valid:false,reason:'building-placement',checks,centerCheck};
    const nav=createSpatialNavigationMovement(session,trial);
    const departure=centerServicePoint(center,trial,.8);
    let entry=null;
    for(let radius=0;radius<=20&&!entry;radius+=2)
      for(let angle=0,count=radius?16:1;angle<count&&!entry;angle++){
        const point={x:x+Math.cos(angle/count*Math.PI*2)*radius,
          z:z+Math.sin(angle/count*Math.PI*2)*radius};
        if(nav.walkable(point.x,point.z,.28,null,true)&&
          nav.path(point,departure,.28,null,true))entry=point;
      }
    if(!entry)return {valid:false,reason:'village-entry'};
    const farm=[];
    for(let dz=-9;dz<=9&&farm.length<12;dz+=1.5)
      for(let dx=4.5;dx<=15&&farm.length<12;dx+=1.5){
        const point={x:Math.round((center.x+dx)/1.5)*1.5,
          z:Math.round((center.z+dz)/1.5)*1.5};
        if(nav.placement(point.x,point.z,.4).valid&&
          nav.path(departure,point,.28,null,true)&&
          nav.path(point,departure,.28,null,true))farm.push(point);
      }
    if(farm.length<12)return {valid:false,reason:'farm-access',entry,farm};
    return {valid:true,site:{x,z,buildings:village.buildings,
      center:{kind:'center',x:center.x,z:center.z,culture:center.culture},entry,
      suppress:[...new Set([...checks,centerCheck].flatMap(check=>check.suppress??[]))]},
    farm,loadedChunks:session.core.metrics().loadedChunks};
  }finally{session.dispose();}
}
