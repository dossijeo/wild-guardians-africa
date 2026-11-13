// Identity of a committed native proposal, not a clock permit or a description
// of geometry. Preparation must apply the corresponding world before using it.
const keys=['version','authorityEpoch','nativeSession','ticket','effectiveTime'];
export function copyNativeWorldBoundary(value){
 if(value===null)return null;
 if(!value||value.version!==1||typeof value.authorityEpoch!=='string'||!value.authorityEpoch||
    !Number.isSafeInteger(value.nativeSession)||value.nativeSession<1||!Number.isSafeInteger(value.ticket)||value.ticket<1||
    !Number.isFinite(value.effectiveTime)||value.effectiveTime<0||Object.keys(value).some(key=>!keys.includes(key)))
  throw TypeError('Invalid native world resource boundary');
 return Object.freeze(Object.fromEntries(keys.map(key=>[key,value[key]])));
}
export function sameNativeWorldBoundary(a,b){
 if(a===null||b===null)return a===b;
 return a!==undefined&&b!==undefined&&keys.every(key=>a[key]===b[key]);
}

// Correlate physical publications with this consumer's applied graphical
// batch. This grants no time and does not prepare other presentation owners.
export function reconcileNativeWorldResources({publication,admitted,previous=null}={}){
 const before=copyNativeWorldBoundary(previous),records=publication?.nativeWorldResources;
 if(records===undefined){
  if(before&&admitted?.changes?.length)throw Error('Terrain changed without a native world resource boundary');
  return before;
 }
 if(!Array.isArray(records)||!records.length||records.length>32768||!Number.isSafeInteger(publication.sequence)||publication.sequence<0||
    !Number.isFinite(publication.elapsed)||publication.elapsed<0||publication.unchanged===true)throw TypeError('Invalid native world resource publication');
 const expected=new Map();let boundary=before,total=0;
 for(const record of records){
  if(!record||record.version!==1||Object.keys(record).some(key=>!['version','worldBoundary','kind','chunks','removed'].includes(key))||
     !Array.isArray(record.chunks)||!Array.isArray(record.removed))throw TypeError('Invalid native world resource record');
  if(![6,7,8,9,10,11].includes(record.kind))throw Error('Native graphical resource family is not implemented');
  if(record.kind===7?record.chunks.length>0:record.removed.length>0)throw Error('Native resource operation does not match its family');
  const next=copyNativeWorldBoundary(record.worldBoundary);
  if(!next||next.effectiveTime>publication.elapsed||boundary&&(next.authorityEpoch!==boundary.authorityEpoch||next.nativeSession!==boundary.nativeSession||
     next.ticket<=boundary.ticket||next.effectiveTime<boundary.effectiveTime))throw Error('Native world resource boundary is stale or incompatible');
  const seen=new Set();
  for(const [points,removed] of [[record.chunks,false],[record.removed,true]])for(const point of points){
   if(++total>32768||!point||!Number.isSafeInteger(point.cx)||!Number.isSafeInteger(point.cz)||Object.keys(point).some(key=>!['cx','cz'].includes(key)))throw TypeError('Invalid native resource coordinate');
   const key=`${point.cx},${point.cz}`;if(seen.has(key))throw Error('Conflicting native resource operations');seen.add(key);
   expected.set(key,{removed,at:next.effectiveTime});
  }
  boundary=next;
 }
 if(!admitted||admitted.version!==1||admitted.sequence!==publication.sequence||typeof admitted.epoch!=='string'||!admitted.epoch||
    admitted.canonicalPropsUnmasked!==true||!Array.isArray(admitted.changes)||admitted.changes.length!==expected.size||
    (!expected.size?admitted.empty!==true:admitted.empty!==undefined))throw Error('Native resources lack their applied graphical batch');
 const seen=new Set();
 for(const item of admitted.changes){
  const key=`${item?.cx},${item?.cz}`,target=expected.get(key);
  if(!target||seen.has(key)||!Number.isSafeInteger(item.cx)||!Number.isSafeInteger(item.cz)||!Number.isSafeInteger(item.revision)||item.revision<1||
     item.removed!==target.removed||!Number.isFinite(item.capturedAt)||item.capturedAt<target.at||item.capturedAt>publication.elapsed)
   throw Error('Applied graphical resources do not match the native world');
  seen.add(key);
 }
 return boundary;
}
