export function readGlb(data) {
  const bytes=new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length)throw Error('Invalid GLB 2 container');
  let json,bin;
  for(let offset=12;offset<bytes.length;){const size=view.getUint32(offset,true),type=view.getUint32(offset+4,true);if(type===0x4e4f534a)json=JSON.parse(new TextDecoder().decode(bytes.subarray(offset+8,offset+8+size)));if(type===0x004e4942)bin=bytes.subarray(offset+8,offset+8+size);offset+=8+size;}
  return {json,bin};
}
export function writeGlb(json,bin) {
  const text=new TextEncoder().encode(JSON.stringify(json)),jsonSize=Math.ceil(text.length/4)*4,binSize=Math.ceil(bin.length/4)*4;
  const bytes=new Uint8Array(28+jsonSize+binSize),view=new DataView(bytes.buffer);
  view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);view.setUint32(12,jsonSize,true);view.setUint32(16,0x4e4f534a,true);
  bytes.fill(32,20,20+jsonSize);bytes.set(text,20);view.setUint32(20+jsonSize,binSize,true);view.setUint32(24+jsonSize,0x004e4942,true);bytes.set(bin,28+jsonSize);return bytes;
}
