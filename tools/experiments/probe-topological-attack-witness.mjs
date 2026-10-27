// A positive witness disproves an attack certificate. Absence of sampled
// witnesses is diagnostic only; it must never certify an enclosure.
import {readFileSync} from 'node:fs';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from
  '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from
  '../../src/world/wild-engine/spatial-intent-bridge.js';
import {ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/wild-engine/spatial-movement-profiles.js';
import {approximateCutModules} from
  '../../src/world/wild-engine/spatial-topological-enclosure-prototype.js';
import {agriculturalRayClear} from
  '../../src/simulation/raid-agricultural-impact.js';
import {quoteWallChain} from '../../src/simulation/game.js';
import {createCropEnclosurePlanner} from
  '../../src/world/wild-engine/spatial-crop-enclosure-plan.js';

const path=process.argv[2];
if(!path)throw Error('Pass a frozen state JSON path');
const padding=Number(process.argv[3]??2);
const state=deserialize(readFileSync(path,'utf8'));
// The frozen midnight checkpoint may still display the hiring pause. This
// read-only QA quote represents the first resumed daylight decision.
state.pauses=[];
const binary=readFileSync(process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm');
const module=new WebAssembly.Module(binary),loaded=new Map();
const session=createSpatialGameSession(module,state,{loaded:()=>loaded,
  onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const village=state.villages[0],cx=Math.floor((village.x+24)/48),
    cz=Math.floor((village.z+24)/48),jobs=new Map();
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
    const x=cx+dx,z=cz+dz;
    jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.hypot(dx,dz)});
  }
  session.stream.plan(jobs);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
  const group=bridge.getUnprotectedCropGroups()[0];
  if(!group)throw Error('No exposed crop group');
  const b=group.bounds,ids=new Set(group.cropIds);
  const crops=state.plants.filter(plant=>plant.alive&&
    (ids.has(plant.id)||plant.x>=b.minX-12&&plant.x<=b.maxX+12&&
      plant.z>=b.minZ-12&&plant.z<=b.maxZ+12));
  for(const species of Object.keys(ANIMAL_SPATIAL_PROFILES))
    session.actorRegionsBatch([crops[0]],{worker:false,species});
  const wasm=session.core.wasm,box=[Math.floor(Math.min(...crops.map(p=>p.x))-12),
    Math.floor(Math.min(...crops.map(p=>p.z))-12),
    Math.ceil(Math.max(...crops.map(p=>p.x))+12)+1,
    Math.ceil(Math.max(...crops.map(p=>p.z))+12)+1];
  new Int32Array(wasm.memory.buffer,wasm.lazy_cut_seeds_ptr(crops.length),
    crops.length*2).set(crops.flatMap(p=>[Math.round(p.x),Math.round(p.z)]));
  const count=wasm.lazy_local_crop_cut_conservative_buildable(
    ...box,crops.length,padding);
  if(count<=0){
    const faceCount=wasm.lazy_local_crop_cut_boundary_count();
    const boundary=Array.from(new Int32Array(wasm.memory.buffer,
      wasm.lazy_local_crop_cut_boundary_ptr(),faceCount*4));
    const faces={};
    for(let i=0;i<boundary.length;i+=4){
      const kind=wasm.lazy_cut_face_natural(...boundary.slice(i,i+4));
      faces[kind]=(faces[kind]??0)+1;
    }
    const ptr=wasm.lazy_cut_attack_points_ptr(crops.length);
    new Float32Array(wasm.memory.buffer,ptr,crops.length*2).set(crops.flatMap(p=>
      [p.x,p.z]));
    const reach=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
      .map(profile=>profile.radius))+.65+3.640001;
    console.log(JSON.stringify({count,groupId:group.id,
      nativeProtection:group.protection,crops:crops.length,
      faces,attackMargin:wasm.lazy_cut_attack_margin(crops.length,reach),
      plan:(()=>{const plan=createCropEnclosurePlanner(state,nav,bridge,session)
        .planCropEnclosure(group.id,{method:'topological'});
        return {status:plan.status,kind:plan.kind,reason:plan.reason};})()},null,2));
    process.exit(0);
  }
  const edges=Array.from(new Int32Array(wasm.memory.buffer,
    wasm.lazy_local_crop_cut_ptr(),count*4));
  const boundaryCount=wasm.lazy_local_crop_cut_boundary_count();
  const boundary=Array.from(new Int32Array(wasm.memory.buffer,
    wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4));
  const shape=approximateCutModules(edges,state.structures,'zarzas',0);
  const quote=quoteWallChain(state,'zarzas',shape.strokes,nav,
    {smooth:false,snap:false});
  const candidates=[],nearest=[];
  nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>{
    for(let i=0;i<boundary.length;i+=4){
      const edge=boundary.slice(i,i+4),[ox,oz,ix,iz]=edge;
      const mx=(ox+ix)/2,mz=(oz+iz)/2;
      const a=ox!==ix?{x:mx,z:mz-.5}:{x:mx-.5,z:mz};
      const b=ox!==ix?{x:mx,z:mz+.5}:{x:mx+.5,z:mz};
      for(const crop of crops){
        const dx=b.x-a.x,dz=b.z-a.z;
        const t=Math.max(0,Math.min(1,((crop.x-a.x)*dx+
          (crop.z-a.z)*dz)/(dx*dx+dz*dz)));
        nearest.push({cropId:crop.id,edge,
          kind:wasm.lazy_cut_face_natural(...edge),
          distance:Math.hypot(crop.x-a.x-t*dx,crop.z-a.z-t*dz)});
      }
    }
    for(const species of Object.keys(ANIMAL_SPATIAL_PROFILES)){
      const radius=ANIMAL_SPATIAL_PROFILES[species].radius;
      session.actorRegionsBatch([crops[0]],{worker:false,species});
      for(let i=0;i<edges.length;i+=4){
        const x=edges[i],z=edges[i+1];
        for(const dx of [-.5,-.25,0,.25,.5])
          for(const dz of [-.5,-.25,0,.25,.5]){
            const point={x:x+dx,z:z+dz};
            if(!nav.walkable(point.x,point.z,radius,null,false))continue;
            for(const crop of crops){
              const distance=Math.hypot(point.x-crop.x,point.z-crop.z);
              if(distance>radius+.65||
                !agriculturalRayClear(state,nav,point,crop,radius))continue;
              candidates.push({species,point,cropId:crop.id,distance,
                edge:edges.slice(i,i+4)});
              return;
            }
          }
      }
    }
  },true);
  console.log(JSON.stringify({padding,groupId:group.id,crops:crops.length,
    cutEdges:count,modules:quote.pieces.length,
    omitted:quote.blockedPieces.length+quote.blockedCrops.length,
    attackWitness:candidates[0]??null,
    nearestFaces:nearest.sort((a,b)=>a.distance-b.distance).slice(0,8)},null,2));
}finally{session.dispose();}
