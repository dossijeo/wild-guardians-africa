import {noise,hashCell} from '../world/terrain.js';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Exact cubic interpolation used by spatial-savanna.cpp for approach warp.
export function nativePathNoise(x,z,seed){
 const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz),at=(a,b)=>hashCell(seed^97137,a,b)/4294967296;
 const a=at(ix,iz),b=at(ix+1,iz),c=at(ix,iz+1),d=at(ix+1,iz+1);
 return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
}
// Visual mask only. Keep the existing worn approach corridors and all RGB data.
export function riverYardsEnabled(search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('riverYards')==='islands';
}
// Consume the existing renderer snapshot interface only when its revision changes.
// No global QA world, simulation traversal or per-frame Engine memory reads.
export function createRiverYardSites(field,source){
 let revision=Symbol('unread'),sites;
 return ()=>{
  const next=source?.revision?.()??0;if(next===revision)return sites;
  revision=next;
  sites=source?.snapshot?.()?.settlements?.map(native=>{const clear=Math.max(19,Math.hypot(native.hx,native.hz));return {...native,clearRadius:clear,softRadius:clear+6,haloRadius:clear+13};})??(field.c.settlementSite?[field.c.settlementSite]:[]);
  return sites;
 };
}
export function riverYardIslands(source,bo,field,sites){
 if(!sites.length)return source;
 const result=source.slice();
 for(let iz=0;iz<35;iz++)for(let ix=0;ix<35;ix++){
  const x=bo.minX+(ix-1)*1.5,z=bo.minZ+(iz-1)*1.5,at=(iz*35+ix)*4;
  const warp=(nativePathNoise(x*.055,z*.055,field.seed)-.5)*1.05;
  let path=0,inside=0;
  for(const site of sites){
   const dx=x-site.x,dz=z-site.z,d=Math.hypot(dx,dz);if(d>site.haloRadius+4)continue;
   const line=Math.min(Math.abs(dx+warp),Math.abs(dz-warp));
   path=Math.max(path,(1-smooth(1.05,3.1,line))*(1-smooth(site.softRadius-2,site.haloRadius+1,d))*.74);
   inside=Math.max(inside,1-smooth(site.clearRadius,site.haloRadius,d));
  }
  if(inside===0)continue;
  const islands=smooth(.30,.72,noise(x*.085,z*.085,field.seed^83791));
  const w=source[at+3]/255;
  result[at+3]=Math.round(Math.min(w,Math.max(path,w*(1-inside*(1-islands))))*255);
 }
 return result;
}
