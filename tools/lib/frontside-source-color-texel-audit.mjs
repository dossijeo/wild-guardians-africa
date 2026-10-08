// Isolated source-only readback. No source texture/sampler writes or shaders.
// Unsupported or incomplete reads must never be interpreted as equal texels.
export function readSourceColorTexels(renderer,material,uniforms){
 const gl=renderer.getContext(),properties=renderer.properties.get(material),values=properties.uniforms??{};
 const prior={active:gl.getParameter(gl.ACTIVE_TEXTURE),framebuffer:gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),readBuffer:gl.getParameter(gl.READ_BUFFER),packBuffer:gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING),alignment:gl.getParameter(gl.PACK_ALIGNMENT),rowLength:gl.getParameter(gl.PACK_ROW_LENGTH),skipRows:gl.getParameter(gl.PACK_SKIP_ROWS),skipPixels:gl.getParameter(gl.PACK_SKIP_PIXELS)};
 const fingerprint=array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let h=2166136261;for(const v of bytes)h=Math.imul(h^v,16777619);return{bytes:bytes.length,fnv1a32:(h>>>0).toString(16).padStart(8,'0')};};
 const temporary=gl.createFramebuffer(),rows=[];if(!temporary)throw Error('Source texel diagnostic framebuffer allocation failed');
 try{
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,temporary);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,null);gl.pixelStorei(gl.PACK_ALIGNMENT,1);gl.pixelStorei(gl.PACK_ROW_LENGTH,0);gl.pixelStorei(gl.PACK_SKIP_ROWS,0);gl.pixelStorei(gl.PACK_SKIP_PIXELS,0);
  for(const uniform of uniforms){
   if(![gl.SAMPLER_2D,gl.SAMPLER_2D_SHADOW].includes(uniform.type))continue;
   const row={uniform:uniform.name,type:uniform.type,unit:uniform.value,status:'UNSUPPORTED_NOT_READ',levels:[]};rows.push(row);
   if(uniform.type===gl.SAMPLER_2D_SHADOW){row.reason='Comparison depth sampler requires separate depth-value instrument; no illegal DEPTH_COMPONENT readPixels attempted';continue;}
   if(!Number.isInteger(uniform.value)){row.reason='Sampler array or unexpected unit';continue;}
   const texture=values[uniform.name]?.value,image=texture?.image;
   if(!texture?.isTexture||!Number.isInteger(image?.width)||!Number.isInteger(image?.height)){row.reason='No unambiguous material uniform texture dimensions';continue;}
   if(texture.isCompressedTexture||texture.isData3DTexture||texture.isDataArrayTexture||texture.isCubeTexture){row.reason='Only ordinary readable color2D attachments supported';continue;}
   const textureProperties=renderer.properties.get(texture),boundExpected=textureProperties.__webglTexture;
   gl.activeTexture(gl.TEXTURE0+uniform.value);const bound=gl.getParameter(gl.TEXTURE_BINDING_2D);
   row.boundMatchesMaterialTexture=!!bound&&bound===boundExpected;row.dimensionsSource='Material texture CPU image metadata; not queried GPU storage extent';row.width=image.width;row.height=image.height;
   if(!row.boundMatchesMaterialTexture){row.reason='Actual bound texture does not match material uniform texture';continue;}
   const levels=texture.generateMipmaps?Math.floor(Math.log2(Math.max(image.width,image.height)))+1:Math.max(1,texture.mipmaps?.length??0);row.expectedLevels=levels;
   let totalBytes=0;
   for(let level=0;level<levels;level++){
    const width=Math.max(1,image.width>>level),height=Math.max(1,image.height>>level),entry={level,width,height,status:'UNSUPPORTED_NOT_READ'};row.levels.push(entry);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,bound,level);entry.framebufferStatus=gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER);
    if(entry.framebufferStatus!==gl.FRAMEBUFFER_COMPLETE){entry.reason='Color attachment incomplete or format not renderable';continue;}
    gl.readBuffer(gl.COLOR_ATTACHMENT0);const format=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT),type=gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);entry.format=format;entry.readType=type;
    const constructor=type===gl.UNSIGNED_BYTE?Uint8Array:type===gl.FLOAT?Float32Array:null;
    if(format!==gl.RGBA||!constructor){entry.reason='Only implementation-supported RGBA byte/float read pair handled';continue;}
    const byteLength=width*height*4*constructor.BYTES_PER_ELEMENT;
    if(!Number.isSafeInteger(byteLength)||byteLength<=0||totalBytes+byteLength>16*1024*1024){entry.reason='Prospective16MiB per-uniform readback budget exceeded';continue;}
    const data=new constructor(width*height*4);gl.readPixels(0,0,width,height,format,type,data);totalBytes+=byteLength;
    entry.status='COLOR_RECTANGLE_READ';entry.fingerprint=fingerprint(data);if(type===gl.FLOAT)entry.nonfiniteValues=data.reduce((count,value)=>count+!Number.isFinite(value),0);
   }
   row.status=row.levels.length&&row.levels.every(level=>level.status==='COLOR_RECTANGLE_READ')?'EXPECTED_COLOR_LEVELS_READ':'PARTIAL_OR_UNSUPPORTED_NOT_EQUALITY';row.totalReadBytes=totalBytes;
  }
 }finally{
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,prior.framebuffer);gl.readBuffer(prior.readBuffer);gl.bindBuffer(gl.PIXEL_PACK_BUFFER,prior.packBuffer);gl.pixelStorei(gl.PACK_ALIGNMENT,prior.alignment);gl.pixelStorei(gl.PACK_ROW_LENGTH,prior.rowLength);gl.pixelStorei(gl.PACK_SKIP_ROWS,prior.skipRows);gl.pixelStorei(gl.PACK_SKIP_PIXELS,prior.skipPixels);gl.activeTexture(prior.active);gl.deleteFramebuffer(temporary);
 }
 return{rows,meaning:'Actual bound color2D textures attached read-only at CPU-described level rectangles; expected mip count follows Three generation/manual metadata. Attachment completeness and legal implementation read pair checked. No depth/cube/integer/compressed equality, no GPU storage extent query, no causal/candidate/performance proof. Restored READ framebuffer/readBuffer/pack buffer+packing/active unit. FNV is diagnostic, not collision-free; readbacks and allocations perturb execution.'};
}
