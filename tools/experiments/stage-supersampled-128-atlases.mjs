import fs from 'node:fs/promises';
import sharp from 'sharp';
import {downsamplePrelitLinear} from './downsample-prelit-linear.js';
const root='docs/qa/tree-atlas-refresh-20261026';
const manifest=JSON.parse(await fs.readFile(`${root}/candidate-manifest-256.json`,'utf8'));
let bytes=0;
for(const biome of ['savanna','grand_river','mangrove','desert','volcanoes'])for(let slot=0;slot<4;slot++){
 const dir=`${root}/${biome}-${slot}`,tree=manifest.biomes[biome][slot];
 tree.viewResolution=128;tree.atlasWidth=tree.atlasHeight=1024;
 for(const phase of ['day','night']){
  const source=await sharp(`${dir}/${phase}-source.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const filtered=downsamplePrelitLinear(source.data,source.info.width,source.info.height,4);
  const encoded=await sharp(filtered.data,{raw:{width:filtered.width,height:filtered.height,channels:4}}).webp({lossless:true,exact:true,effort:4}).toBuffer();
  await fs.writeFile(`${dir}/${phase}-128.webp`,encoded);bytes+=encoded.length;
  tree[phase]=`/${dir}/${phase}-128.webp`;
 }
}
manifest.resolution=128;
await fs.writeFile(`${root}/candidate-manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({atlases:40,totalBytes:bytes,viewResolution:128,sourceResolution:512}));
