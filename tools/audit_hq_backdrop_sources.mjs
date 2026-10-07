import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Source diagnostics only: does not edit pixels or approve runtime integration.
const directory='assets-source/far-backdrops-hq';
const manifest=JSON.parse(await readFile(`${directory}/prompts.json`,'utf8'));
const assets=[];
for(const asset of manifest.assets){
 const bytes=await readFile(`${directory}/${asset.source}`);
 const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info;
 const cropTop=height-width/4;
 if(!Number.isInteger(cropTop)||cropTop<0)throw Error(`Non-integral 4:1 crop: ${asset.source}`);
 let saturatedVisible=0,saturatedHidden=0,topVisible=0,bottomTransparent=0,seamAlphaMismatch=0,seamRgbError=0,seamRgbSamples=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,a=data[i+3],saturation=Math.max(...data.subarray(i,i+3))-Math.min(...data.subarray(i,i+3));
  if(a>0&&saturation>160){if(a>=90)saturatedVisible++;else saturatedHidden++;}
  if(y<cropTop&&a>=90)topVisible++;
  if(y===height-1&&a<255)bottomTransparent++;
 }
 for(let y=cropTop;y<height;y++){
  const left=y*width*4,right=(y*width+width-1)*4;
  if((data[left+3]>=90)!==(data[right+3]>=90))seamAlphaMismatch++;
  if(data[left+3]>=90&&data[right+3]>=90){for(let c=0;c<3;c++)seamRgbError+=Math.abs(data[left+c]-data[right+c]);seamRgbSamples+=3;}
 }
 assets.push({biome:asset.biome,source:asset.source,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),width,height,channels:info.channels,cropTop,topVisibleAtRuntimeCutoff:topVisible,bottomNotFullyOpaque:bottomTransparent,saturatedVisibleAtRuntimeCutoff:saturatedVisible,saturatedBelowRuntimeCutoff:saturatedHidden,seamAlphaMismatchRows:seamAlphaMismatch,seamMeanAbsoluteRgbDifference255:seamRgbSamples?seamRgbError/seamRgbSamples:null});
}
const report={version:1,alphaCutoff:0.35,cutoffByte:90,meaning:'Read-only source diagnostics. Native seam/filtering/day-night validation pending; no acceptance inferred.',assets,totalSourceBytes:assets.reduce((n,a)=>n+a.bytes,0)};
await writeFile(`${directory}/audit.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
