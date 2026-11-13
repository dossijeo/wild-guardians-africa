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
