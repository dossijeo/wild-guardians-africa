import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Real glTF skin/morph geometry, including compressed candidate files. Only
// texture references are removed so Node does not need a browser image decoder.
export async function actorAsset(file){
 const bytes=fs.readFileSync(file),n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n));
 for(const m of g.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.extensions;}
 const json=Buffer.from(JSON.stringify(g)),size=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+n),out=Buffer.alloc(20+size+bin.length,32);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(size,12);json.copy(out,20);bin.copy(out,20+size);
 await MeshoptDecoder.ready;return await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.length),'');
}

export async function actorGeometry(file){return (await actorAsset(file)).scene;}
