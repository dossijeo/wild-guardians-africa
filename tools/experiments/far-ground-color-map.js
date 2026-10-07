// Regional worker data: color resolution is independent of proxy geometry.
// Values use the same sRGB ground palette and wash as the vertex-color path.
export function farGroundColorMap(bounds,{step=8,colorAt,wash=.25}={}){
 if(!Number.isFinite(step)||step<=0||typeof colorAt!=='function'||!Number.isFinite(wash)||wash<0||wash>1||![bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ].every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid far ground color map');
 const width=Math.ceil((bounds.maxX-bounds.minX)/step)+1,height=Math.ceil((bounds.maxZ-bounds.minZ)/step)+1;
 if(width*height>262144)throw Error('Far ground color map budget exceeded');
 const data=new Uint8Array(width*height*4);
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const px=bounds.minX+(bounds.maxX-bounds.minX)*x/(width-1),pz=bounds.minZ+(bounds.maxZ-bounds.minZ)*z/(height-1),color=colorAt(px,pz),i=(z*width+x)*4;
  if(!color||color.length!==3||!color.every(Number.isFinite))throw Error('Invalid far ground color sample');
  for(let c=0;c<3;c++)data[i+c]=Math.round(Math.max(0,Math.min(1,color[c]*(1-wash)+.65*wash))*255);
  data[i+3]=255;
 }
 return {data,width,height,bounds:{...bounds},step};
}
export function farGroundColorUvs(positions,map){
 const uv=new Float32Array(positions.length/3*2),b=map.bounds;
 for(let i=0;i<positions.length/3;i++){
  const x=(positions[i*3]-b.minX)/(b.maxX-b.minX),z=(positions[i*3+2]-b.minZ)/(b.maxZ-b.minZ);
  uv[i*2]=(x*(map.width-1)+.5)/map.width;uv[i*2+1]=(z*(map.height-1)+.5)/map.height;
 }
 return uv;
}
