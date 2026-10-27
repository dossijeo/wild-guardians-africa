import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),option=name=>{const i=args.indexOf('--'+name);return i<0?undefined:args[i+1];};
const biome=option('biome')??'mangrove',slot=Number(option('slot')??0),phase=option('phase')??args.find(x=>['day','night'].includes(x));
const manifest=JSON.parse(await fs.readFile('docs/qa/tree-atlas-refresh-20261026/candidate-manifest.json','utf8'));
if(!manifest.biomes[biome]?.some(s=>s.slot===slot)||!Number.isInteger(slot))throw Error('Unknown biome/slot in candidate manifest');
if(!['day','night'].includes(phase))throw Error('Expected --phase day|night');
const root=`docs/qa/tree-atlas-refresh-20261026/${biome}-${slot}`;
const sha256=data=>createHash('sha256').update(data).digest('hex');
const input=`${root}/${phase}-imagegen-candidate.png`;
const inputBytes=await fs.readFile(input);
const {data,info}=await sharp(inputBytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==info.height||info.width<1024)throw Error('Atlas grid must remain square and at least 1024 pixels');
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
 output[i+3]=Math.round(255*sums[3]/area);if(output[i+3]===0)output[i]=output[i+1]=output[i+2]=0;
}
await sharp(output,{raw:{width:size,height:size,channels:4}}).webp({lossless:true,exact:true,effort:4}).toFile(`${root}/${phase}-imagegen-128.webp`);
await fs.writeFile(`${root}/${phase}-imagegen-runtime.json`,JSON.stringify({biome,slot,phase,input,inputSha256:sha256(inputBytes),outputSha256:sha256(await fs.readFile(`${root}/${phase}-imagegen-128.webp`)),inputWidth:info.width,outputWidth:size,viewResolution:128,encoding:'srgb-encoded-linear-premultiplied',preservesGeneratedAlpha:true,transparentRgb:'zero-exact-webp',production:false},null,2));
console.log(`${phase} imagegen candidate ready`);
