import {validateTerrainResourceRemoval} from './terrain-resource-removal.js';

// Own only the rendering projection accepted by the authoritative terrain channel.
export function copyTerrainResourcePayload(data,capturedAt=undefined){
  if(capturedAt!==undefined&&(!Number.isFinite(capturedAt)||capturedAt<0))throw TypeError('Invalid terrain capture time');
  const removal=data?.removed!==undefined;if(removal)validateTerrainResourceRemoval(data);
  else if(data?.authority!=='spatial-wasm'||!Number.isSafeInteger(data.cx)||!Number.isSafeInteger(data.cz)||!(data.terrain?.positions instanceof Float32Array)||!(data.terrain?.colors instanceof Float32Array)||!(data.terrain?.indices instanceof Uint16Array))throw TypeError('Invalid authoritative terrain');
  if(data.groundMask!==undefined&&(!(data.groundMask instanceof Uint8Array)||data.groundMask.length!==35*35*4))throw TypeError('Invalid authoritative ground mask');
  if(data.water!==undefined&&(!(data.water instanceof Float32Array)||data.water.length%9!==0))throw TypeError('Invalid authoritative water');
  if(data.waterBed!==undefined){const b=data.waterBed;if(!b||!Number.isSafeInteger(b.nx)||!Number.isSafeInteger(b.nz)||b.nx<2||b.nz<2||b.nx>513||b.nz>513||![b.minX,b.minZ,b.width,b.height,b.lo,b.span].every(Number.isFinite)||b.width<=0||b.height<=0||b.span<=0||!(b.bytes instanceof Uint8Array)||b.bytes.length!==b.nx*b.nz*4)throw TypeError('Invalid authoritative water bed');}
  if(data.waterShore!==undefined&&(!(data.waterShore instanceof Float32Array)||data.waterShore.length!==data.terrain.positions.length/3||!data.waterShore.every(Number.isFinite)))throw TypeError('Invalid authoritative water shore');
  if(data.mudInputs!==undefined){const m=data.mudInputs,site=m?.site;if(!m||m.cx!==data.cx||m.cz!==data.cz||!Number.isSafeInteger(m.seed)||m.seed<0||m.seed>0xffffffff||!Number.isFinite(m.scale)||m.scale<=0||!(m.heights instanceof Float32Array)||m.heights.length!==49*49||!m.heights.every(Number.isFinite)||!Array.isArray(m.inside)||m.inside.length!==130||m.inside.some(row=>!Array.isArray(row)||row.length!==3||!Number.isFinite(row[0])||!Number.isFinite(row[1])||typeof row[2]!=='boolean')||!Array.isArray(m.slopes)||m.slopes.length!==10||m.slopes.some(row=>!Array.isArray(row)||row.length!==3||!row.every(Number.isFinite))||site!==null&&(!site||![site.x,site.z,site.clearRadius].every(Number.isFinite)||site.clearRadius<0))throw TypeError('Invalid authoritative mud inputs');}
  if(data.instances!==undefined&&(!Array.isArray(data.instances)||data.instances.length!==20||data.instances.some((list,slot)=>!Array.isArray(list)||list.some(item=>item?.slot!==slot||typeof item.id!=='string'||![item.x,item.y,item.z,item.yaw,item.sx,item.sy,item.sz].every(Number.isFinite)))))throw TypeError('Invalid authoritative instances');
  return removal?{authority:data.authority,cx:data.cx,cz:data.cz,removed:true,...(capturedAt===undefined?{}:{capturedAt})}:{authority:data.authority,cx:data.cx,cz:data.cz,...(capturedAt===undefined?{}:{capturedAt}),terrain:{positions:data.terrain.positions.slice(),colors:data.terrain.colors.slice(),indices:data.terrain.indices.slice()},...(data.water===undefined?{}:{water:data.water.slice()}),...(data.waterBed===undefined?{}:{waterBed:{...data.waterBed,bytes:data.waterBed.bytes.slice()}}),...(data.waterShore===undefined?{}:{waterShore:data.waterShore.slice()}),...(data.groundMask===undefined?{}:{groundMask:data.groundMask.slice()}),...(data.mudInputs===undefined?{}:{mudInputs:structuredClone(data.mudInputs)}),...(data.instances===undefined?{}:{instances:data.instances.map(list=>list.map(item=>({...item})))})};
}

// Compare typed bytes and canonical metadata; a matching coordinate alone does
// not prove that a speculative GPU revision belongs to the physical commit.
export function sameTerrainResourcePayload(a,b){
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
 if(ArrayBuffer.isView(a)||ArrayBuffer.isView(b)){if(a.constructor!==b.constructor||a.byteLength!==b.byteLength)return false;const x=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),y=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);return x.every((value,index)=>value===y[index]);}
 if(Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameTerrainResourcePayload(a[key],b[key]));
}
