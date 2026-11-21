import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const [webpDir,bc7Dir,webpReport,bc7Report,mixedReport,output]=process.argv.slice(2);if(!mixedReport)throw Error('Usage: node compare_uber_grass_formats.mjs WEBP_DIR BC7_DIR WEBP_REPORT BC7_REPORT MIXED_REPORT [OUTPUT]');
const [webp,bc7,mixed]=await Promise.all([webpReport,bc7Report,mixedReport].map(async path=>JSON.parse(await readFile(path,'utf8'))));
for(const run of [webp,bc7,mixed])if(run.backend!=='WebGPU real'||run.errors.length||run.frames.length!==8||!run.shared)throw Error('Incomplete shared-material run');
if(webp.textureFormat!=='webp'||bc7.textureFormat!=='native-bc7'||mixed.textureFormat!=='mixed')throw Error('Unexpected formats');
const comparisons=[];for(let i=0;i<8;i++){
 const a=webp.frames[i],b=bc7.frames[i],c=mixed.frames[i];if([b,c].some(v=>v.biome!==a.biome||v.frame!==a.frame||v.drawCalls!==a.drawCalls||v.triangles!==a.triangles))throw Error(`Mismatched scene ${i}`);
 if(c.sha256!==(a.biome==='sabana'?a.sha256:b.sha256))throw Error(`Mixed formats returned wrong texture at frame ${i}`);
 const x=await sharp(`${webpDir}/${i}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true}),y=await sharp(`${bc7Dir}/${i}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});if(x.info.width!==y.info.width||x.info.height!==y.info.height||x.info.channels!==3||y.info.channels!==3)throw Error('Image format mismatch');
 let total=0,foreground=0,count=0,above10=0,max=0;for(let j=0;j<x.data.length;j+=3){const visible=x.data[j]!==x.data[0]||x.data[j+1]!==x.data[1]||x.data[j+2]!==x.data[2];let rgb=0,pixel=0;for(let channel=0;channel<3;channel++){const d=Math.abs(x.data[j+channel]-y.data[j+channel]);total+=d;rgb+=d;pixel=Math.max(pixel,d);max=Math.max(max,d);}if(visible){count++;foreground+=rgb;if(pixel>10)above10++;}}
 comparisons.push({biome:a.biome,frame:a.frame,night:a.night,foregroundPixels:count,fullImageMeanAbsoluteRgb:total/x.data.length,foregroundMeanAbsoluteRgb:foreground/(3*count),foregroundPixelsOver10:above10,foregroundFractionOver10:above10/count,maxChannelDifference:max});
}
if(mixed.frames[1].pipelines!==mixed.frames[0].pipelines)throw Error('Mixed-format second biome created a pipeline');
const report={comparisons,mixedPipelineCount:mixed.frames[1].pipelines,limitations:['Foreground mask uses the first reference pixel as background and is approximate.','Pixel differences are not a perceptual quality guarantee.','Lossy native BC7 uses precomputed mipmaps and visual orientation compensation.','These are isolated frozen grass fixtures, not game scenes.']};const json=JSON.stringify(report,null,2);if(output)await writeFile(output,json);else console.log(json);
