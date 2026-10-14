import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';

const input=process.argv[2];
if(!input)throw Error('Pass a captured stall .json.gz file');
const capture=JSON.parse(gunzipSync(readFileSync(input)).toString());
const state=deserialize(capture.snapshot),loaded=new Map();
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const session=createSpatialGameSession(wasm,state,{loaded:()=>loaded,
  onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  for(const key of capture.loadedChunks){
    const [cx,cz]=key.split(',').map(Number);
    if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
      throw Error(`Could not restore chunk ${key}`);
    loaded.set(key,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds(capture.activeBounds);
  nav.setRaidView(capture.raidView.eye,capture.raidView.target);
  const rows=[];
  for(const actor of state.raid.animals.filter(item=>item.status!=='gone')){
    const next=actor.path?.[0],distance=next?
      Math.hypot(next.x-actor.x,next.z-actor.z):0,
      probe=next&&distance>1e-8?{
        x:actor.x+(next.x-actor.x)*Math.min(.5,distance)/distance,
        z:actor.z+(next.z-actor.z)*Math.min(.5,distance)/distance}:null,
      blockers=actorBlockers(state,actor,false),
      target=state.plants.find(item=>item.id===actor.targetId)??
        state.structures.find(item=>item.id===actor.targetId);
    const destination=actor.status==='retreating'?actor.exit:actor.approach;
    const following=actor.path?.[1];
    let freshPath=null,freshPathStatus='none';
    if(destination)try{
      freshPath=nav.path(actor,destination,actor.radius,null,false);
      freshPathStatus=freshPath?'found':'blocked';
    }catch(error){freshPathStatus=error?.name??'error';}
    const nextWalkable=next?nav.walkable(next.x,next.z,actor.radius,null,false):null;
    const beforeChunk=session.core.currentChunk(),beforeResident=session.core.wasm.spatial_chunk_count();
    const beforeLocal=next?!!session.core.wasm.spatial_local_clear(next.x,next.z,next.x,next.z):null;
    const beforeTerrain=next?nav.terrainValid(next.x,next.z,actor.radius,false):null;
    const beforeSurface=next?session.field.surface(next.x,next.z):null;
    const beforeSlope=next?session.field.slope(next.x,next.z):null;
    const beforeFluid=next?session.field.fluidInside(next.x,next.z):null;
    const terrainProbes=()=>next?[[0,0],[actor.radius,0],[-actor.radius,0],
      [0,actor.radius],[0,-actor.radius]].map(([dx,dz])=>({dx,dz,
      surface:session.field.surface(next.x+dx,next.z+dz),
      slope:session.field.slope(next.x+dx,next.z+dz),
      fluid:session.field.fluidInside(next.x+dx,next.z+dz)})):null;
    const beforeProbes=terrainProbes();
    const gridNextPass=next&&Number.isInteger(next.x)&&Number.isInteger(next.z)?
      !!session.core.wasm.spatial_walkable(next.x,next.z):null;
    const gridNextPropBlocked=next?!!session.core.wasm.spatial_prop_blocked(next.x,next.z):null;
    let selectedChunkPropBlocked=null,selectedChunkWalkable=null,selectedTerrain=null,
      selectedSurface=null,selectedSlope=null,selectedFluid=null,selectedProbes=null;
    if(next){
      const cx=Math.floor((next.x+24)/48),cz=Math.floor((next.z+24)/48);
      if(session.core.selectChunk(cx,cz)>=0){
        // Reselect the movement profile after changing the active chunk.
        nav.walkable(next.x,next.z,actor.radius,null,false);
        selectedChunkPropBlocked=!!session.core.wasm.spatial_prop_blocked(next.x,next.z);
        selectedChunkWalkable=!!session.core.wasm.spatial_local_clear(
          next.x,next.z,next.x,next.z);
        selectedTerrain=nav.terrainValid(next.x,next.z,actor.radius,false);
        selectedSurface=session.field.surface(next.x,next.z);
        selectedSlope=session.field.slope(next.x,next.z);
        selectedFluid=session.field.fluidInside(next.x,next.z);
        selectedProbes=terrainProbes();
      }
    }
    rows.push({id:actor.id,species:actor.species,status:actor.status,
      hitsRemaining:actor.hitsRemaining,x:actor.x,z:actor.z,
      targetId:actor.targetId,targetAlive:target?.alive,
      distanceToTarget:target?Math.hypot(target.x-actor.x,target.z-actor.z):null,
      next,distanceToNext:distance,pathLength:actor.path?.length??0,
      pathVersion:actor.pathVersion,navVersion:nav.version,
      standable:nav.walkable(actor.x,actor.z,actor.radius,null,false),
      staticNext:next?nav.segmentClear(actor,next,actor.radius,null,false):null,
      staticFollowing:next&&following?nav.segmentClear(next,following,actor.radius,null,false):null,
      staticProbe:probe?nav.segmentClear(actor,probe,actor.radius,null,false):null,
      nextWalkable,gridNextPass,gridNextPropBlocked,
      selectedChunkPropBlocked,selectedChunkWalkable,selectedTerrain,
      selectedSurface,selectedSlope,selectedFluid,
      beforeProbes,selectedProbes,
      beforeChunk,beforeResident,beforeLocal,beforeTerrain,beforeSurface,beforeSlope,beforeFluid,
      mobileProbe:probe?actorSegmentClear(actor,probe,actor,blockers):null,
      blockerCount:blockers.length,
      destination,freshPathStatus,freshPathLength:freshPath?.length??0,
      freshPathFirst:freshPath?.[0],
      dynamicStallSeconds:actor.dynamicStallSeconds,
      mobileProgressAge:state.elapsed-(actor.mobileProgressAt??state.elapsed),
      mobileRecoveryAttempts:actor.mobileRecoveryAttempts});
  }
  process.stdout.write(JSON.stringify({input,loadedChunks:loaded.size,
    elapsed:state.elapsed,rows},null,2)+'\n');
}finally{session.dispose();}
