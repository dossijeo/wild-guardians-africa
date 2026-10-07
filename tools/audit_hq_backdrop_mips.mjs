import fs from 'node:fs/promises';
import sharp from 'sharp';
const directory=process.argv[2]??'.cache/hq-backdrops';
const exports=JSON.parse(await fs.readFile(directory+'/export.json','utf8'));
const decode=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
const encode=x=>x<=.0031308?x*12.92:1.055*x**(1/2.4)-.055;
const assets=[];
for(const asset of exports.assets){
 const {data,info}=await sharp(directory+'/'+asset.biome+'-backdrop.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let width=info.width,height=info.height,linear=Float64Array.from(data,(value,i)=>i%4===3?value/255:decode(value/255));
 const levels=[];
 for(let level=0;;level++){
  let visible=0,saturated=0,maxSaturation=0,bottomUnderCutoff=0;
  for(let i=0;i<linear.length;i+=4)if(linear[i+3]>=.35){
   visible++;const rgb=[linear[i],linear[i+1],linear[i+2]].map(encode),saturation=(Math.max(...rgb)-Math.min(...rgb))*255;
   maxSaturation=Math.max(maxSaturation,saturation);if(saturation>160)saturated++;
  }
  for(let x=0;x<width;x++)if(linear[((height-1)*width+x)*4+3]<.35)bottomUnderCutoff++;
  levels.push({level,width,height,visible,saturatedVisible:saturated,maxSaturation,bottomUnderCutoff});
  if(width===1&&height===1)break;
  const nextWidth=Math.max(1,width>>1),nextHeight=Math.max(1,height>>1),next=new Float64Array(nextWidth*nextHeight*4);
  for(let y=0;y<nextHeight;y++)for(let x=0;x<nextWidth;x++)for(let c=0;c<4;c++){
   let sum=0,count=0;for(let dy=0;dy<(height>1?2:1);dy++)for(let dx=0;dx<(width>1?2:1);dx++){sum+=linear[((y*2+dy)*width+x*2+dx)*4+c];count++;}
   next[(y*nextWidth+x)*4+c]=sum/count;
  }
  linear=next;width=nextWidth;height=nextHeight;
 }
 assets.push({biome:asset.biome,levels});
}
console.log(JSON.stringify({meaning:'Read-only CPU linear box-mip reference; not native GPU mip/readback acceptance.',assets},null,2));
