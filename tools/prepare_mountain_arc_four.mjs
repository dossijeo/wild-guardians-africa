import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {hqBackdropCrop} from './experiments/hq-backdrop-frame.js';
import {auditMountainSourceColor} from './experiments/mountain-source-color.js';
const output=process.argv[2]??'.cache/hq-arc-four',sourceDirectory='assets-source/far-backdrops-hq',biome=process.argv[3]??'savanna';
if(!['savanna','grand_river','mangrove','volcanoes','canyons','desert'].includes(biome))throw Error('Unknown mountain biome');
const contract=JSON.parse(await fs.readFile(sourceDirectory+'/'+biome+'-four-export-contract.json','utf8'));
if(contract.sources?.length!==4||contract.sources.some(entry=>!entry.source.startsWith(sourceDirectory+'/'+biome+'-')||!/^[a-z_0-9\/-]+\.png$/.test(entry.source)||entry.source.includes('..')))throw Error('Invalid mountain source contract');
for(const [key,value] of Object.entries(contract.versions))if(sharp.versions[key]!==value)throw Error('Pinned encoder mismatch: '+key);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[],tiles=[];
for(const [cell,entry] of contract.sources.entries()){
 const source=entry.source,original=await fs.readFile(source),decoded=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(hash(original)!==entry.sha256)throw Error('Source contract mismatch: '+source);
 const rightPadding=entry.rightPadding??0,crop=hqBackdropCrop(decoded.data,decoded.info.width,decoded.info.height,{rightPadding});
 const {lowest,visibleSaturated:extreme,interiorSaturated,interiorExamples}=auditMountainSourceColor(decoded.data,decoded.info.width,decoded.info.height);
 // Sharp schedules extract before extend in one pipeline; materialize padding
 // first so the 2172-wide crop includes the added transparent source column.
 const framed=sharp(rightPadding?await sharp(original).extend({right:rightPadding,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer():original);
 const input=await framed.extract(crop).resize(960,240,{kernel:'lanczos3'}).png().toBuffer();
 const left=32+(cell%2)*1024,top=8+Math.floor(cell/2)*256;
 tiles.push({input,left,top});
 if(entry.heightScale!==undefined&&(!Number.isFinite(entry.heightScale)||entry.heightScale<.5||entry.heightScale>1.5))throw Error('Invalid mountain cell height scale');
 assets.push({cell,source,sourceSha256:hash(original),...(rightPadding?{rightPadding}:{}),...(entry.heightScale!==undefined?{heightScale:entry.heightScale}:{}),crop,tile:[left,top,960,240],uv:[left/2048,1-(top+240)/512,(left+960)/2048,1-top/512],baseline:(crop.height-(lowest-crop.top))/crop.height,extremeVisible:extreme,...(interiorSaturated?{interiorSaturated,interiorColorExamples:interiorExamples}:{})});
}
const atlas=await sharp({create:{width:2048,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true,effort:6}).toBuffer();
if(hash(atlas)!==contract.outputSha256||atlas.length!==contract.outputBytes)throw Error('Encoded atlas differs from reviewed recipe');
await fs.mkdir(output,{recursive:true});await fs.writeFile(output+'/atlas.webp',atlas);
await fs.writeFile(output+'/cells.json',JSON.stringify(assets,null,2)+'\n');
const receipt={version:1,dimensions:[2048,512],tileDimensions:[960,240],padding:[32,8],bytes:atlas.length,atlasSha256:hash(atlas),versions:{sharp:sharp.versions.sharp,vips:sharp.versions.vips,webp:sharp.versions.webp},assets,limit:'Four populated candidate cells; native composition and cross-variant mip filtering still pending.'};
const {assets:sourceAssets,...summary}=receipt;
await fs.writeFile(output+'/export.json',JSON.stringify({...summary,sourceAssets,assets:[{biome,file:'atlas.webp'}]},null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
