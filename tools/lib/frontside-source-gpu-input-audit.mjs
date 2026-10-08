// Source-only diagnostic readback. Not imported by any live fixture yet.
// No writes to source buffers/textures, no geometry/material/shader changes.
export function readSourceGpuInputs(gl,mesh,uniforms) {
 const fingerprint=array=>{const b=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let h=2166136261;for(const v of b)h=Math.imul(h^v,16777619);return{bytes:b.length,fnv1a32:(h>>>0).toString(16).padStart(8,'0')};};
 const program=gl.getParameter(gl.CURRENT_PROGRAM),buffers=new Map(),names=[];
 for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);i++){
  const info=gl.getActiveAttrib(program,i),slot=gl.getAttribLocation(program,info.name),buffer=gl.getVertexAttrib(slot,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
  if(buffer){if(!buffers.has(buffer))buffers.set(buffer,[]);buffers.get(buffer).push(info.name);}
 }
 const element=gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);if(element){if(!buffers.has(element))buffers.set(element,[]);buffers.get(element).push('index');}
 const originalCopyRead=gl.getParameter(gl.COPY_READ_BUFFER_BINDING);
 try{for(const [buffer,attributes] of buffers){gl.bindBuffer(gl.COPY_READ_BUFFER,buffer);const size=gl.getBufferParameter(gl.COPY_READ_BUFFER,gl.BUFFER_SIZE);if(size>32*1024*1024)throw Error('Source diagnostic buffer limit');const bytes=new Uint8Array(size);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,bytes);names.push({attributes,size,...fingerprint(bytes)});}}finally{gl.bindBuffer(gl.COPY_READ_BUFFER,originalCopyRead);}
 const boneUniform=uniforms.find(u=>u.name==='boneTexture'),image=mesh.skeleton?.boneTexture?.image;
 let boneTexture={attempted:false};
 if(boneUniform&&image&&image.data instanceof Float32Array){
  const width=image.width,height=image.height;
  if(!Number.isInteger(width)||!Number.isInteger(height)||width*height>1024*1024)throw Error('Unexpected source bone texture dimensions');
  const floatExtension=!!gl.getExtension('EXT_color_buffer_float');
  boneTexture={attempted:true,width,height,floatExtensionRequested:true,floatExtensionAvailable:floatExtension,cpu:fingerprint(image.data),gpu:null};
  if(floatExtension){
   const active=gl.getParameter(gl.ACTIVE_TEXTURE),readFramebuffer=gl.getParameter(gl.READ_FRAMEBUFFER_BINDING),readBuffer=gl.getParameter(gl.READ_BUFFER),temporary=gl.createFramebuffer();
   if(!temporary)throw Error('Cannot allocate source diagnostic read framebuffer');
   try{
    gl.activeTexture(gl.TEXTURE0+boneUniform.value);const texture=gl.getParameter(gl.TEXTURE_BINDING_2D);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER,temporary);gl.framebufferTexture2D(gl.READ_FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    const status=gl.checkFramebufferStatus(gl.READ_FRAMEBUFFER);boneTexture.framebufferStatus=status;
    if(status===gl.FRAMEBUFFER_COMPLETE){
     gl.readBuffer(gl.COLOR_ATTACHMENT0);const values=new Float32Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.FLOAT,values);
     boneTexture.gpu=fingerprint(values);boneTexture.nonfiniteReadValues=values.reduce((count,value)=>count+!Number.isFinite(value),0);boneTexture.cpuGpuFingerprintEqual=JSON.stringify(boneTexture.cpu)===JSON.stringify(boneTexture.gpu);
    }
   }finally{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,readFramebuffer);gl.readBuffer(readBuffer);gl.activeTexture(active);gl.deleteFramebuffer(temporary);}
  }
 }
 return{buffers:names,boneTexture,meaning:'Bound VBO/index read via COPY_READ_BUFFER; bone texture only if source Float32 image and temporary read framebuffer complete. Original bindings/read buffer/active texture restored. Float color extension may be enabled; queries/readbacks perturb timing. FNV is diagnostic, not collision-free; no static map/environment/depth GPU texels observed. No candidate acceptance or causal proof.'};
}
