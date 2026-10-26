import fs from 'node:fs/promises';
import sharp from 'sharp';
const root='docs/qa/tree-atlas-refresh-20261026/mangrove-0';
const phase=process.argv[2];
if(!['day','night'].includes(phase))throw Error('Expected day or night');
const input=`${root}/${phase}-imagegen-candidate.png`;
const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==info.height)throw Error('Atlas grid must remain square');
const size=1024,output=new Uint8Array(size*size*4),scale=info.width/size;
const linear=Float64Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
const encode=x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055));
// Area resample in premultiplied linear light, retaining generated alpha.
// No silhouette replacement, recoloring or removal of generated differences.
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const x0=x*scale,x1=(x+1)*scale,y0=y*scale,y1=(y+1)*scale;
 const sums=[0,0,0,0];
 for(let sy=Math.floor(y0);sy<Math.ceil(y1);sy++)for(let sx=Math.floor(x0);sx<Math.ceil(x1);sx++){
  const weight=(Math.min(x1,sx+1)-Math.max(x0,sx))*(Math.min(y1,sy+1)-Math.max(y0,sy));
  const i=(Math.min(info.height-1,sy)*info.width+Math.min(info.width-1,sx))*4,a=data[i+3]/255;
  for(let c=0;c<3;c++)sums[c]+=linear[data[i+c]]*a*weight;
  sums[3]+=a*weight;
 }
 const i=(y*size+x)*4,area=scale*scale;
 for(let c=0;c<3;c++)output[i+c]=encode(sums[c]/area);
 output[i+3]=Math.round(255*sums[3]/area);
}
await sharp(output,{raw:{width:size,height:size,channels:4}}).webp({lossless:true,effort:4}).toFile(`${root}/${phase}-imagegen-128.webp`);
await fs.writeFile(`${root}/${phase}-imagegen-runtime.json`,JSON.stringify({input,inputWidth:info.width,outputWidth:size,viewResolution:128,encoding:'srgb-encoded-linear-premultiplied',preservesGeneratedAlpha:true,production:false},null,2));
console.log(`${phase} imagegen candidate ready`);
