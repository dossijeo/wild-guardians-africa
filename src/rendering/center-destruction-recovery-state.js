const finite=Number.isFinite,integer=Number.isSafeInteger;

function vector(value,length){
 return Array.isArray(value)&&value.length===length&&Array.from(value).every(finite);
}

function particle(value){
 return value&&vector(value.p,3)&&vector(value.v,3)&&vector(value.color,3)&&
  finite(value.age)&&finite(value.life)&&value.age>=0&&value.age<=value.life&&value.life>0;
}

function smoke(value){
 return particle(value)&&[value.size,value.rotation,value.spin,value.alpha,value.phase].every(finite)&&
  value.size>0&&value.alpha>=0&&integer(value.kind)&&value.kind>=0&&value.kind<=2;
}

function debris(value){
 return particle(value)&&vector(value.r,3)&&vector(value.spin,3)&&vector(value.size,3)&&
  value.size.every(size=>size>0)&&integer(value.bounces)&&value.bounces>=0;
}

export function copyCenterDestructionRecoveryState(value,{seed,damage,siteCount}){
 if(value?.version!==1||value.seed!==seed||value.damage!==damage||!finite(value.time)||value.time<0||
    !integer(value.randomState)||!finite(value.destructionAt)||value.destructionAt>value.time||
    !integer(value.lastHitStage)||value.lastHitStage< -1||value.lastHitStage>21||
    !['low','medium','high'].includes(value.quality)||!vector(value.emission,siteCount)||
    value.emission.some(amount=>amount<0||amount>=1)||
    !Array.isArray(value.smoke)||value.smoke.length>330||!Array.from(value.smoke).every(smoke)||
    !Array.isArray(value.debris)||value.debris.length>340||!Array.from(value.debris).every(debris)||
    !integer(value.debrisEmitted)||value.debrisEmitted<value.debris.length||
    !integer(value.groundContacts)||value.groundContacts<0||value.groundContacts>value.debrisEmitted)
  throw TypeError('Invalid center destruction recovery state');
 return structuredClone(value);
}
