import fs from 'node:fs';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

// Inspect authored inputs without loading textures or attributing runtime keys.
const file='public'+ANIMAL_ACTIONS.animals.warthog.url,bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+jsonLength));
const materials=gltf.materials.map((m,index)=>({index,name:m.name,doubleSided:!!m.doubleSided,normalMap:!!m.normalTexture,baseColorMap:!!m.pbrMetallicRoughness?.baseColorTexture,extensions:Object.keys(m.extensions??{}),baseColorFactor:m.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1],roughness:m.pbrMetallicRoughness?.roughnessFactor??1}));
const meshes=gltf.meshes.map(m=>({name:m.name,primitives:m.primitives.map(p=>({material:p.material,attributes:Object.keys(p.attributes)}))}));
const result={file,scope:'Authored glTF inputs only; does not establish which runtime material owns a compiled program.',materials,meshes};
if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
