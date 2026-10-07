import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {hqBackdropCrop} from './experiments/hq-backdrop-frame.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const output=process.argv[2]??'.cache/hq-backdrops';
const sourceDirectory='assets-source/far-backdrops-hq';
const contract=JSON.parse(await fs.readFile(sourceDirectory+'/export-contract.json','utf8'));
for(const [key,value] of Object.entries(contract.versions))if(sharp.versions[key]!==value)throw Error(`Encoder version mismatch: ${key}`);
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const results=[];
for(const biome of biomes){
 const source=`${sourceDirectory}/${biome}-${biome==='desert'?'v2':'v1'}.png`,original=await fs.readFile(source);
 const expected=contract.assets.find(asset=>asset.biome===biome);
 if(!expected||expected.source!==source||expected.sourceSha256!==hash(original))throw Error(`Source hash mismatch: ${biome}`);
 const decoded=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=decoded.info,crop=hqBackdropCrop(decoded.data,width,height),cropTop=crop.top;
 const webp=await sharp(original).extract(crop).resize(2048,512,{kernel:'lanczos3'}).webp({lossless:true,effort:6}).toBuffer();
 const image=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(image.info.width!==2048||image.info.height!==512)throw Error('Wrong runtime dimensions');
 if(hash(webp)!==expected.sha256||webp.length!==expected.bytes)throw Error(`Export differs from reviewed candidate: ${biome}`);
 results.push({biome,source,sourceSha256:hash(original),sourceDimensions:[width,height],crop:[0,cropTop,width,height-cropTop],dimensions:[2048,512],bytes:webp.length,sha256:hash(webp),webp});
}
await fs.mkdir(output,{recursive:true});
for(const record of results)await fs.writeFile(path.join(output,record.biome+'-backdrop.webp'),record.webp);
const receipt={version:1,versions:{sharp:sharp.versions.sharp,vips:sharp.versions.vips,webp:sharp.versions.webp},method:'transparent-top crop, uniform Lanczos3 reduction, lossless WebP effort6',alphaCutoff:.35,textureWrap:'mirrored cylindrical 0..2',totalBytes:results.reduce((n,r)=>n+r.bytes,0),assets:results.map(({webp,...record})=>record),estimatedActiveRgbaMipBytes:2048*512*4*4/3};
await fs.writeFile(path.join(output,'export.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
