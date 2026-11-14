try{
 const gl=document.createElement('canvas').getContext('webgl2'),ext=gl?.getExtension('EXT_texture_compression_bptc');if(!ext)throw Error('WebGL2 BPTC unavailable');
 const info=gl.getExtension('WEBGL_debug_renderer_info'),samples=[];
 for(const size of [4,1254,1256]){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);while(gl.getError()!==gl.NO_ERROR){}const bytes=new Uint8Array(Math.ceil(size/4)**2*16);gl.compressedTexImage2D(gl.TEXTURE_2D,0,ext.COMPRESSED_RGBA_BPTC_UNORM_EXT,size,size,0,bytes);const error=gl.getError();samples.push({size,bytes:bytes.length,error});gl.deleteTexture(texture);}
 if(samples[0].error!==gl.NO_ERROR||samples[1].error!==gl.INVALID_OPERATION||samples[2].error!==gl.NO_ERROR)throw Error('Unexpected BC7 upload result '+JSON.stringify(samples));
 window.bc7NpotResult={device:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),samples,scope:'WebGL2 BC7 dimension acceptance on this device; zero-filled blocks do not assess image quality or mipmaps.'};
}catch(error){window.bc7NpotError=error.stack||String(error);}
