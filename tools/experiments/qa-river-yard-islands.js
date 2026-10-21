import {noise} from '/src/world/terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Visual mask only. Keep the existing worn approach corridors and all RGB data.
export function riverYardIslands(source,bo,field){
 const snapshot=globalThis.qaCampaignWorld?.spatialSession?.horizonSource?.snapshot();
 const native=snapshot?.settlements?.[0],clear=native?Math.max(19,Math.hypot(native.hx,native.hz)):0;
 const site=field.c.settlementSite??(native?{...native,clearRadius:clear,softRadius:clear+6,haloRadius:clear+13}:null);
 globalThis.qaRiverYardAudit={site:site??null,biome:field.c.biome,siteCount:snapshot?.settlements?.length??0};if(!site)return source;
 const result=source.slice();
 for(let iz=0;iz<35;iz++)for(let ix=0;ix<35;ix++){
  const x=bo.minX+(ix-1)*1.5,z=bo.minZ+(iz-1)*1.5,dx=x-site.x,dz=z-site.z,d=Math.hypot(dx,dz),at=(iz*35+ix)*4;
  if(d>site.haloRadius+4)continue;
  const warp=(noise(x*.055,z*.055,field.seed^97137)-.5)*1.05,line=Math.min(Math.abs(dx+warp),Math.abs(dz-warp));
  const path=(1-smooth(1.05,3.1,line))*(1-smooth(site.softRadius-2,site.haloRadius+1,d))*.74;
  const islands=smooth(.30,.72,noise(x*.085,z*.085,field.seed^83791));
  const w=source[at+3]/255,inside=1-smooth(site.clearRadius,site.haloRadius,d);
  result[at+3]=Math.round(Math.min(w,Math.max(path,w*(1-inside*(1-islands))))*255);
 }
 return result;
}
