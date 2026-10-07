import fs from 'node:fs';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {convexHull} from './impostor-hull.js';
const manifest=JSON.parse(fs.readFileSync('public/content/far-vegetation.json'));
const margin=16,resolution=128,out={resolution,marginPixels:margin,alphaThreshold:0,biomes:{},sources:[]},clip=n=>Math.max(0,Math.min(1,n));
for(const [biome,species]of Object.entries(manifest.biomes)){
 out.biomes[biome]=[];
 for(const tree of species){
  const alpha=new Uint8Array(resolution*resolution);
  for(const phase of ['day','night']){
   const path='public/'+tree[phase].slice(2),bytes=fs.readFileSync(path),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   if(info.width!==resolution*8||info.height!==resolution*8)throw Error('Unexpected atlas size '+path);
   out.sources.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const local=(y%resolution)*resolution+x%resolution;alpha[local]=Math.max(alpha[local],data[(y*info.width+x)*4+3]);}
  }
  const points=[];
  for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++)if(alpha[y*resolution+x])for(const dx of [-margin,margin+1])for(const dy of [-margin,margin+1])points.push([clip((x+dx)/resolution),clip(1-(y+dy)/resolution)]);
  const hull=convexHull(points),area=Math.abs(hull.reduce((sum,p,i)=>{const q=hull[(i+1)%hull.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
  out.biomes[biome].push({slot:tree.slot,species:tree.species,hull,area,opaqueUnionPixels:alpha.reduce((n,a)=>n+!!a,0)});
 }
}
const target=process.argv[2]??'docs/qa/far-hull-cost-review/hulls.json';fs.mkdirSync(target.substring(0,target.lastIndexOf('/')),{recursive:true});fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
