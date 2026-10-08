import fs from 'node:fs/promises';import sharp from 'sharp';
const directory=process.argv[2]??'.cache/hq-arc-four';
const cells=JSON.parse(await fs.readFile(directory+'/cells.json','utf8'));
const {data,info}=await sharp(directory+'/atlas.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
let width=info.width,height=info.height,weights=new Float32Array(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const cell=Math.floor(x/1024)+Math.floor(y/256)*2;weights[(y*width+x)*4+cell]=data[(y*width+x)*4+3]/255;
}
const sample=(u,v,c)=>{
 const x=Math.max(0,Math.min(width-1,u*width-.5)),y=Math.max(0,Math.min(height-1,(1-v)*height-.5)),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),tx=x-x0,ty=y-y0;
 const at=(a,b)=>weights[(b*width+a)*4+c];
 return (at(x0,y0)+(at(x1,y0)-at(x0,y0))*tx)*(1-ty)+(at(x0,y1)+(at(x1,y1)-at(x0,y1))*tx)*ty;
};
const levels=[];
for(let level=0;;level++){
 const rows=[];
 for(const cell of cells){
  let visible=0,foreignVisible=0,maxForeignFraction=0;
  for(let y=0;y<=40;y++)for(let x=0;x<=40;x++){
   const u=cell.uv[0]+x/40*(cell.uv[2]-cell.uv[0]),v=cell.uv[1]+y/40*(cell.uv[3]-cell.uv[1]);
   const values=[0,1,2,3].map(c=>sample(u,v,c)),alpha=values.reduce((a,b)=>a+b,0);
   if(alpha<.35)continue;visible++;
   const foreign=alpha-values[cell.cell];if(foreign>1e-6){foreignVisible++;maxForeignFraction=Math.max(maxForeignFraction,foreign/alpha);}
  }
  rows.push({cell:cell.cell,visible,foreignVisible,maxForeignFraction});
 }
 levels.push({level,width,height,cells:rows});
 if(width===1&&height===1)break;
 const nw=Math.max(1,width>>1),nh=Math.max(1,height>>1),next=new Float32Array(nw*nh*4);
 for(let y=0;y<nh;y++)for(let x=0;x<nw;x++)for(let c=0;c<4;c++){
  let sum=0,count=0;for(let dy=0;dy<(height>1?2:1);dy++)for(let dx=0;dx<(width>1?2:1);dx++){sum+=weights[((y*2+dy)*width+x*2+dx)*4+c];count++;}
  next[(y*nw+x)*4+c]=sum/count;
 }
 width=nw;height=nh;weights=next;
}
console.log(JSON.stringify({meaning:'Read-only CPU box-mip alpha provenance with bilinear samples; not native GPU LOD/readback proof. Foreign weight measures contribution from another populated cell at shader-visible samples.',sampleGrid:[41,41],levels},null,2));
