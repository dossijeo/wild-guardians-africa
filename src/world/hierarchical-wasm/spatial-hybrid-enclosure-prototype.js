import * as Game from '../../simulation/game.js';
import {AGRICULTURAL_PROFILE_LIMITS} from
  '../../simulation/raid-agricultural-impact.js';
import {ANIMAL_SPATIAL_PROFILES} from './spatial-movement-profiles.js';
import {approximateCutModules,cropClearanceHull,identifyNaturalCorridor,
  inspectSelfClosedQuote,wallOccludesBoundaryFace} from
  './spatial-topological-enclosure-prototype.js';

const SPECIES=['warthog','hyena','buffalo','lion','rhino'];
const MAX_ATTACK_REACH=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
  .map(profile=>profile.radius))+.65+AGRICULTURAL_PROFILE_LIMITS.attackRadius;

// An exterior hit ray must cross the cut boundary. A face fully covered by a
// real wall footprint already blocks that ray; other faces require enough
// clearance for both central contact and peripheral agricultural damage.
function attackMarginAcrossOpenFaces(crops,boundary,walls,wasm){
  let best=Infinity;
  for(let i=0;i<boundary.length;i+=4){
    const [ox,oz,ix,iz]=boundary.slice(i,i+4);
    const kind=wasm.lazy_cut_face_natural(ox,oz,ix,iz);
    if(kind<0)return NaN;
    const mx=(ox+ix)/2,mz=(oz+iz)/2;
    const a=ox!==ix?{x:mx,z:mz-.5}:{x:mx-.5,z:mz};
    const b=ox!==ix?{x:mx,z:mz+.5}:{x:mx+.5,z:mz};
    if(wallOccludesBoundaryFace(a,b,walls))continue;
    for(const crop of crops){
      const dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((crop.x-a.x)*dx+
        (crop.z-a.z)*dz)/(dx*dx+dz*dz)));
      best=Math.min(best,Math.hypot(crop.x-a.x-t*dx,crop.z-a.z-t*dz));
    }
  }
  return best-MAX_ATTACK_REACH;
}

// Opt-in enclosure planner. All spatial decisions use the native cut
// and native continuous face proof; the game quote remains the authority for
// legal modules, doors and exact price. Nothing is purchased or reserved.
export function proposeHybridEnclosure({state,nav,session,crops,material='zarzas',
  workerOrigins=state.villages.map(v=>v.entry??v),margin=12,
  padding=Math.ceil(MAX_ATTACK_REACH)+2}){
  if(!Array.isArray(crops)||!crops.length||crops.length>256||
    crops.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.z))||
    !Array.isArray(workerOrigins)||!workerOrigins.length)
    throw TypeError('Expected crops and worker origins');
  const wasm=session.core.wasm;
  if(typeof wasm.lazy_local_crop_cut_conservative_buildable!=='function'||
     typeof wasm.lazy_cut_attack_margin!=='function')
    return {status:'unknown',reason:'native-prototype-unavailable'};
  const bounds={minX:Math.min(...crops.map(p=>p.x)),
    minZ:Math.min(...crops.map(p=>p.z)),
    maxX:Math.max(...crops.map(p=>p.x)),
    maxZ:Math.max(...crops.map(p=>p.z))};
  const box=[Math.floor(bounds.minX-margin),Math.floor(bounds.minZ-margin),
    Math.ceil(bounds.maxX+margin)+1,Math.ceil(bounds.maxZ+margin)+1];
  // The native local cut has a hard 4096-cell budget. A larger farm is
  // unknown, not silently reduced to a subset of crops.
  if((box[2]-box[0])*(box[3]-box[1])>4096)
    return {status:'unknown',reason:'local-window-too-large',box};
  for(const species of SPECIES)
    session.actorRegionsBatch([crops[0]],{worker:false,species});
  const seedPtr=wasm.lazy_cut_seeds_ptr(crops.length);
  new Int32Array(wasm.memory.buffer,seedPtr,crops.length*2).set(crops.flatMap(p=>
    [Math.round(p.x),Math.round(p.z)]));
  const count=wasm.lazy_local_crop_cut_conservative_buildable(
    ...box,crops.length,padding);
  if(count<0)return {status:'unknown',reason:count===-1?
    'missing-sector-or-unbuildable-cut':'invalid-local-cut',box};
  const edges=Array.from(new Int32Array(wasm.memory.buffer,
    wasm.lazy_local_crop_cut_ptr(),count*4));
  const boundaryCount=wasm.lazy_local_crop_cut_boundary_count();
  const boundary=Array.from(new Int32Array(wasm.memory.buffer,
    wasm.lazy_local_crop_cut_boundary_ptr(),boundaryCount*4));
  const natural=[];
  for(let i=0;i<boundary.length;i+=4){
    const edge=boundary.slice(i,i+4);
    natural.push({edge,kind:wasm.lazy_cut_face_natural(...edge)});
  }
  const ptr=wasm.lazy_cut_attack_points_ptr(crops.length);
  new Float32Array(wasm.memory.buffer,ptr,crops.length*2).set(crops.flatMap(p=>
    [p.x,p.z]));
  const attackMargin=wasm.lazy_cut_attack_margin(crops.length,MAX_ATTACK_REACH);
  const cut=approximateCutModules(edges,state.structures,material,
    0); // Exact price comes only from the ordinary quote.
  const corridor=identifyNaturalCorridor(cut.strokes,natural);
  const attempts=[];
  const routeWitness=()=>workerOrigins.map(origin=>crops.map(crop=>{
    try{return !!nav.path(origin,crop,.28,null,true)&&
      !!nav.path(crop,origin,.28,null,true);}
    catch(error){if(error.name==='SpatialChunkUnavailable')return null;
      throw error;}
  }));
  const before=routeWitness();
  if(count===0){
    const faceCounts={solid:0,wetland:0,river:0,cliff:0,unknown:0};
    for(const face of natural){
      if(face.kind===1)faceCounts.solid++;
      else if(face.kind===2)faceCounts.wetland++;
      else if(face.kind===3)faceCounts.river++;
      else if(face.kind===4)faceCounts.cliff++;
      else faceCounts.unknown++;
    }
    const workerSafe=crops.every((_,index)=>before.some(row=>
      row[index]===true));
    if(boundaryCount>0&&!faceCounts.unknown&&attackMargin>0&&workerSafe)
      return {status:'protected',chosen:{kind:'existing-closure',
        cost:0,modules:0,gates:0,movementFaces:faceCounts,attackMargin},
      attempts:[],box};
    return {status:'unknown',reason:!boundaryCount?'empty-boundary':
      faceCounts.unknown?'movement-unproved':
        !(attackMargin>0)?'attack-reach-unproved':'worker-access-unproved',
    attempts:[{kind:'existing-closure',status:'unknown',
      movementFaces:faceCounts,attackMargin,workerSafe}],box};
  }
  const candidates=[];
  if(count>0&&!cut.ambiguous.length)
    candidates.push({kind:corridor?.kind??'general-cut',
      strokes:cut.strokes,boundary});
  candidates.push({kind:'artificial-hull',
    strokes:[cropClearanceHull(crops,Math.max(2.5,
      MAX_ATTACK_REACH+.25))],boundary:null});
  for(const candidate of candidates){
    let quote;
    try{quote=Game.quoteWallChain(state,material,candidate.strokes,nav,
      {smooth:false,snap:false});}
    catch(error){
      if(error.name==='SpatialChunkUnavailable'){
        attempts.push({kind:candidate.kind,status:'unknown',
          reason:'missing-sector'});continue;
      }
      throw error;
    }
    const result={kind:candidate.kind,modules:quote.pieces.length,
      cost:quote.cost,gates:quote.gates};
    if(quote.blockedPieces.length||quote.blockedCrops.length||
      quote.expectedSlots.length!==quote.pieces.length){
      attempts.push({...result,status:'open',reason:'omitted-module',
        gaps:[...quote.blockedPieces.map(piece=>({x:piece.x,z:piece.z,
          reason:nav.wallPlacement(piece).reason??'physical-obstacle'})),
        ...quote.blockedCrops.map(piece=>({x:piece.x,z:piece.z,
          reason:'crop-overlap'}))],expectedSlots:quote.expectedSlots.length});
      continue;
    }
    let proof;
    try{proof=nav.withWallPreview(quote.previewPieces,quote.suppressed,()=>{
      const faceCounts={solid:0,wetland:0,river:0,cliff:0,unknown:0};
      if(candidate.boundary)for(let i=0;i<candidate.boundary.length;i+=4){
        const code=wasm.lazy_cut_face_natural(
          ...candidate.boundary.slice(i,i+4));
        if(code===1)faceCounts.solid++;
        else if(code===2)faceCounts.wetland++;
        else if(code===3)faceCounts.river++;
        else if(code===4)faceCounts.cliff++;
        else faceCounts.unknown++;
      }
      const wallLoop=candidate.boundary?null:
        inspectSelfClosedQuote(quote,state.structures,crops);
      const exposedAttackMargin=candidate.boundary?
        attackMarginAcrossOpenFaces(crops,candidate.boundary,
          [...state.structures,...quote.previewPieces],wasm):NaN;
      return {movement:candidate.boundary?
        faceCounts.unknown===0&&candidate.boundary.length>0:
        wallLoop.status==='closed-wall-loop',
      wallLoop,faceCounts,exposedAttackMargin,workers:routeWitness()};
    },true);}
    catch(error){
      if(error.name==='SpatialChunkUnavailable'){
        attempts.push({...result,status:'unknown',
          reason:'missing-sector-during-preview'});continue;
      }
      throw error;
    }
    const workerSafe=crops.every((_,j)=>
      before.some((row,i)=>row[j]===true&&proof.workers[i][j]===true))&&
      before.every((row,i)=>row.every((value,j)=>
        value!==true||proof.workers[i][j]===true));
    const attackSafe=candidate.boundary?
      proof.exposedAttackMargin>0:
      proof.wallLoop?.attackOccluded===true;
    const status=proof.movement&&workerSafe&&attackSafe?
      'protected':'unknown';
    const reason=!proof.movement?'movement-unproved':
      !workerSafe?'worker-access-unproved':
        !attackSafe?'attack-reach-unproved':null;
    attempts.push({...result,status,reason,
      movementFaces:proof.faceCounts,attackMargin,
      exposedAttackMargin:proof.exposedAttackMargin,
      workerRoutesBefore:before,workerRoutesAfter:proof.workers});
    if(status==='protected')return {status,
      chosen:{...attempts.at(-1),strokes:candidate.strokes,
        preparedPlan:quote},attempts,box};
  }
  return {status:'unknown',reason:'no-certified-proposal',attempts,box};
}
