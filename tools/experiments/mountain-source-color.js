// Offline halo heuristic: retain the original RGB saturation count, but
// distinguish fully opaque rock highlights from colors touching alpha edges.
export function auditMountainSourceColor(data,width,height){
 if(!(data instanceof Uint8Array)||data.length!==width*height*4)throw Error('Invalid mountain color audit');
 let lowest=-1,visibleSaturated=0,interiorSaturated=0;const interiorExamples=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;if(data[i+3]<90)continue;lowest=Math.max(lowest,y);
  if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<=160)continue;
  visibleSaturated++;let minimumAlpha=255;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const sx=x+dx,sy=y+dy;minimumAlpha=Math.min(minimumAlpha,sx<0||sy<0||sx>=width||sy>=height?0:data[(sy*width+sx)*4+3]);}
  if(minimumAlpha<253)throw Error('Visible source fringe in mountain source');
  interiorSaturated++;if(interiorExamples.length<16)interiorExamples.push({x,y,rgba:[...data.subarray(i,i+4)],minimumAlpha});
 }
 return {lowest,visibleSaturated,interiorSaturated,interiorExamples};
}
