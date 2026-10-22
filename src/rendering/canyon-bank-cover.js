// Explicit visual-lab option; no engine or navigation state is modified.
import {hashCell} from '../world/terrain.js';
export const CANYON_BANK_COVER_PATH='/assets/visual-lab/canyons-bank-cover-sculpted-ground-detail.glb';
export function canyonBankCoverEnabled(biome,search=globalThis.location?.search??''){
 const q=new URLSearchParams(search);return biome==='canyons'&&q.get('visualLab')==='global-lighting'&&q.get('canyonCover')==='banks';
}
export function canyonBankDensity(field,x,z){
 const shore=field.waterInfo(x,z).shore,bank=Math.exp(-Math.pow(shore/5.5,2));
 const regional=(hashCell(field.seed,Math.floor(x/11),Math.floor(z/11),9271)>>>0)/4294967296;
 return Math.min(.68,.004+bank*(regional>.42?.62:.035));
}
// Run only for accepted candidates during chunk creation/event invalidation.
export function canyonBankFootprintFits(geometry,field,x,z,bits,blockers){
 const scale=(1.25+((bits>>>14)&63)/63*.65)*2,angle=(bits>>>20)/4096*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),attr=geometry.attributes.position;
 for(let vi=0;vi<attr.count;vi++){
  const px=x+(c*attr.getX(vi)+s*attr.getZ(vi))*scale,pz=z+(-s*attr.getX(vi)+c*attr.getZ(vi))*scale;
  if(field.waterInfo(px,pz).inside||blockers.some(p=>(px-p.x)**2+(pz-p.z)**2<(p.kind==='wall'?1.45:p.kind==='center'?9:p.buildings?80:1.8)))return false;
 }
 return true;
}
