import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

// Bake each native village's shared UV atlas into per-vertex linear RGB.
// The authored geometry and index ranges remain unchanged.
const selected=process.argv[2],catalogue=JSON.parse(await readFile('public/content/villages.json','utf8')),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
if(selected&&!catalogue.some(v=>v.id===selected))throw Error('Unknown village culture');
const directory='public/content/structure-preview';await mkdir(directory,{recursive:true});
const srgb=value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;};
for(const item of catalogue){if(selected&&item.id!==selected)continue;const source=await readFile('public'+item.binary.url),atlas=await readFile('public'+item.textures.color);if(item.vertexBytes!==item.vertexCount*8*4||item.vertexBytes>source.length)throw Error('Unexpected village vertex buffer');const image=await sharp(atlas).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{data,info:{width,height}}=image,colors=Buffer.alloc(item.vertexCount*4,255);
 for(let v=0;v<item.vertexCount;v++){const u=source.readFloatLE(v*32+24),w=source.readFloatLE(v*32+28);if(!Number.isFinite(u)||!Number.isFinite(w))throw Error('Invalid village UV');const x=u*width-.5,y=w*height-.5,x0=Math.floor(x),y0=Math.floor(y),dx=x-x0,dy=y-y0,rgb=[0,0,0];for(let j=0;j<2;j++)for(let i=0;i<2;i++){const xx=Math.max(0,Math.min(width-1,x0+i)),yy=Math.max(0,Math.min(height-1,y0+j)),at=(yy*width+xx)*4,weight=(i?dx:1-dx)*(j?dy:1-dy);for(let c=0;c<3;c++)rgb[c]+=srgb(data[at+c])*weight;}for(let c=0;c<3;c++)colors[v*4+c]=Math.round(Math.max(0,Math.min(1,rgb[c]))*255);}
 const manifest={version:1,culture:item.id,sourceSha256:hash(source),texture:item.textures.color,textureSha256:hash(atlas),vertices:item.vertexCount,binary:`/content/structure-preview/village-${item.id}.rgba8`,sha256:hash(colors),bytes:colors.length};await writeFile(`${directory}/village-${item.id}.rgba8`,colors);await writeFile(`${directory}/village-${item.id}.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({culture:item.id,vertices:item.vertexCount,bytes:colors.length}));
}
