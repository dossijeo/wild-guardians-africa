// Isolated browser-compatible binary experiment. Not used by production saves,
// streaming or IndexedDB. Keep native float buffers; JSON encodes descriptors.
const encoder=new TextEncoder(),decoder=new TextDecoder();
const sections=[['terrain',Float32Array],['water',Float32Array],['groundMask',Uint8Array]];
const magic=0x57474331;
function checksum(bytes){let hash=2166136261;for(const byte of bytes)hash=Math.imul(hash^byte,16777619);return hash>>>0;}
export function encodeChunkCache(data,key){
 if(typeof key!=='string'||!key)throw Error('Missing generation fingerprint');
 const arrays=sections.map(([name,Type])=>{const array=data[name];if(!(array instanceof Type))throw Error('Invalid native '+name);return new Uint8Array(array.buffer,array.byteOffset,array.byteLength);});
 const header=encoder.encode(JSON.stringify({key,cx:data.cx,cz:data.cz,instances:data.instances,sections:arrays.map(a=>a.byteLength)}));
 const offset=(16+header.length+3)&~3,length=offset+arrays.reduce((n,a)=>n+a.length,0);
 const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);view.setUint32(0,magic,true);view.setUint32(4,header.length,true);view.setUint32(8,length,true);
 bytes.set(header,16);let cursor=offset;for(const array of arrays){bytes.set(array,cursor);cursor+=array.length;}
 view.setUint32(12,checksum(bytes.subarray(16)),true);return bytes;
}
export function decodeChunkCache(bytes,key){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<16)throw Error('Invalid cache bytes');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),headerLength=view.getUint32(4,true);
 if(view.getUint32(0,true)!==magic||view.getUint32(8,true)!==bytes.length||headerLength>bytes.length-16||view.getUint32(12,true)!==checksum(bytes.subarray(16)))throw Error('Corrupt chunk cache');
 const header=JSON.parse(decoder.decode(bytes.subarray(16,16+headerLength)));
 if(header.key!==key)throw Error('Obsolete chunk generation');
 if(!Number.isSafeInteger(header.cx)||!Number.isSafeInteger(header.cz)||!Array.isArray(header.instances)||!Array.isArray(header.sections)||header.sections.length!==3)throw Error('Invalid chunk metadata');
 let cursor=(16+headerLength+3)&~3;
 const data={cx:header.cx,cz:header.cz,instances:header.instances};
 for(let i=0;i<sections.length;i++){
  const [name,Type]=sections[i],size=header.sections[i];
  if(!Number.isSafeInteger(size)||size<0||size%Type.BYTES_PER_ELEMENT||cursor+size>bytes.length)throw Error('Invalid chunk section');
  // Every section owns a distinct buffer, as expected by chunkTransferables.
  const owned=new Uint8Array(size);owned.set(bytes.subarray(cursor,cursor+size));data[name]=new Type(owned.buffer);cursor+=size;
 }
 if(cursor!==bytes.length)throw Error('Trailing cache bytes');return data;
}
