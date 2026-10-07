import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {hqBackdropCrop} from './experiments/hq-backdrop-frame.js';
const output=process.argv[2]??'.cache/hq-arc-four',sourceDirectory='assets-source/far-backdrops-hq';
const names=['savanna-isolated-v3','savanna-ridge-b-v1','savanna-ridge-c-v1','savanna-ridge-d-v1'];
const contract=JSON.parse(await fs.readFile(sourceDirectory+'/savanna-four-export-contract.json','utf8'));
for(const [key,value] of Object.entries(contract.versions))if(sharp.versions[key]!==value)throw Error('Pinned encoder mismatch: '+key);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[],tiles=[];
for(const [cell,name] of names.entries()){
 const source=sourceDirectory+'/'+name+'.png',original=await fs.readFile(source),decoded=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(hash(original)!==contract.sources[cell]?.sha256||source!==contract.sources[cell]?.source)throw Error('Source contract mismatch: '+name);
 const crop=hqBackdropCrop(decoded.data,decoded.info.width,decoded.info.height);
 let lowest=-1,extreme=0;
 for(let y=0;y<decoded.info.height;y++)for(let x=0;x<decoded.info.width;x++){
  const i=(y*decoded.info.width+x)*4;if(decoded.data[i+3]<90)continue;lowest=Math.max(lowest,y);
  if(Math.max(decoded.data[i],decoded.data[i+1],decoded.data[i+2])-Math.min(decoded.data[i],decoded.data[i+1],decoded.data[i+2])>160)extreme++;
 }
 if(extreme)throw Error('Visible source fringe in '+name);
 const input=await sharp(original).extract(crop).resize(960,240,{kernel:'lanczos3'}).png().toBuffer();
 const left=32+(cell%2)*1024,top=8+Math.floor(cell/2)*256;
 tiles.push({input,left,top});
 assets.push({cell,source,sourceSha256:hash(original),crop,tile:[left,top,960,240],uv:[left/2048,1-(top+240)/512,(left+960)/2048,1-top/512],baseline:(crop.height-(lowest-crop.top))/crop.height,extremeVisible:extreme});
}
const atlas=await sharp({create:{width:2048,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true,effort:6}).toBuffer();
if(hash(atlas)!==contract.outputSha256||atlas.length!==contract.outputBytes)throw Error('Encoded atlas differs from reviewed recipe');
await fs.mkdir(output,{recursive:true});await fs.writeFile(output+'/atlas.webp',atlas);
await fs.writeFile(output+'/cells.json',JSON.stringify(assets,null,2)+'\n');
const receipt={version:1,dimensions:[2048,512],tileDimensions:[960,240],padding:[32,8],bytes:atlas.length,atlasSha256:hash(atlas),versions:{sharp:sharp.versions.sharp,vips:sharp.versions.vips,webp:sharp.versions.webp},assets,limit:'Four populated candidate cells; native composition and cross-variant mip filtering still pending.'};
const {assets:sourceAssets,...summary}=receipt;
await fs.writeFile(output+'/export.json',JSON.stringify({...summary,sourceAssets,assets:[{biome:'savanna',file:'atlas.webp'}]},null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
