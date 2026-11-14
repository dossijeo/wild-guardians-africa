// Rebuild missing authored bounds from all packed LOD positions. No mesh data
// is changed. Run: node tools/guardian-biome-bounds.mjs [--write]
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export function calculateGuardianBounds(asset,binary){
 if(!Array.isArray(asset?.lods)||!asset.lods.length)throw Error('Missing biome LODs');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const lod of asset.lods){const p=lod.position;if(p?.type!=='<f4'||!Number.isSafeInteger(p.offset)||p.offset<0||!Number.isSafeInteger(p.count)||p.count<=0||p.count%3||p.offset+p.count*4>binary.length)throw Error('Invalid biome position data');
  for(let i=0;i<p.count;i++){const value=binary.readFloatLE(p.offset+i*4);if(!Number.isFinite(value))throw Error('Non-finite biome position');const axis=i%3;min[axis]=Math.min(min[axis],value);max[axis]=Math.max(max[axis],value);}}
 return {min,max};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const write=process.argv.includes('--write');
 for(const biome of ['mangrove','canyons','desert']){
  const path=`public/content/biome-${biome}.json`,pack=JSON.parse(readFileSync(path,'utf8'));
  if(!/^\/assets\/[a-zA-Z0-9_./-]+\.bin$/.test(pack.binary?.url??''))throw Error('Invalid biome binary path');
  const binary=readFileSync('public'+pack.binary.url);let updated=0;
  for(const asset of pack.assets)if(asset.min===undefined&&asset.max===undefined){Object.assign(asset,calculateGuardianBounds(asset,binary));updated++;}
  if(write&&updated)writeFileSync(path,JSON.stringify(pack));
  console.log(`${biome}: ${updated} missing bounds${write?' written':''}`);
 }
}
