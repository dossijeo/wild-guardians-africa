import {restoredWallRepairReference} from '../world/restored-wall-repair-reference.js';
import {WALL_REPAIR_DURATION} from '../simulation/structure-presentation.js';
import {NativeWall} from './walls.js';
import {createWallRepairLayer} from './native-gate-gpu-binding.js';
import {uniform} from 'three/tsl';
import {markRemoteBarrierClockNode,markRestoredWallRepairClockNode} from './remote-clock-bindings.js';
import {sameNativeBarrierAdditionReference,copyNativeBarrierAdditionAttestation} from '../world/native-barrier-addition.js';

// The two authored adjacent stage pairs share one admitted NativeWall owner.
// No phase creates geometry; only the confirmed visual clock evaluates Repair.
export function createPreparedRuinedWallRepair({prototypes,entity,elapsed,renderer,presentationClock,getPresentationTime,getRepairAge,template}){
 if(entity.kind!=='wall'||entity.gate||entity.status!=='intact'||entity.hp!==entity.maxHp||entity.wallPresentation||entity.blessing)throw Error('Unsupported native ruined wall replacement');
 const age=markRemoteBarrierClockNode(uniform(0),template);
 if(template.additions[0].entityId!==entity.id)throw Error('Native solid Repair clock names another wall');
 const wall=createSolidRepairPairs({prototypes,entity,elapsed,renderer});let layer;
 try{
  const parts=wall.parts.slice(),key=wall.stageKey;
  layer=createWallRepairLayer({parts,presentationClock,getPresentationTime,getRepairAge:()=>getRepairAge(template),visual:0,previous:null,gate:false,repairAge:age});
  let closed=false,acquiredAt=null;
  const owner={repairLayer:layer,clockNode:age,
   current:()=>!closed&&wall.nativeGpuRepair===owner&&parts.every((p,i)=>wall.parts[i]===p&&p.mesh.parent===wall)&&layer.current(),
   acceptBoundary(value){const proof=copyNativeBarrierAdditionAttestation(value),at=proof.reference.worldBoundary.effectiveTime;if(!owner.current()||!sameNativeBarrierAdditionReference(proof.preparedReference,template)||!Number.isFinite(at)||at<elapsed||acquiredAt!==null)throw Error('Native ruined wall lost its acquired boundary');const restored={...entity,wallPresentation:{from:0,to:1,at}};if(!layer.accept(restored,at))throw Error('Native ruined wall curve rejected');acquiredAt=at;},
   stageKeyFor(value,time){return acquiredAt!==null&&time>=acquiredAt+WALL_REPAIR_DURATION?null:key;},
   checkEntity(value,time){
    if(!owner.current()||value.id!==entity.id||value.material!==entity.material||value.gate||value.maxHp!==entity.maxHp)throw Error('Native ruined wall owner changed');
    if(acquiredAt===null){if(value.status!=='ruined'||value.hp!==0)throw Error('Native ruined wall has no acquired repair');return;}
    if(value.status!=='intact'||!layer.accept(value,time))throw Error('Native ruined wall differs from its acquired Repair');
   },
   dispose(){if(closed)return;closed=true;if(wall.nativeGpuRepair===owner)wall.nativeGpuRepair=null;
    // A stale candidate never gains ownership of a foreign alias installed on
    // its meshes. Retire the originally prepared resources through NativeWall.
    wall.parts=parts;for(const record of layer.records){record.mesh.geometry=record.geometry;record.mesh.material=record.material;}
    layer.dispose();}
  };
  wall.nativeGpuRepair=owner;layer.activate();return wall;
 }catch(error){layer?.dispose();wall.dispose();throw error;}
}

// Both live admission and cold presentation use the same authored four meshes.
function createSolidRepairPairs({prototypes,entity,elapsed,renderer}){
 const build=visual=>new NativeWall(prototypes,{...entity,hp:entity.maxHp*visual,wallPresentation:null},elapsed,{renderer,prepareRepair:true});
 const wall=build(.25);let upper;
 try{
  upper=build(.75);const upperKey=upper.stageKey;
  for(const part of upper.parts){part.mesh.material.userData.blessingObject=wall.blessingUniform;wall.add(part.mesh);wall.parts.push(part);}upper.parts=[];upper.dispose();upper=null;
  wall.stageKey+='|'+upperKey;wall.visual=0;wall.target=1;return wall;
 }catch(error){upper?.dispose();wall.dispose();throw error;}
}

// A saved curve is presentation state, never a new kind2/topology permission.
// Like restored gates, it samples the submitted presentation clock, including
// its saved origin and pauses, before the first graphical admission.
export function createRestoredSolidWallRepair({prototypes,entity,elapsed,renderer,presentationClock,getPresentationTime,getRepairAge}){
 const p=entity?.wallPresentation;
 if(typeof getRepairAge!=='function')throw Error('Restored solid Repair requires its submitted age');
 if(entity?.kind!=='wall'||entity.gate||entity.status!=='intact'||entity.hp!==entity.maxHp||!Number.isFinite(entity.maxHp)||entity.maxHp<=0||!p||!Number.isFinite(p.from)||p.from<0||p.from>=1||p.to!==1||!Number.isFinite(p.at)||p.at<0||!Number.isFinite(elapsed)||elapsed<p.at||elapsed>=p.at+WALL_REPAIR_DURATION)throw Error('Restored solid Repair source unavailable');
 const wall=createSolidRepairPairs({prototypes,entity,elapsed,renderer});let layer;
 try{
  wall.visual=p.from;const parts=wall.parts.slice(),key=wall.stageKey,reference=restoredWallRepairReference(entity),age=markRestoredWallRepairClockNode(uniform(elapsed-p.at),reference);
  layer=createWallRepairLayer({parts,presentationClock,getPresentationTime,getRepairAge:()=>getRepairAge(reference),repairAge:age,repairFrom:p.from,visual:p.from,previous:null,gate:false});
  if(!layer.accept(entity,elapsed))throw Error('Restored solid Repair curve unavailable');
  let closed=false;
  const owner={repairLayer:layer,clockNode:age,reference,
   current:()=>!closed&&wall.nativeGpuRepair===owner&&wall.parts.length===parts.length&&parts.every((part,i)=>wall.parts[i]===part&&part.mesh.parent===wall)&&layer.current(),
   stageKeyFor(value,time){return time>=layer.policy.event.at+WALL_REPAIR_DURATION?null:key;},
   checkEntity(value,time){if(!owner.current()||value.id!==entity.id||value.material!==entity.material||value.gate||value.status!=='intact'||value.maxHp!==entity.maxHp||!layer.accept(value,time))throw Error('Restored solid Repair requires a prepared geometry transition');},
   dispose(){if(closed)return;closed=true;if(wall.nativeGpuRepair===owner)wall.nativeGpuRepair=null;wall.parts=parts;for(const record of layer.records){record.mesh.geometry=record.geometry;record.mesh.material=record.material;}layer.dispose();}
  };
  wall.nativeGpuRepair=owner;layer.activate();return wall;
 }catch(error){layer?.dispose();wall.dispose();throw error;}
}
