// QA-only mask; no retained native pointer and no per-frame spatial queries.
export function canyonBankMask(bytes,bounds,field){
 if(bytes.length!==35*35*4)throw Error('Unexpected ground mask size');
 const data=bytes.slice();
 if(field.riverActive===false){for(let i=2;i<data.length;i+=4)data[i]=0;return data;}
 for(let z=0;z<35;z++)for(let x=0;x<35;x++){
  const info=field.waterInfo(bounds.minX+(x-1)*1.5,bounds.minZ+(z-1)*1.5);
  const t=Math.max(0,Math.min(1,(info.shore-.25)/2.75));
  data[(z*35+x)*4+2]=Number.isFinite(info.shore)?Math.round(255*(1-t*t*(3-2*t))):0;
 }
 return data;
}
