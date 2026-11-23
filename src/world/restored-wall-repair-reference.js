import {WALL_REPAIR_DURATION} from '../simulation/structure-presentation.js';
export function copyRestoredWallRepairReference(value){
 if(value?.kind!=='restored-wall-repair-reference'||value.version!==1||typeof value.entityId!=='string'||!/^structure-[1-9][0-9]*$/.test(value.entityId)||!['zarzas','empalizada','adobe','piedra','reforzado'].includes(value.material)||!Number.isFinite(value.maxHp)||value.maxHp<=0||!Number.isFinite(value.from)||value.from<0||value.from>=1||value.to!==1||!Number.isFinite(value.at)||value.at<0)throw TypeError('Invalid restored wall Repair reference');
 return Object.freeze({kind:value.kind,version:1,entityId:value.entityId,material:value.material,maxHp:value.maxHp,from:value.from,to:1,at:value.at});
}
export function restoredWallRepairReference(entity){return copyRestoredWallRepairReference({kind:'restored-wall-repair-reference',version:1,entityId:entity.id,material:entity.material,maxHp:entity.maxHp,...entity.wallPresentation});}
export function restoredWallRepairKey(value){return JSON.stringify(copyRestoredWallRepairReference(value));}
export function copyRestoredWallRepairDeclaration(value){
 const reference=copyRestoredWallRepairReference(value?.reference);
 if(value?.version!==1||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||!Number.isFinite(value.restoredAt)||value.restoredAt<reference.at||value.restoredAt>=reference.at+WALL_REPAIR_DURATION)throw TypeError('Invalid restored wall Repair declaration');
 return Object.freeze({version:1,authorityEpoch:value.authorityEpoch,restoredAt:value.restoredAt,reference});
}
// Cold semantic restoration only; never derive permission from a draw packet.
export function captureRestoredWallRepairs(state,authorityEpoch){return (state.structures??[]).filter(e=>e.kind==='wall'&&!e.gate&&e.status==='intact'&&e.hp===e.maxHp&&e.wallPresentation&&e.wallPresentation.to===1&&e.wallPresentation.from>=0&&e.wallPresentation.from<1&&state.elapsed>=e.wallPresentation.at&&state.elapsed<e.wallPresentation.at+WALL_REPAIR_DURATION).map(e=>copyRestoredWallRepairDeclaration({version:1,authorityEpoch,restoredAt:state.elapsed,reference:restoredWallRepairReference(e)}));}
export function copyRestoredWallRepairClock(binding){
 const reference=copyRestoredWallRepairReference(binding.nativeRestoredWallRepair);
 if(binding.semantic!=='relative'||binding.epoch!==reference.at||binding.resourceEnd!==undefined||binding.period!==undefined||Object.keys(binding).some(k=>k.startsWith('native')&&k!=='nativeRestoredWallRepair')||['restoredRepairRecord','executionEpoch','barrierOrigin','declaration'].some(k=>Object.hasOwn(binding,k)))throw TypeError('Invalid restored wall Repair clock');
 return {semantic:'relative',epoch:reference.at,nativeRestoredWallRepair:reference};
}
