// Isolated QA payload codec. It preserves the Float32 corner values used by the
// runtime writer, labels and original core face IDs. JSON originals stay intact.
const magic='WGLEAF01',headerBytes=28;
export function encodeCompactLeafPayload(payload){
 const {corners,faceLabels,originalCoreFaceIds,...metadata}=payload;
 if(!Array.isArray(corners)||corners.length!==faceLabels?.length||!Array.isArray(originalCoreFaceIds))throw Error('Invalid compact leaf contract');
 const vertices=[],table=new Map(),indices=[];
 for(const face of corners){if(face.length!==3)throw Error('Invalid triangle');for(const corner of face){if(corner.length!==8||!corner.every(Number.isFinite))throw Error('Invalid corner');const f=Float32Array.from(corner);if(![...f].every(Number.isFinite))throw Error('Float32 overflow');const key=[...new Uint32Array(f.buffer)].join(',');if(!table.has(key)){table.set(key,vertices.length);vertices.push(f);}indices.push(table.get(key));}}
 if(vertices.length>65535||faceLabels.some(v=>!Number.isInteger(v)||v<0||v>255)||originalCoreFaceIds.some(v=>!Number.isInteger(v)||v<0||v>0xffffffff))throw Error('Compact payload lane overflow');
 const json=new TextEncoder().encode(JSON.stringify(metadata)),buffer=new ArrayBuffer(headerBytes+json.length+vertices.length*32+indices.length*2+faceLabels.length+originalCoreFaceIds.length*4),out=new Uint8Array(buffer),view=new DataView(buffer);
 out.set(new TextEncoder().encode(magic));[1,json.length,vertices.length,corners.length,originalCoreFaceIds.length].forEach((v,i)=>view.setUint32(8+i*4,v,true));let offset=headerBytes;out.set(json,offset);offset+=json.length;
 for(const vertex of vertices)for(const lane of vertex){view.setFloat32(offset,lane,true);offset+=4;}
 for(const index of indices){view.setUint16(offset,index,true);offset+=2;}out.set(faceLabels,offset);offset+=faceLabels.length;
 for(const id of originalCoreFaceIds){view.setUint32(offset,id,true);offset+=4;}
 return {bytes:out,counts:{vertices:vertices.length,faces:corners.length,coreIds:originalCoreFaceIds.length,metadataBytes:json.length,totalBytes:out.byteLength}};
}
export function decodeCompactLeafPayload(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.byteLength<headerBytes||new TextDecoder().decode(bytes.subarray(0,8))!==magic||view.getUint32(8,true)!==1)throw Error('Unexpected compact leaf header');
 const metadataBytes=view.getUint32(12,true),vertices=view.getUint32(16,true),faces=view.getUint32(20,true),coreIds=view.getUint32(24,true);
 if(vertices>65535||headerBytes+metadataBytes+vertices*32+faces*7+coreIds*4!==bytes.byteLength)throw Error('Invalid compact leaf lengths');
 let offset=headerBytes;const metadata=JSON.parse(new TextDecoder().decode(bytes.subarray(offset,offset+metadataBytes)));offset+=metadataBytes;
 if(['corners','faceLabels','originalCoreFaceIds'].some(k=>k in metadata))throw Error('Unexpected geometry in compact metadata');
 const rows=Array.from({length:vertices},()=>Array.from({length:8},()=>{const value=view.getFloat32(offset,true);offset+=4;if(!Number.isFinite(value))throw Error('Nonfinite compact corner');return value;}));
 const corners=Array.from({length:faces},()=>Array.from({length:3},()=>{const id=view.getUint16(offset,true);offset+=2;if(id>=rows.length)throw Error('Compact index out of bounds');return [...rows[id]];}));
 const faceLabels=Array.from(bytes.subarray(offset,offset+faces));offset+=faces;
 const originalCoreFaceIds=Array.from({length:coreIds},()=>{const value=view.getUint32(offset,true);offset+=4;return value;});
 return {...metadata,corners,faceLabels,originalCoreFaceIds};
}
