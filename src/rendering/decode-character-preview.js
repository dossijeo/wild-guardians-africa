import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const MESHOPT='EXT_meshopt_compression',MAX_DECODED_BYTES=256*1024*1024;
const cancelled=()=>new DOMException('Character preview cancelled','AbortError');
const align4=value=>(value+3)&~3;

// Repack only the verified preview GLB. Preserve nodes, accessors, materials,
// skins and clips; move each decoded buffer view into a single GLB buffer.
export async function decodeCharacterPreview(bytes,{signal,decoder=MeshoptDecoder}={}){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<28)throw TypeError('Invalid character preview GLB');
 if(signal?.aborted)throw cancelled();
 const input=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=input.getUint32(8,true),jsonLength=input.getUint32(12,true);
 if(input.getUint32(0,true)!==0x46546c67||input.getUint32(4,true)!==2||length!==bytes.byteLength||jsonLength%4||20+jsonLength+8>length||input.getUint32(16,true)!==0x4e4f534a)throw Error('Invalid character preview GLB header');
 const binHeader=20+jsonLength,binLength=input.getUint32(binHeader,true);if(input.getUint32(binHeader+4,true)!==0x004e4942||binHeader+8+binLength!==length)throw Error('Invalid character preview GLB buffer');
 const json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,binHeader))),views=json.bufferViews??[];
 if(!Array.isArray(views))throw Error('Invalid character preview buffer views');if(!views.some(view=>view?.extensions?.[MESHOPT]))return bytes;
 if(!decoder?.supported||!decoder.ready||typeof decoder.decodeGltfBuffer!=='function')throw Error('Meshopt decoder unavailable');await decoder.ready;if(signal?.aborted)throw cancelled();
 const binary=bytes.subarray(binHeader+8),parts=[];let total=0;
 for(let index=0;index<views.length;index++){
  if(signal?.aborted)throw cancelled();const view=views[index],ext=view?.extensions?.[MESHOPT],source=ext??view,start=source?.byteOffset??0,size=source?.byteLength;
  if(!view||source?.buffer!==0||!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(size)||size<0||start+size>binary.length)throw Error('Invalid character preview buffer view');
  let decoded=size;if(ext){const count=ext.count,stride=ext.byteStride;decoded=count*stride;if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(stride)||stride<1||!Number.isSafeInteger(decoded)||decoded!==view.byteLength||decoded>MAX_DECODED_BYTES-total)throw Error('Invalid decoded character buffer size');delete view.extensions[MESHOPT];if(!Object.keys(view.extensions).length)delete view.extensions;}
  const padded=align4(decoded);if(total+padded>MAX_DECODED_BYTES)throw Error('Decoded character preview exceeds limit');view.buffer=0;view.byteOffset=total;view.byteLength=decoded;parts.push({start,size,offset:total,decoded,ext});total+=padded;
  // Let cancellation and other package requests through on this shared worker.
  if((index+1)%128===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(signal?.aborted)throw cancelled();for(const key of ['extensionsUsed','extensionsRequired'])if(Array.isArray(json[key]))json[key]=json[key].filter(name=>name!==MESHOPT);const primary={...json.buffers?.[0],byteLength:total};delete primary.uri;if(primary.extensions?.[MESHOPT]){primary.extensions={...primary.extensions};delete primary.extensions[MESHOPT];if(!Object.keys(primary.extensions).length)delete primary.extensions;}json.buffers=[primary];
 const text=new TextEncoder().encode(JSON.stringify(json)),paddedJson=align4(text.byteLength),output=new Uint8Array(28+paddedJson+total),header=new DataView(output.buffer);header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,output.byteLength,true);header.setUint32(12,paddedJson,true);header.setUint32(16,0x4e4f534a,true);output.fill(32,20,20+paddedJson);output.set(text,20);header.setUint32(20+paddedJson,total,true);header.setUint32(24+paddedJson,0x004e4942,true);const base=28+paddedJson;
 for(let index=0;index<parts.length;index++){if(signal?.aborted)throw cancelled();const part=parts[index],source=binary.subarray(part.start,part.start+part.size),target=output.subarray(base+part.offset,base+part.offset+part.decoded);if(part.ext)decoder.decodeGltfBuffer(target,part.ext.count,part.ext.byteStride,source,part.ext.mode,part.ext.filter??'NONE');else target.set(source);if((index+1)%128===0)await new Promise(resolve=>setTimeout(resolve,0));}
 if(signal?.aborted)throw cancelled();return output;
}
