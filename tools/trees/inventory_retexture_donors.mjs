// Inventory supplied GLBs without installing their geometry into the game.
// Usage: node tools/trees/inventory_retexture_donors.mjs [input-directory]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const input=process.argv[2]??'.cache/tree-retexture/input';
const biomes={sabana_new:'savanna',grand_river_new:'grand_river',mangrove_new:'mangrove',volcano_new:'volcanoes',canyon_new:'canyons'};
const rows=[];
for(const [folder,biome] of Object.entries(biomes)){
  const pack=JSON.parse(fs.readFileSync(`public/content/biome-${biome}.json`));
  for(const file of fs.readdirSync(path.join(input,folder)).filter(f=>f.endsWith('.glb')).sort()){
    const raw=fs.readFileSync(path.join(input,folder,file));
    if(raw.readUInt32LE(0)!==0x46546c67||raw.readUInt32LE(4)!==2||raw.readUInt32LE(8)!==raw.length)throw Error(`Invalid GLB: ${file}`);
    const gltf=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)));
    const slot=file.replace('_new.glb',''),asset=pack.assets.find(a=>a.slot===slot);
    if(!asset)throw Error(`Unknown slot ${biome}/${slot}`);
    rows.push({biome,slot,file:`${folder}/${file}`,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length,
      requiredExtensions:gltf.extensionsRequired??[],
      runtime:{vertices:asset.lods[0].position.count/3,triangles:asset.lods[0].index.count/3},
      donorPrimitives:gltf.meshes.flatMap(m=>m.primitives.map(p=>({vertices:gltf.accessors[p.attributes.POSITION].count,triangles:gltf.accessors[p.indices].count/3,attributes:Object.keys(p.attributes)}))),
      materials:gltf.materials,images:gltf.images.map(i=>({mimeType:i.mimeType,bytes:gltf.bufferViews[i.bufferView].byteLength}))});
  }
}
const out='docs/lighting/tree-near-retexture';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(`${out}/donor-inventory.json`,JSON.stringify({scope:'Container inventory only. Triangle counts do not prove surface or UV correspondence. No runtime assets changed.',assets:rows},null,2)+'\n');
console.log(`Inventoried ${rows.length} donors. Decoded surface/UV comparison is required before transfer.`);
