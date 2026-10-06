import fs from 'node:fs/promises';import sharp from 'sharp';
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
await fs.mkdir('public/assets/far-vegetation',{recursive:true});
const colors={savanna:['#a4aa92','#929e88','#86927e'],grand_river:['#96aaa0','#80988c','#759080'],mangrove:['#9db2ab','#8ca49a','#7d978b'],volcanoes:['#989b9c','#888e90','#727e82'],canyons:['#bfaa9c','#ae958b','#9d827a'],desert:['#c4b69d','#b2a28d','#a39381']};
function random(seed){return()=>{seed=Math.imul(seed^seed>>>15,1|seed);seed^=seed+Math.imul(seed^seed>>>7,61|seed);return ((seed^seed>>>14)>>>0)/4294967296;};}
for(const [index,biome] of biomes.entries()){
 let parts=[];for(let layer=0;layer<3;layer++){const r=random(1471+index*193+layer*277),jitter=Array.from({length:128},()=>r()*7),points=[];
 for(let x=0;x<=2048;x+=16){const wrap=x%2048;let height;
 if(biome==='canyons'||biome==='desert'){const mesa=Math.floor(wrap/64);height=170+(mesa%3)*43+jitter[Math.floor(wrap/16)]+layer*55;}
 else if(biome==='volcanoes'){let mountain=0;for(let peak=0;peak<8;peak++){const center=128+peak*256,dx=Math.min(Math.abs(wrap-center),2048-Math.abs(wrap-center));mountain=Math.max(mountain,Math.max(0,1-dx/150)*(140+20*Math.cos(peak)));}height=300-mountain+layer*34;}
 else height=220+Math.sin(wrap*Math.PI*2/2048)*46+Math.sin(wrap*Math.PI*2/512)*18+layer*45+jitter[Math.floor(wrap/16)];points.push([x,height]);}
 parts.push(`<path d="M 0,512 L ${points.map(p=>p.join(',')).join(' L ')} L 2048,512 Z" fill="${colors[biome][layer]}"/>`);
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512" viewBox="0 0 2048 512">${parts.join('')}</svg>`;await sharp(Buffer.from(svg)).webp({lossless:true,effort:4}).toFile(`public/assets/far-vegetation/${biome}-backdrop.webp`);
}
