import {noise} from '../world/terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
// Renderer-owned copy only. Never writes to the worker/engine payload.
export function riverBankMask(source,field,bo){
 const out=source.slice();
 for(let z=0;z<35;z++)for(let x=0;x<35;x++){
  const wx=bo.minX+(x-1)*1.5,wz=bo.minZ+(z-1)*1.5,info=field.waterInfo(wx,wz);
  const n=noise(wx*.17,wz*.17,field.seed^41817),width=1.2+n*3.3;
  const amount=(1-smooth(.25,width,info.shore))*(.72+.23*n);
  const at=(z*35+x)*4;out[at+3]=Math.max(out[at+3],Math.round(amount*255));
 }
 return out;
}

export function riverBankEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('riverSoil')==='1'&&q.get('riverBank')==='soil';
}
