import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {Scene} from 'three';
import {prepareNativeBuilding,NativeBuilding} from '../../src/rendering/buildings.js';
import {captureStructureTemplate} from '../../src/simulation/worker-structure-geometry.js';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Strip only texture/material declarations from a copy for headless GLTFLoader.
// Geometry, buffers, node transforms and authored metadata remain identical.
export async function authoredCenterTemplate(descriptor,{assetPath='public'+descriptor.url}={}){
 const original=await readFile(assetPath),jsonLength=original.readUInt32LE(12),json=JSON.parse(original.subarray(20,20+jsonLength));
 if(original.toString('ascii',0,4)!=='glTF'||original.readUInt32LE(4)!==2||json.meshes?.length!==1||json.meshes[0].primitives?.length!==1)throw Error('Unsupported authored building GLB');
 const offset=20+jsonLength,binaryLength=original.readUInt32LE(offset);if(original.toString('ascii',offset+4,offset+8)!=='BIN\0')throw Error('Missing GLB binary');const binary=original.subarray(offset+8,offset+8+binaryLength);
 delete json.images;delete json.textures;delete json.samplers;json.materials=[{}];json.meshes[0].primitives[0].material=0;
 const source=Buffer.from(JSON.stringify(json)),padded=Buffer.concat([source,Buffer.alloc((4-source.length%4)%4,32)]),glb=Buffer.alloc(28+padded.length+binary.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(padded.length,12);glb.write('JSON',16);padded.copy(glb,20);const at=20+padded.length;glb.writeUInt32LE(binary.length,at);glb.write('BIN\0',at+4);binary.copy(glb,at+8);
 const gltf=await new Promise((resolve,reject)=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'',resolve,reject));
 const template=prepareNativeBuilding(gltf,descriptor),pipeline={target:{},smokeDepth:{},smokeScene:new Scene(),add(){},remove(){}};let building;
 try{building=new NativeBuilding(template,{id:'worker-template',kind:'center',status:'intact',hp:1,maxHp:1,yaw:0},pipeline,0);const {url,...parameters}=descriptor;return {descriptorSha256:digest(JSON.stringify(parameters)),modelSha256:digest(original),modelUrl:descriptor.url,template:captureStructureTemplate(building)};}
 finally{building?.dispose();template.dispose();}
}
