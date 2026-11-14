// Rewrite only embedded image references; geometry, materials and animation
// data stay in the original GLB buffer. Decoded images are transferred to the
// renderer owner, where GLTFLoader still constructs textures and samplers.
export async function prepareEmbeddedGlb(bytes,{signal,decode=(blob)=>createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'})}={}){
 const cancelled=()=>new DOMException('GLB preparation cancelled','AbortError');
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<28||typeof decode!=='function')throw TypeError('Invalid embedded GLB');
 if(signal?.aborted)throw cancelled();const input=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=input.getUint32(8,true),jsonLength=input.getUint32(12,true),binHeader=20+jsonLength;
 if(input.getUint32(0,true)!==0x46546c67||input.getUint32(4,true)!==2||length!==bytes.byteLength||jsonLength%4||binHeader+8>length||input.getUint32(16,true)!==0x4e4f534a||input.getUint32(binHeader+4,true)!==0x004e4942||binHeader+8+input.getUint32(binHeader,true)!==length)throw Error('Invalid embedded GLB header');
 const json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(20,binHeader))),images=json.images??[],views=json.bufferViews??[],binary=bytes.subarray(binHeader+8);
 if(!Array.isArray(images)||!images.length||images.length>64||!Array.isArray(views))throw Error('Unsupported embedded GLB images');
 const blobs=images.map(image=>{const view=views[image?.bufferView],start=view?.byteOffset??0,size=view?.byteLength;if(!view||view.buffer!==0||!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(size)||size<1||start+size>binary.length||!['image/png','image/jpeg','image/webp'].includes(image.mimeType)||image.uri!==undefined)throw Error('Unsupported embedded GLB image');return new Blob([binary.subarray(start,start+size)],{type:image.mimeType});});
 const created=[],results=await Promise.allSettled(blobs.map(async blob=>{const bitmap=await decode(blob);if(!bitmap||typeof bitmap.close!=='function')throw Error('Invalid decoded GLB image');created.push(bitmap);return bitmap;}));
 const failure=results.find(result=>result.status==='rejected');if(failure||signal?.aborted){for(const bitmap of created)bitmap.close();if(signal?.aborted)throw cancelled();throw failure.reason;}
 try{
  for(let i=0;i<images.length;i++){delete images[i].bufferView;delete images[i].mimeType;images[i].uri=`data:application/x-wg-bitmap,${i}`;}
  const text=new TextEncoder().encode(JSON.stringify(json)),padded=(text.length+3)&~3,output=new Uint8Array(28+padded+binary.length),header=new DataView(output.buffer);
  header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,output.length,true);header.setUint32(12,padded,true);header.setUint32(16,0x4e4f534a,true);output.fill(32,20,20+padded);output.set(text,20);header.setUint32(20+padded,binary.length,true);header.setUint32(24+padded,0x004e4942,true);output.set(binary,28+padded);
  return {buffer:output.buffer,images:results.map(result=>result.value)};
 }catch(error){for(const bitmap of created)bitmap.close();throw error;}
}
