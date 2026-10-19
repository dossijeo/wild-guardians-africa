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

// Keep the native answer for faces that prevent certification. Code 0 means
// continuous blockage was not proven; it does not prove animal passage.
// A negative code cannot establish whether a barrier exists. Neither may be
// promoted to a closed face. Capture only a few coordinates so
// a failed proposal is diagnosable without retaining its entire boundary.
export function classifyCutBoundaryFaces(boundary,wasm,cachedKinds=null){
  const faceCounts={solid:0,wetland:0,river:0,cliff:0,unknown:0};
  const unprovedFaces={uncertified:0,undetermined:0,other:0,samples:[]};
  for(let i=0;i<boundary.length;i+=4){
    const code=cachedKinds?cachedKinds[i/4]:wasm.lazy_cut_face_natural(
      boundary[i],boundary[i+1],boundary[i+2],boundary[i+3]);
    if(code===1)faceCounts.solid++;
    else if(code===2)faceCounts.wetland++;
    else if(code===3)faceCounts.river++;
    else if(code===4)faceCounts.cliff++;
    else{
      faceCounts.unknown++;
      if(code===0)unprovedFaces.uncertified++;
      else if(code<0)unprovedFaces.undetermined++;
      else unprovedFaces.other++;
      if(unprovedFaces.samples.length<8)
        unprovedFaces.samples.push({edge:boundary.slice(i,i+4),code});
    }
  }
  return {faceCounts,unprovedFaces};
}

// A rejected wall slot may coincide with an existing static barrier. Keep it
// in the physical proof instead of assuming that every omitted module leaves
// a passage. Crops are never barriers; a quote that silently shortened the
// chain (for example to preserve worker access) is not a complete proposal.
export function cutQuoteOmissionReason(quote,{nativeBoundary=false}={}){
  if(quote.blockedCrops.length)return 'crop-overlap';
  if(quote.expectedSlots.length!==quote.pieces.length+
    quote.blockedPieces.length+quote.blockedCrops.length)
    return 'unaccounted-module';
  if(quote.blockedPieces.length&&!nativeBoundary)return 'omitted-module';
  return null;
}

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
    const {faceCounts,unprovedFaces}=classifyCutBoundaryFaces(boundary,wasm,
      natural.map(face=>face.kind));
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
      movementFaces:faceCounts,unprovedFaces,attackMargin,workerSafe}],box};
  }
  const candidates=[];
  if(count>0&&!cut.ambiguous.length)
    candidates.push({kind:corridor?.kind??'general-cut',
      strokes:cut.strokes,boundary});
  candidates.push({kind:'artificial-hull',
    strokes:[cropClearanceHull(crops,Math.max(2.5,
      MAX_ATTACK_REACH+.25))],boundary:null});
  for(let candidateIndex=0;candidateIndex<candidates.length;candidateIndex++){
    const candidate=candidates[candidateIndex];
    let quote;
    try{quote=Game.quoteWallChain(state,material,candidate.strokes,nav,
      {smooth:false,snap:false,requireComplete:true});}
    catch(error){
      if(error.name==='IncompleteWallQuote'){
        attempts.push({kind:candidate.kind,status:'unknown',
          reason:'worker-access-unproved'});continue;
      }
      if(error.name==='SpatialChunkUnavailable'){
        attempts.push({kind:candidate.kind,status:'unknown',
          reason:'missing-sector'});continue;
      }
      throw error;
    }
    // A cut can cross a rock without the rock covering its entire face.
    // Move only that short stroke by a bounded local distance, then ask the
    // native cut again under the final preview. The old boundary cannot
    // certify a translated stroke.
    if(candidate.boundary&&quote.blockedPieces.length===1&&
      !quote.blockedCrops.length&&quote.expectedSlots.length===
      quote.pieces.length+1){
      const blocked=quote.blockedPieces[0];
      const strokeIndex=candidate.strokes.findIndex(stroke=>stroke.some(
        point=>Math.hypot(point[0]-blocked.x,point[1]-blocked.z)<.01));
      if(strokeIndex>=0){
        const offsets=[1,-1,2,-2].map(distance=>({
          kind:`${candidate.kind}-local-detour`,boundary:null,
          recut:true,strokes:candidate.strokes.map((stroke,index)=>
            index===strokeIndex?stroke.map(([x,z])=>[
              x+distance*Math.sin(blocked.yaw),
              z+distance*Math.cos(blocked.yaw)]):stroke)}));
        candidates.splice(candidateIndex+1,0,...offsets);
      }
    }
    const result={kind:candidate.kind,modules:quote.pieces.length,
      cost:quote.cost,gates:quote.gates};
    const omissionReason=cutQuoteOmissionReason(quote,
      {nativeBoundary:!!candidate.boundary});
    if(omissionReason){
      attempts.push({...result,status:'open',reason:omissionReason,
        gaps:[...quote.blockedPieces.map(piece=>({x:piece.x,z:piece.z,
          reason:nav.wallPlacement(piece).reason??'physical-obstacle'})),
        ...quote.blockedCrops.map(piece=>({x:piece.x,z:piece.z,
          reason:'crop-overlap'}))],expectedSlots:quote.expectedSlots.length});
      continue;
    }
    let proof;
    let certifiedBoundary=candidate.boundary;
    if(candidate.recut){
      const width=box[2]-box[0],height=box[3]-box[1];
      const faces=[];
      for(let z=box[1];z<box[3];z++)for(let x=box[0];x<box[2]-1;x++)
        faces.push(x,z,x+1,z);
      for(let z=box[1];z<box[3]-1;z++)for(let x=box[0];x<box[2];x++)
        faces.push(x,z,x,z+1);
      const mask=[];
      for(let i=0;i<faces.length;i+=4096*4){
        const part=session.wallCutSolidFaces(faces.slice(i,i+4096*4),
          quote.previewPieces,quote.suppressed,
          Math.min(...Object.values(ANIMAL_SPATIAL_PROFILES).map(p=>p.radius)));
        if(!part){mask.length=0;break;}
        mask.push(...part);
      }
      if(mask.length===(width-1)*height+width*(height-1)){
        const pointer=wasm.lazy_overlay_cut_mask_ptr(mask.length);
        const seeds=wasm.lazy_cut_seeds_ptr(crops.length);
        if(pointer&&seeds){
          new Uint8Array(wasm.memory.buffer,pointer,mask.length).set(mask.map(Number));
          new Int32Array(wasm.memory.buffer,seeds,crops.length*2).set(
            crops.flatMap(p=>[Math.round(p.x),Math.round(p.z)]));
          const recutCount=wasm.lazy_local_crop_cut_overlay_buildable(
            ...box,crops.length,padding);
          certifiedBoundary=recutCount===0?Array.from(new Int32Array(
            wasm.memory.buffer,wasm.lazy_local_crop_cut_boundary_ptr(),
            wasm.lazy_local_crop_cut_boundary_count()*4)):null;
        }
      }
    }
    {
      const solid=certifiedBoundary?.length?session.wallCutSolidFaces(
        certifiedBoundary,quote.previewPieces,quote.suppressed,
        Math.min(...Object.values(ANIMAL_SPATIAL_PROFILES).map(p=>p.radius))):null;
      const kinds=certifiedBoundary?.length&&solid?.length===
        certifiedBoundary.length/4?solid.map((blocked,i)=>{
          if(blocked)return 1;
          const edge=certifiedBoundary.slice(i*4,i*4+4);
          const naturalKind=candidate.recut?wasm.lazy_cut_face_natural(...edge):
            natural[i]?.kind;
          return [2,3,4].includes(naturalKind)?naturalKind:0;
        }):null;
      const {faceCounts,unprovedFaces}=classifyCutBoundaryFaces(
        certifiedBoundary??[],wasm,kinds??[]);
      const wallLoop=certifiedBoundary||candidate.recut?null:
        inspectSelfClosedQuote(quote,state.structures,crops);
      const replaced=quote.previewPieces.filter(piece=>state.structures.some(
        existing=>existing.id===piece.id&&existing.kind==='wall'&&
          existing.status!=='ruined')).map(piece=>piece.id);
      const workers=workerOrigins.map(origin=>{
        const out=nav.wallWorkerReachability?.(origin,crops,
          quote.previewPieces,quote.suppressed,false,replaced);
        const back=nav.wallWorkerReachability?.(origin,crops,
          quote.previewPieces,quote.suppressed,true,replaced);
        return crops.map((_,i)=>out?.[i]==='found'&&back?.[i]==='found'?
          true:null);
      });
      proof={movement:certifiedBoundary||candidate.recut?
        Boolean(kinds)&&faceCounts.unknown===0&&certifiedBoundary.length>0:
        wallLoop.status==='closed-wall-loop',
      wallLoop,faceCounts,unprovedFaces,
      exposedAttackMargin:certifiedBoundary?.length?
        attackMarginAcrossOpenFaces(crops,certifiedBoundary,
          [...state.structures,...quote.previewPieces],wasm):NaN,
      workers};
    }
    const workerSafe=crops.every((_,j)=>
      before.some((row,i)=>row[j]===true&&proof.workers[i][j]===true))&&
      before.every((row,i)=>row.every((value,j)=>
        value!==true||proof.workers[i][j]===true));
    const attackSafe=candidate.boundary||candidate.recut?
      proof.exposedAttackMargin>0:
      proof.wallLoop?.attackOccluded===true;
    const status=proof.movement&&workerSafe&&attackSafe?
      'protected':'unknown';
    const reason=!proof.movement?'movement-unproved':
      !workerSafe?'worker-access-unproved':
        !attackSafe?'attack-reach-unproved':null;
    attempts.push({...result,status,reason,
      movementFaces:proof.faceCounts,
      ...(proof.faceCounts.unknown?{unprovedFaces:proof.unprovedFaces}:{}),
      attackMargin,
      exposedAttackMargin:proof.exposedAttackMargin,
      workerRoutesBefore:before,workerRoutesAfter:proof.workers});
    if(status==='protected')return {status,
      chosen:{...attempts.at(-1),strokes:candidate.strokes,
        preparedPlan:quote},attempts,box};
  }
  return {status:'unknown',reason:'no-certified-proposal',attempts,box};
}
