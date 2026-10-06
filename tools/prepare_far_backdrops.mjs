import fs from 'node:fs/promises';import sharp from 'sharp';
const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
await fs.mkdir('public/assets/far-vegetation',{recursive:true});
const colors={savanna:['#a4aa92','#929e88','#86927e'],grand_river:['#96aaa0','#80988c','#759080'],mangrove:['#9db2ab','#8ca49a','#7d978b'],volcanoes:['#989b9c','#888e90','#727e82'],canyons:['#bfaa9c','#ae958b','#9d827a'],desert:['#c4b69d','#b2a28d','#a39381']};
function random(seed){return()=>{seed=Math.imul(seed^seed>>>15,1|seed);seed^=seed+Math.imul(seed^seed>>>7,61|seed);return ((seed^seed>>>14)>>>0)/4294967296;};}
for(const [index,biome] of biomes.entries()){
 let parts=[];for(let sector=0;sector<8;sector++){const r=random(1471+index*193+sector*277),offset=sector*256;
 for(let layer=0;layer<3;layer++){let points=[];
 for(let x=-16;x<=272;x+=16){let height;if(biome==='canyons'||biome==='desert'){const mesa=Math.floor(x/64);height=170+((mesa+sector+layer)%3)*43+r()*10+layer*55;}else if(biome==='volcanoes'){const peak=sector%2?112:160;height=300-Math.max(0,1-Math.abs(x-peak)/100)*180+layer*34+r()*9;}else height=220+Math.sin((x+sector*37)*.018)*46+Math.sin(x*.043+sector)*18+layer*45+r()*7;points.push([offset+x,height]);}
 parts.push(`<path d="M ${offset},512 L ${points.map(p=>p.join(',')).join(' L ')} L ${offset+256},512 Z" fill="${colors[biome][layer]}"/>`);
 }}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512" viewBox="0 0 2048 512">${parts.join('')}</svg>`;await sharp(Buffer.from(svg)).webp({lossless:true,effort:4}).toFile(`public/assets/far-vegetation/${biome}-backdrop.webp`);
}
