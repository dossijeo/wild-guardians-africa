// Packed regional optical depth and shore distance, matching natural-water-edges.
// Called by the regional worker while it already samples the coverage mask.
export function createRegionalWetlandBed(bounds,width,height,level){
 if(![level,bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ].every(Number.isFinite)||!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid regional wetland bed');
 const span=(1-.61)*3,lo=level-span,bytes=new Uint8Array(width*height*4);
 const masks=new Float32Array(width*height);let cursor=0;
 return {bed:{bytes,nx:width,nz:height,minX:bounds.minX,minZ:bounds.minZ,width:bounds.maxX-bounds.minX,height:bounds.maxZ-bounds.minZ,lo,span},
  sample(info){
   if(cursor>=width*height||!Number.isFinite(info.mask)||!Number.isFinite(info.shore))throw Error('Invalid regional water sample');
   masks[cursor]=info.mask;
   const depth=Math.max(0,Math.min(span,(info.mask-.61)*3)),heightCode=Math.round((span-depth)/span*65535),i=cursor++*4;
   bytes[i]=heightCode>>>8;bytes[i+1]=heightCode&255;bytes[i+2]=255;bytes[i+3]=Math.round(Math.max(0,Math.min(4,info.shore))/4*255);
   return info.inside?1:0;
  },finish(){if(cursor!==width*height)throw Error('Incomplete regional water bed');encodeRegionalShoreDistance(bytes,masks,width,height,(bounds.maxX-bounds.minX)/(width-1),(bounds.maxZ-bounds.minZ)/(height-1));return this.bed;}};
}

// Distance to the .61 contour of the sampled triangulated field. Only texels
// within four metres of a contour segment are visited; no world resampling.
function encodeRegionalShoreDistance(bytes,masks,nx,nz,sx,sz){
 const squared=new Float32Array(nx*nz).fill(16);
 const segment=(a,b)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
  const x0=Math.max(0,Math.ceil((Math.min(a[0],b[0])-4)/sx)),x1=Math.min(nx-1,Math.floor((Math.max(a[0],b[0])+4)/sx));
  const z0=Math.max(0,Math.ceil((Math.min(a[1],b[1])-4)/sz)),z1=Math.min(nz-1,Math.floor((Math.max(a[1],b[1])+4)/sz));
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
   const px=x*sx-a[0],pz=z*sz-a[1],t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(den||1)));
   const d=(px-t*dx)**2+(pz-t*dz)**2,i=z*nx+x;if(d<squared[i])squared[i]=d;
  }
 };
 const triangle=(a,b,c)=>{
  const wet=masks[a]>.61;if((masks[b]>.61)===wet&&(masks[c]>.61)===wet)return;
  const ids=[a,b,c],points=[];
  for(let j=0;j<3;j++){
   const i=ids[j],k=ids[(j+1)%3],u=masks[i]-.61,v=masks[k]-.61;
   if((u>0)===(v>0))continue;
   const t=u/(u-v),x=i%nx,z=Math.floor(i/nx);
   points.push([(x+(k%nx-x)*t)*sx,(z+(Math.floor(k/nx)-z)*t)*sz]);
  }
  if(points.length===2)segment(points[0],points[1]);
 };
 for(let z=0;z<nz-1;z++)for(let x=0;x<nx-1;x++){const a=z*nx+x;triangle(a,a+nx,a+1);triangle(a+1,a+nx,a+nx+1);}
 for(let i=0;i<squared.length;i++)bytes[i*4+2]=Math.round(Math.sqrt(squared[i])/4*255);
}
