// Offline diagnostic of the existing sky shader grade; no gameplay sampling.
import fs from 'node:fs/promises';
import {decodeRadiance} from '../../src/rendering/sky-source.js';
const catalogue=JSON.parse(await fs.readFile('public/content/skies.json','utf8'));
for(const [phase,entry] of catalogue.panoramas.entries()){
 const image=decodeRadiance(await fs.readFile('public'+entry.url));
 for(const v of [.5,.53,.56]){
  const total=[0,0,0];
  for(let x=0;x<image.width;x+=16){
   const offset=(Math.floor(v*image.height)*image.width+x)*4,e=image.pixels[offset+3];
   const rgb=[0,1,2].map(i=>Math.pow(1-Math.exp(-image.pixels[offset+i]/256*2**(e-128)*(phase?.62:1.33)),1/2.2));
   const luminance=rgb.reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0),sat=phase?1.10:1.28;
   for(let i=0;i<3;i++)total[i]+=Math.min(1,Math.max(0,luminance+(rgb[i]-luminance)*sat));
  }
  const count=Math.ceil(image.width/16);console.log(phase,v,total.map(c=>c/count), '#'+total.map(c=>Math.round(c/count*255).toString(16).padStart(2,'0')).join(''));
 }
}
