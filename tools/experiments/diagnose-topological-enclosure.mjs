import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import * as Game from '../../src/simulation/game.js';
import {numberOf} from '../../src/simulation/money.js';
import {PROFILES} from '../../src/simulation/workforce.js';
import {AGRICULTURAL_PROFILE_LIMITS} from
  '../../src/simulation/raid-agricultural-impact.js';
import {ANIMAL_SPATIAL_PROFILES} from
  '../../src/world/wild-engine/spatial-movement-profiles.js';
import {createSpatialGameSession} from
  '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createSpatialIntentBridge} from
  '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createCropEnclosurePlanner} from
  '../../src/world/wild-engine/spatial-crop-enclosure-plan.js';
import {cutEdgesToStrokes} from
  '../../src/world/wild-engine/spatial-topological-enclosure-prototype.js';

const [snapshotPath,groupId]=process.argv.slice(2);
if(!snapshotPath)throw Error('Usage: diagnose-topological-enclosure.mjs SNAPSHOT[.gz] [GROUP_ID]');
const wasmPath=process.env.WILD_ENGINE_TOPOLOGICAL_CUT_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const bytes=readFileSync(snapshotPath);
const state=deserialize((snapshotPath.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
let diagnosticHire=null;
if(state.pauses.includes('hiring')){
  const profileId=process.env.WILD_ENGINE_DIAGNOSTIC_HIRE_PROFILE;
  const profile=PROFILES.find(item=>item.id===profileId);
  if(!profile)throw Error('Hiring is paused; set WILD_ENGINE_DIAGNOSTIC_HIRE_PROFILE');
  const plantsPerWorker=Number(process.env.WILD_ENGINE_DIAGNOSTIC_PLANTS_PER_WORKER??12);
  if(!Number.isSafeInteger(plantsPerWorker)||plantsPerWorker<1)
    throw RangeError('Invalid diagnostic plants-per-worker ratio');
  const living=state.plants.filter(plant=>plant.alive).length;
  const desired=Math.max(1,Math.ceil(living/plantsPerWorker));
  const staff=Math.max(1,Math.min(desired,
    Math.floor(numberOf(state.ledger.balance)/profile.wage)));
  const id=`diagnostic-hire-day${state.day}`;
  Game.hire(state,id,{[profile.id]:staff});
  diagnosticHire={id,profile:profile.id,staff,plantsPerWorker};
}
const module=new WebAssembly.Module(readFileSync(wasmPath));
const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const points=[...state.plants.filter(plant=>plant.alive),
    ...state.structures,...state.villages.map(village=>village.entry??village)];
  const chunk=value=>Math.floor((value+24)/48);
  const minX=Math.min(...points.map(point=>point.x))-48;
  const maxX=Math.max(...points.map(point=>point.x))+48;
  const minZ=Math.min(...points.map(point=>point.z))-48;
  const maxZ=Math.max(...points.map(point=>point.z))+48;
  const desired=new Map();
  for(let cz=chunk(minZ);cz<=chunk(maxZ);cz++)
    for(let cx=chunk(minX);cx<=chunk(maxX);cx++)
      desired.set(`${cx},${cz}`,{cx,cz,score:0});
  session.stream.plan(desired);
  await session.stream.whenIdle();
  const bridge=createSpatialIntentBridge(session);
  bridge.resetFromState(state);
  const nav=createSpatialNavigationMovement(session,state);
  const groups=bridge.getUnprotectedCropGroups();
  const group=groupId?groups.find(item=>item.id===groupId):groups[0];
  if(!group)throw Error(`No unprotected crop group ${groupId??''}`);
  const planningStart=performance.now();
  const plan=createCropEnclosurePlanner(state,nav,bridge,session)
    .planCropEnclosure(group.id,{material:'zarzas',method:'topological'});
  const planningMs=performance.now()-planningStart;
  let cutDetail=null;
  if(process.env.WILD_ENGINE_DIAGNOSTIC_CUT==='1'){
    const ids=new Set(group.cropIds),b=group.bounds;
    const crops=state.plants.filter(plant=>plant.alive&&
      (ids.has(plant.id)||plant.x>=b.minX-12&&plant.x<=b.maxX+12&&
        plant.z>=b.minZ-12&&plant.z<=b.maxZ+12));
    const box=[Math.floor(Math.min(...crops.map(plant=>plant.x))-12),
      Math.floor(Math.min(...crops.map(plant=>plant.z))-12),
      Math.ceil(Math.max(...crops.map(plant=>plant.x))+12)+1,
      Math.ceil(Math.max(...crops.map(plant=>plant.z))+12)+1];
    const wasm=session.core.wasm;
    const ptr=wasm.lazy_cut_seeds_ptr(crops.length);
    new Int32Array(wasm.memory.buffer,ptr,crops.length*2).set(crops.flatMap(
      plant=>[Math.round(plant.x),Math.round(plant.z)]));
    const reach=Math.max(...Object.values(ANIMAL_SPATIAL_PROFILES)
      .map(profile=>profile.radius))+.65+
      AGRICULTURAL_PROFILE_LIMITS.attackRadius;
    const count=wasm.lazy_local_crop_cut_conservative_buildable(...box,
      crops.length,Math.ceil(reach)+2);
    if(count>=0){
      const edges=Array.from(new Int32Array(wasm.memory.buffer,
        wasm.lazy_local_crop_cut_ptr(),count*4));
      const shape=cutEdgesToStrokes(edges);
      const quote=Game.quoteWallChain(state,'zarzas',shape.strokes,nav,
        {smooth:false,snap:false});
      const nearby=[];
      if(process.env.WILD_ENGINE_DIAGNOSTIC_NEARBY==='1'&&
        quote.blockedPieces.length===1){
        const blocked=quote.blockedPieces[0];
        const index=shape.strokes.findIndex(stroke=>stroke.some(point=>
          Math.hypot(point[0]-blocked.x,point[1]-blocked.z)<.01));
        if(index>=0)for(const distance of [-2,-1,1,2]){
          const dx=distance*Math.sin(blocked.yaw);
          const dz=distance*Math.cos(blocked.yaw);
          const strokes=shape.strokes.map((stroke,i)=>i===index?
            stroke.map(([x,z])=>[x+dx,z+dz]):stroke);
          const candidate=Game.quoteWallChain(state,'zarzas',strokes,nav,
            {smooth:false,snap:false});
          let protection=null;
          let recut=null;
          if(!candidate.blockedPieces.length&&!candidate.blockedCrops.length&&
            candidate.expectedSlots.length===candidate.pieces.length){
            protection=nav.withWallPreview(candidate.previewPieces,
              candidate.suppressed,()=>{
                const again=wasm.lazy_local_crop_cut_conservative_buildable(
                  ...box,crops.length,Math.ceil(reach)+2);
                const faces=again===0?Array.from(new Int32Array(
                  wasm.memory.buffer,wasm.lazy_local_crop_cut_boundary_ptr(),
                  wasm.lazy_local_crop_cut_boundary_count()*4)):[];
                const kinds=[];
                for(let j=0;j<faces.length;j+=4)kinds.push(
                  wasm.lazy_cut_face_natural(...faces.slice(j,j+4)));
                recut={count:again,faces:faces.length/4,
                  unknownFaces:kinds.filter(kind=>kind<=0).length};
                return bridge.getUnprotectedCropGroups(
                  {includeProtected:true}).find(item=>item.id===group.id)
                  ?.protection??'missing';
              },true);
          }
          nearby.push({distance,modules:candidate.pieces.length,
            expectedSlots:candidate.expectedSlots.length,
            blockedPieces:candidate.blockedPieces.length,
            blockedCrops:candidate.blockedCrops.length,protection,recut});
        }
      }
      cutDetail={box,count,strokes:shape.strokes,
        expectedSlots:quote.expectedSlots.map(slot=>
          ({x:slot.x,z:slot.z,angle:slot.angle,scaleX:slot.scaleX})),
        blockedPieces:quote.blockedPieces.map(piece=>
          ({x:piece.x,z:piece.z,yaw:piece.yaw,reason:nav.wallPlacement(piece).reason})),
        blockedCrops:quote.blockedCrops.map(piece=>({x:piece.x,z:piece.z})),
        nearby};
    }else cutDetail={box,count};
  }
  console.log(JSON.stringify({snapshotPath,day:state.day,time:state.time,
    diagnosticHire,
    residentChunks:loaded.size,group:{id:group.id,crops:group.cropIds.length,
      protection:group.protection,bounds:group.bounds},
    cutDetail,planningMs,
    plan:{status:plan.status,reason:plan.reason,kind:plan.kind,
      modules:plan.modules?.length??0,cost:plan.cost??0,
      proof:plan.proof?{movementFaces:plan.proof.movementFaces,
        exposedAttackMargin:plan.proof.exposedAttackMargin,
        workerSafe:plan.proof.workerRoutesAfter?.every(row=>row.every(Boolean))}:null,
      attempts:plan.attempts?.map(({kind,status,reason,modules,cost,gaps,
        expectedSlots,movementFaces,unprovedFaces,exposedAttackMargin})=>
        ({kind,status,reason,modules,cost,gaps,expectedSlots,
          movementFaces,unprovedFaces,exposedAttackMargin}))}},null,2));
}finally{session.dispose();}
