// Scene-owned cultivated soil; borrowed base bytes remain untouched.
export function createCropSoilMasks(){
 const entries=new Map();let dirty=false;
 function paint(e,plants){
  const data=new Uint8Array(e.base),local=plants.filter(p=>p.alive!==false&&p.x>=e.x-2.85&&p.x<=e.x+50.85&&p.z>=e.z-2.85&&p.z<=e.z+50.85);
  for(let z=0;z<35;z++)for(let x=0;x<35;x++){
   let amount=0;for(const p of local)amount=Math.max(amount,.7*(1-Math.min(1,Math.hypot(e.x+(x-1)*1.5-p.x,e.z+(z-1)*1.5-p.z)/1.35)));
   const i=(z*35+x)*4+3;data[i]=Math.max(data[i],Math.round(amount*255));
  }
  if(data.some((v,i)=>v!==e.texture.image.data[i])){e.texture.image.data=data;e.texture.needsUpdate=true;e.owned=data;}
 }
 return {
  attach(texture,cx,cz,plants){if(entries.has(texture))return;if(texture.image.data.length!==35*35*4)throw Error('Unexpected ground mask');const e={texture,original:texture.image.data,base:new Uint8Array(texture.image.data),x:cx*48-24,z:cz*48-24,owned:null};entries.set(texture,e);paint(e,plants);},
  invalidate(){dirty=true;},
  flush(plants){if(!dirty)return false;for(const e of entries.values())paint(e,plants);dirty=false;return true;},
  release(texture){const e=entries.get(texture);if(!e)return;if(e.owned&&texture.image.data===e.owned){texture.image.data=e.original;texture.needsUpdate=true;}entries.delete(texture);},
  dispose(){for(const texture of [...entries.keys()])this.release(texture);},
  get size(){return entries.size;}
 };
}

export function cropSoilEnabled(search=globalThis.location?.search??''){const q=new URLSearchParams(search);return q.get('visualLab')==='global-lighting'&&q.get('riverSoil')==='1'&&q.get('cropSoil')==='local';}
