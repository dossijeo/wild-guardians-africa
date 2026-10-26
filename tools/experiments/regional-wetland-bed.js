// Packed regional optical depth and shore distance, matching natural-water-edges.
// Called by the regional worker while it already samples the coverage mask.
export function createRegionalWetlandBed(bounds,width,height,level){
 if(![level,bounds.minX,bounds.minZ,bounds.maxX,bounds.maxZ].every(Number.isFinite)||!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>262144||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw Error('Invalid regional wetland bed');
 const span=(1-.61)*3,lo=level-span,bytes=new Uint8Array(width*height*4);
 let cursor=0;
 return {bed:{bytes,nx:width,nz:height,minX:bounds.minX,minZ:bounds.minZ,width:bounds.maxX-bounds.minX,height:bounds.maxZ-bounds.minZ,lo,span},
  sample(info){
   if(cursor>=width*height||!Number.isFinite(info.mask)||!Number.isFinite(info.shore))throw Error('Invalid regional water sample');
   const depth=Math.max(0,Math.min(span,(info.mask-.61)*3)),heightCode=Math.round((span-depth)/span*65535),i=cursor++*4;
   bytes[i]=heightCode>>>8;bytes[i+1]=heightCode&255;bytes[i+2]=Math.round(Math.max(0,Math.min(4,info.shore))/4*255);bytes[i+3]=255;
   return info.inside?1:0;
  },finish(){if(cursor!==width*height)throw Error('Incomplete regional water bed');return this.bed;}};
}
