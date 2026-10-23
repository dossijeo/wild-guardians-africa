// Small glTF ground primitive; uses Filament's built-in glTF material provider.
export function groundGLB(size=8) {
  const positions=new Float32Array([-size,0,-size,-size,0,size,size,0,size,size,0,-size]);
  const normals=new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]);
  const indices=new Uint16Array([0,1,2,0,2,3]);
  const bin=new Uint8Array(108);bin.set(new Uint8Array(positions.buffer));bin.set(new Uint8Array(normals.buffer),48);bin.set(new Uint8Array(indices.buffer),96);
  const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:'Ground'}],
    meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0}]}],
    materials:[{pbrMetallicRoughness:{baseColorFactor:[.42,.31,.12,1],metallicFactor:0,roughnessFactor:1}}],
    buffers:[{byteLength:108}],bufferViews:[{buffer:0,byteOffset:0,byteLength:48,target:34962},{buffer:0,byteOffset:48,byteLength:48,target:34962},{buffer:0,byteOffset:96,byteLength:12,target:34963}],
    accessors:[{bufferView:0,componentType:5126,count:4,type:'VEC3',min:[-size,0,-size],max:[size,0,size]},
      {bufferView:1,componentType:5126,count:4,type:'VEC3'},{bufferView:2,componentType:5123,count:6,type:'SCALAR'}]};
  let json=new TextEncoder().encode(JSON.stringify(gltf));
  const padded=new Uint8Array((json.length+3)&~3);padded.fill(32);padded.set(json);json=padded;
  const result=new Uint8Array(12+8+json.length+8+bin.length),header=new DataView(result.buffer);
  [0x46546c67,2,result.length,json.length,0x4e4f534a].forEach((v,i)=>header.setUint32(i*4,v,true));
  result.set(json,20);header.setUint32(20+json.length,bin.length,true);header.setUint32(24+json.length,0x004e4942,true);result.set(bin,28+json.length);
  return result;
}
