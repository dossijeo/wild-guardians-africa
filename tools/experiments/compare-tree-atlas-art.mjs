import sharp from 'sharp';
import fs from 'node:fs/promises';
const root='docs/qa/tree-atlas-refresh-20261026',dir=root+'/mangrove-0';
const composite=[];
for(const [row,phase] of ['day','night'].entries())for(const [col,kind] of ['raster','imagegen'].entries()){
 const input=kind==='raster'?`${dir}/${phase}.png`:`${dir}/${phase}-imagegen-candidate.png`;
 const decoded=await sharp(input).resize(2048,2048).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Raster PNG stores premultiplied linear RGB. Decode for display on a background.
 if(kind==='raster')for(let i=0;i<decoded.data.length;i+=4){const a=decoded.data[i+3]/255;if(!a)continue;for(let c=0;c<3;c++){let v=decoded.data[i+c]/255;v=v<=.04045?v/12.92:((v+.055)/1.055)**2.4;v=Math.min(1,v/a);decoded.data[i+c]=Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));}}
 const tile=await sharp(decoded.data,{raw:{width:2048,height:2048,channels:4}}).extract({left:0,top:0,width:256,height:256}).resize(640,640).png().toBuffer();
 composite.push({input:tile,left:col*660+10,top:row*710+55});
 const title=`${phase==='day'?'DÍA':'NOCHE'} · ${kind==='raster'?'RASTER DEL MOTOR':'IMAGE GENERATION'}`;
 const label=Buffer.from(`<svg width="660" height="50"><text x="18" y="33" fill="white" font-family="Arial" font-size="24">${title}</text></svg>`);
 composite.push({input:label,left:col*660,top:row*710});
}
await sharp({create:{width:1320,height:1420,channels:4,background:'#33403a'}}).composite(composite).png().toFile(root+'/comparativa-atlas-detalle.png');
await fs.writeFile(root+'/imagegen-prompt-night.txt','Built-in image_gen. Edit day-imagegen-candidate.png; night.png is lighting reference only. Preserve 8x8 grid, all silhouettes, roots, foliage and positions; apply subdued dark green canopy and cooler gray-blue bark lighting, retain illustrated finish. Transparent alpha, no new objects, ground, sky, text, moon or stars. No production activation.\n');
