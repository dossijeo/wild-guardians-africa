// A bank belongs to one asset load. Its promise is discarded with that load,
// so abort/retry cannot retain stale buffers globally.
export function wallBufferReader(pack,fetchBytes){
 const bank=pack.bufferBank?Promise.resolve().then(()=>fetchBytes(pack.bufferBank.url)):null;
 return async descriptor=>{
  if(descriptor.bankOffset===undefined)return fetchBytes(descriptor.url);
  if(!bank)throw Error('Wall buffer range has no bank');
  const data=await bank,{bankOffset:offset,bankLength:length}=descriptor;
  if(data.byteLength!==pack.bufferBank.byteLength||!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<=0||offset%4||offset+length>data.byteLength)throw Error('Invalid wall buffer range');
  return data.slice(offset,offset+length);
 };
}
