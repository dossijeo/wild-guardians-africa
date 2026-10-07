import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {validateFarAtlasRecipe} from './experiments/far-atlas-recipe.js';
const input='.cache/far-atlas-bakes',output='public/assets/far-vegetation';
const reviewed=JSON.parse(await fs.readFile('public/content/far-vegetation.json','utf8'));
// Validate every pair before any public write. The legacy cache has an obsolete sun.
for(const [biome,species] of Object.entries(reviewed.biomes))for(const reference of species){
 const day=JSON.parse(await fs.readFile(`${input}/${biome}-${reference.slot}-day.json`,'utf8')),night=JSON.parse(await fs.readFile(`${input}/${biome}-${reference.slot}-night.json`,'utf8'));
 validateFarAtlasRecipe(day,night,reference,reviewed.sunPosition);
 if(reference.prelitAlphaEncoding)throw Error('Linear-alpha atlas requires the exact RGBA encoder documented in docs/qa/far-prelit-linear-alpha; this legacy Sharp packer cannot replace it');
}
await fs.mkdir(output,{recursive:true});let bytes=0,edgeCells=0;const manifest={version:1,views:8,orientations:8,resolution:128,bakedLod:2,elevationDegrees:8,sunPosition:reviewed.sunPosition,biomes:{}};
for(const biome of ['savanna','grand_river','mangrove','volcanoes','canyons','desert']){
 const slots=biome==='canyons'?[0,1]:[0,1,2,3];manifest.biomes[biome]=[];
 for(const slot of slots){
  const day=JSON.parse(await fs.readFile(`${input}/${biome}-${slot}-day.json`,'utf8')),night=JSON.parse(await fs.readFile(`${input}/${biome}-${slot}-night.json`,'utf8'));
  if(day.errors.length||night.errors.length||day.webglError||night.webglError)throw Error('Bake errors');
  for(const key of ['localBase','impostorWidth','impostorHeight','sourceBounds','baseV'])if(JSON.stringify(day[key])!==JSON.stringify(night[key]))throw Error('Phase frame mismatch');
  const urls={};for(const phase of ['day','night']){const file=`${biome}-${slot}-${phase}.webp`;await sharp(`${input}/${biome}-${slot}-${phase}.png`).webp({lossless:true,effort:6}).toFile(path.join(output,file));const stat=await fs.stat(path.join(output,file));bytes+=stat.size;urls[phase]=`./assets/far-vegetation/${file}`;}
  edgeCells+=day.cells.filter(c=>c.minX===0||c.minY===0||c.maxX===127||c.maxY===127).length;
  const {cells,errors,webglError,drawCallsPerView,...metadata}=day;manifest.biomes[biome].push({...metadata,day:urls.day,night:urls.night});
 }
}
manifest.totalTextureBytes=bytes;await fs.writeFile('public/content/far-vegetation.json',JSON.stringify(manifest,null,2)+'\n');console.log({atlases:44,bytes,edgeCells});
