export const remoteResourceBatchLimit=4;
const bufferDescriptorFields=new Set(['size','usage','mappedAtCreation','label']);

// Frame, fence, mutation and asynchronous pipeline requests keep their
// individual envelopes. Only small, ordered buffer lifetime jobs share a send.
export function isRemoteResourceBatchItem(message){
 if(!message||Object.hasOwn(message,'transportSequence')||Object.hasOwn(message,'requestId'))return false;
 const type=message.type;
 if(type==='destroy'||type==='release')return typeof message.id==='string'&&message.id.length<=128;
 if(type==='create'){
  const descriptor=message.descriptor;
  return message.method==='createBuffer'&&descriptor&&typeof message.id==='string'&&message.id.length<=128&&
   Object.keys(descriptor).every(key=>bufferDescriptorFields.has(key))&&
   Number.isSafeInteger(descriptor.size)&&Number.isSafeInteger(descriptor.usage)&&
   (descriptor.label===undefined||typeof descriptor.label==='string'&&descriptor.label.length<=1024)&&
   (descriptor.mappedAtCreation===undefined||typeof descriptor.mappedAtCreation==='boolean');
 }
 const bytes=type==='unmap'?message.bytes:
  type==='operation'&&message.op?.method==='writeBuffer'?message.op.args?.[2]?.buffer:null;
 return bytes instanceof ArrayBuffer&&bytes.byteLength<=64*1024;
}
