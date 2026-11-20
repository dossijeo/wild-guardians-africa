// Partition a native external copy, not its pixels or colour conversion.
// Source origin is top-left even with flipY; destination keeps its original
// format, alpha, colour space, mip and layer. No canvas re-render or readback.
export function* externalImageUploadRegions(op,texture,edge=512){
 if(op.method!=='copyExternalImageToTexture'){yield op;return;}
 const [source,destination,size]=op.args;
 const width=Array.isArray(size)?size[0]:size.width,height=(Array.isArray(size)?size[1]:size.height)??1,depth=(Array.isArray(size)?size[2]:size.depthOrArrayLayers)??1;
 const xy=(o,key,index)=>Array.isArray(o)?o[index]??0:o?.[key]??0;
 const sx=xy(source.origin,'x',0),sy=xy(source.origin,'y',1),dx=xy(destination.origin,'x',0),dy=xy(destination.origin,'y',1),dz=xy(destination.origin,'z',2);
 const mip=destination.mipLevel??0;
 // Leave invalid/empty requests to WebGPU's original validation. Subdivision
 // must never turn an invalid whole copy into several valid partial writes.
 if(![width,height,sx,sy,dx,dy,dz,mip].every(n=>Number.isSafeInteger(n)&&n>=0)||depth!==1||!width||!height||!source.source?.width||!source.source?.height||sx+width>source.source.width||sy+height>source.source.height||texture?.dimension!=='2d'||mip>=texture.mipLevelCount||dx+width>Math.max(1,Math.floor(texture.width/2**mip))||dy+height>Math.max(1,Math.floor(texture.height/2**mip))||dz>=texture.depthOrArrayLayers){yield op;return;}
 if(width<=edge&&height<=edge){yield op;return;}
 for(let y=0;y<height;y+=edge)for(let x=0;x<width;x+=edge){
  const w=Math.min(edge,width-x),h=Math.min(edge,height-y);
  yield {method:op.method,args:[{...source,origin:{x:sx+x,y:sy+(source.flipY?height-y-h:y)}},{...destination,origin:{x:dx+x,y:dy+y,z:dz}},{width:w,height:h,depthOrArrayLayers:1}]};
 }
}
