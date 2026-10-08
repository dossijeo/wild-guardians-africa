// QA low-frequency approximation, computed only by the regional worker.
// Uses the mapped turf average/macro cover, not the obsolete vertex palette alone.
// Flat normal + fixed diffuse sunlight; no claim of exact lighting/texture match.
import {groundSample417} from '../../src/rendering/ground-mask.js';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
export function nativeSavannaPalette(palette){
 if(palette?.type!=='savanna-mapped-average-v1'||!['base','arh'].every(k=>Array.isArray(palette.means?.[k])&&palette.means[k].length===3&&palette.means[k].every(v=>Number.isFinite(v)&&v>=0&&v<=1)))throw Error('Invalid native far ground palette');
 const base=[...palette.means.base],ao=mix(.45,1,palette.means.arh[0]),nl=122.4412/Math.hypot(-193.0804,122.4412,72.9938),sun=[3.65,3.30,2.78],ambient=[.55,.63,.67],light=sun.map((v,i)=>v*nl*.96/Math.PI*mix(.48,1,ao)+ambient[i]*ao);
 return (field,profile,x,z,original)=>{
  const ctx=groundSample417(field,profile,x,z),cover=mix(.58,1,smooth(.15,.64,ctx[0]))*(1-ctx[3]*.91),scale=[1.14,1.09,.97];
  return original.map((v,i)=>{const surface=clamp(mix(v,base[i]*scale[i]*(.94+.12*ctx[1]),cover)),lit=surface**2.2*light[i];return clamp((lit*(2.51*lit+.03))/(lit*(2.43*lit+.59)+.14))**(1/2.2);});
 };
}
