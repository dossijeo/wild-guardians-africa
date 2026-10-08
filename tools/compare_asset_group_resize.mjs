import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {compareColorPixels} from './image-pixel-comparison.mjs';

// QA reports contain DOM-exported drawing-buffer PNGs, not panel screenshots.
const directory=process.argv[2]??'.cache/asset-group-resize';
const names=['base-A1','candidate-B1-fixed','candidate-B2-fixed','base-A2'];
const reports=new Map(),images=new Map();
for(const name of names){
 const report=JSON.parse(await fs.readFile(path.join(directory,`${name}.json`),'utf8'));
 if(!report.ok||!report.capturePng?.startsWith('data:image/png;base64,'))throw Error(`Incomplete report: ${name}`);
 const image=Buffer.from(report.capturePng.split(',')[1],'base64');
 await fs.writeFile(path.join(directory,`${name}.png`),image);
 reports.set(name,report);images.set(name,image);
}
const comparisons=[];
for(let a=0;a<names.length;a++)for(let b=a+1;b<names.length;b++){
 const first=reports.get(names[a]),second=reports.get(names[b]);
 const frames=first.timing.firstRenderCalls.map((frame,i)=>{
  const other=second.timing.firstRenderCalls[i];
  if(!frame.groupDraw||!other.groupDraw||!frame.renderInfo||!other.renderInfo||!frame.memory||!other.memory)throw Error('Missing draw/resource evidence');
  return {frame:i,drawEqual:JSON.stringify(frame.groupDraw)===JSON.stringify(other.groupDraw),renderEqual:JSON.stringify(frame.renderInfo)===JSON.stringify(other.renderInfo),memoryEqual:JSON.stringify(frame.memory)===JSON.stringify(other.memory)};
 });
 const pixels=await compareColorPixels(images.get(names[a]),images.get(names[b]));
 const raw=await Promise.all([names[a],names[b]].map(name=>sharp(images.get(name)).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true})));
 let changedPixels=0;
 if(pixels.dimensionsMatch)for(let i=0;i<raw[0].data.length;i+=4)if([0,1,2,3].some(lane=>raw[0].data[i+lane]!==raw[1].data[i+lane]))changedPixels++;
 comparisons.push({a:names[a],b:names[b],frames,pixels:{...pixels,changedPixels,width:raw[0].info.width,height:raw[0].info.height}});
}
const runs=names.map(name=>{const r=reports.get(name);return {name,drawingBuffer:r.drawingBuffer,candidate:r.groupResizeCandidate,frames:r.timing.firstRenderCalls.map(f=>({cpuMs:f.cpuMs,bufferData:f.calls.bufferData,bufferSubData:f.calls.bufferSubData,memory:f.memory,render:f.renderInfo}))};});
const result={runs,comparisons,scope:'QA-only static group ownership candidate. CPU samples include observer overhead; no GPU/FPS inference. Same-arm controls are retained, including any residual pixel differences.'};
await fs.writeFile(path.join(directory,'comparisons.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
