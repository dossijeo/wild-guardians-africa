// Package verified corner UVs and the donor's explicitly assigned textures.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const inventory=JSON.parse(fs.readFileSync('docs/lighting/tree-near-retexture/donor-inventory.json'));
const audit=JSON.parse(fs.readFileSync('docs/lighting/tree-near-retexture/surface-audit.json'));
const packs=new Map();
for(const row of inventory.assets){
 const proof=audit.assets.find(a=>a.biome===row.biome&&a.slot===row.slot);
 if(!proof?.stagedCornerUVs)throw Error(`Unverified correspondence: ${row.file}`);
 const raw=fs.readFileSync(path.join('.cache/tree-retexture/input',row.file));
 if(sha(raw)!==row.sha256)throw Error(`Changed donor: ${row.file}`);
 const size=raw.readUInt32LE(12),gltf=JSON.parse(raw.subarray(20,20+size)),binary=raw.subarray(28+size);
 const material=gltf.materials[gltf.meshes[0].primitives[0].material],pbr=material.pbrMetallicRoughness;
 const url=`/content/trees-near/${row.biome}/${row.slot}`,dir=`public${url}`;
 fs.mkdirSync(dir,{recursive:true});
 const textures={};
 for(const [role,info] of Object.entries({baseColor:pbr.baseColorTexture,metallicRoughness:pbr.metallicRoughnessTexture})){
  if(!info)continue;
  if(info.texCoord||info.extensions)throw Error('Unsupported donor texture transform');
  const texture=gltf.textures[info.index],image=gltf.images[texture.extensions?.EXT_texture_webp?.source??texture.source];
  if(image.mimeType!=='image/webp')throw Error('Expected embedded WebP');
  const view=gltf.bufferViews[image.bufferView],bytes=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  fs.writeFileSync(`${dir}/${role}.webp`,bytes);textures[role]=`${url}/${role}.webp`;
 }
 if(!textures.baseColor)throw Error('Missing donor base color');
 const uv=fs.readFileSync(proof.stagedCornerUVs);
 const manifest=`public/content/biome-${row.biome}.json`;
 if(!packs.has(manifest))packs.set(manifest,JSON.parse(fs.readFileSync(manifest)));
 const pack=packs.get(manifest),asset=pack.assets.find(a=>a.slot===row.slot);
 if(uv.length!==asset.lods[0].index.count*8)throw Error('Corner UV count mismatch');
 fs.writeFileSync(`${dir}/corner-uv.bin`,uv);
 const shrub=row.slot.startsWith('shrub');
 asset.nearTextures={cornerUV:`${url}/corner-uv.bin`,textures,distance:shrub?12:28,blendStart:shrub?6:18,blendEnd:shrub?10:26,donorSHA256:row.sha256};
}
for(const [file,pack]of packs)fs.writeFileSync(file,JSON.stringify(pack)+'\n');
console.log(`Packaged ${inventory.assets.length} near texture sets; tree blend 18–26 m, shrub blend 6–10 m, with 2 m packing margin.`);
