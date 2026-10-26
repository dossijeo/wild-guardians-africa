import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='docs/qa/tree-atlas-refresh-20261026';
const manifest=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
const records=[];
for(const biome of ['savanna','grand_river','mangrove','desert','volcanoes']){
 for(let slot=0;slot<4;slot++){
  const dir=`${root}/${biome}-${slot}`, pair=[];
  for(const phase of ['day','night']){
   const bake=JSON.parse(await fs.readFile(`${dir}/${phase}.json`,'utf8'));
   if(bake.errors.length||bake.source.errors.length||bake.source.webglError||!bake.source.nativeSunDirection||bake.source.cells.length!==64)throw Error('Invalid bake');
   const image=await sharp(`${dir}/${phase}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(image.info.width!==2048||image.info.height!==2048)throw Error('Invalid atlas size');
   const bytes=await sharp(`${dir}/${phase}.png`).webp({lossless:true,effort:6}).toBuffer();
   await fs.writeFile(`${dir}/${phase}.webp`,bytes);
   pair.push(bake);
   records.push({biome,slot,phase,bytes:bytes.length,sourceTriangles:bake.source.sourceTriangles});
  }
  for(const key of ['localBase','sourceBounds','impostorWidth','impostorHeight','baseV'])if(JSON.stringify(pair[0].source[key])!==JSON.stringify(pair[1].source[key]))throw Error('Day/night frame mismatch');
  const metadata={...pair[0].source,viewResolution:256,atlasWidth:2048,atlasHeight:2048,prelitAlphaEncoding:pair[0].output.encoding,
   day:`/${dir}/day.webp`,night:`/${dir}/night.webp`};
  delete metadata.cells;
  manifest.biomes[biome][slot]=metadata;
 }
}
// Per-species dimensions are intentional: Canyon retains original 128px cells.
manifest.resolution=256;
await fs.writeFile(`${root}/candidate-manifest.json`,JSON.stringify(manifest,null,2));
await fs.writeFile(`${root}/candidate-manifest-256.json`,JSON.stringify(manifest,null,2));
await fs.writeFile(`${root}/bake-summary.json`,JSON.stringify({records,totalBytes:records.reduce((n,r)=>n+r.bytes,0),productionActivated:false},null,2));
console.log(JSON.stringify({atlases:records.length,totalBytes:records.reduce((n,r)=>n+r.bytes,0)}));
