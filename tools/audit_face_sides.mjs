import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import sharp from 'sharp';
import {auditSidedness} from './mesh-sidedness.mjs';

const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const types={'<f4':Float32Array,'<u2':Uint16Array,'<u4':Uint32Array};
const report={method:'Conservative audit: exact-position weld, two opposite directed faces per edge, no degenerate triangles, positive signed volume for every connected component. Passing is not visual approval; rejection does not prove DoubleSide is required.',biomes:[]};
for(const biome of biomes){
  const pack=JSON.parse(await readFile(`public/content/biome-${biome}.json`,'utf8'));
  const binary=await readFile('public'+pack.binary.url);
  const buffer=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength);
  const array=d=>new types[d.type](buffer,d.offset,d.count);
  const atlas=pack.textures.find(t=>t.role==='baseColor').base64.url;
  const atlasBytes=await readFile('public'+atlas),opaque=(await sharp(atlasBytes).stats()).isOpaque;
  const assets=pack.assets.map((asset,slot)=>{
    const lods=asset.lods.map(lod=>auditSidedness(array(lod.position),array(lod.index)));
    return {slot,name:asset.name,lods,colorTopologyEligible:opaque&&lods.every(lod=>lod.closedOutward),solidShadowTopologyEligible:lods.at(-1).closedOutward};
  });
  report.biomes.push({biome,binary:pack.binary.url,binarySha256:createHash('sha256').update(binary).digest('hex'),atlas,atlasSha256:createHash('sha256').update(atlasBytes).digest('hex'),atlasOpaque:opaque,assets});
}
const assets=report.biomes.flatMap(b=>b.assets);
report.summary={assets:assets.length,lods:assets.flatMap(a=>a.lods).length,closedOutwardLods:assets.flatMap(a=>a.lods).filter(l=>l.closedOutward).length,colorTopologyEligible:assets.filter(a=>a.colorTopologyEligible).length,solidShadowTopologyEligible:assets.filter(a=>a.solidShadowTopologyEligible).length};
const output=process.argv[2];
if(output){await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report.summary));
for(const biome of report.biomes)console.log(biome.biome, 'opaque='+biome.atlasOpaque,JSON.stringify(biome.assets.filter(a=>a.colorTopologyEligible||a.solidShadowTopologyEligible).map(a=>({slot:a.slot,name:a.name,color:a.colorTopologyEligible,shadow:a.solidShadowTopologyEligible}))));
