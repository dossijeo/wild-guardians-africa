// QA only. Copies complete buffers synchronously after the observed draw, then
// hashes the immutable copies asynchronously. This can stall the driver.
export function createGpuBufferReader(gl,{maxBufferBytes=8*1024*1024,maxTotalBytes=64*1024*1024,digest=bytes=>crypto.subtle.digest('SHA-256',bytes)}={}){
 for(const limit of [maxBufferBytes,maxTotalBytes])if(!Number.isSafeInteger(limit)||limit<1)throw Error('Invalid GPU buffer read limit');
 const pending=[];let totalBytes=0;
 return {
  read(buffer,id){
   if(!buffer)return null;
   const previous=gl.getParameter(gl.COPY_READ_BUFFER_BINDING);
   try{
    gl.bindBuffer(gl.COPY_READ_BUFFER,buffer);
    const byteLength=gl.getBufferParameter(gl.COPY_READ_BUFFER,gl.BUFFER_SIZE);
    if(!Number.isSafeInteger(byteLength)||byteLength<0||byteLength>maxBufferBytes||totalBytes+byteLength>maxTotalBytes)throw Error('GPU buffer read exceeds complete-copy budget');
    const bytes=new Uint8Array(byteLength);
    gl.getBufferSubData(gl.COPY_READ_BUFFER,0,bytes);
    totalBytes+=byteLength;
    const record={id,byteLength,sha256:null};
    pending.push(Promise.resolve().then(()=>digest(bytes)).then(hash=>{record.sha256=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}));
    return record;
   }finally{gl.bindBuffer(gl.COPY_READ_BUFFER,previous);}
  },
  async finish(){await Promise.all(pending);return {totalBytes,completeCopies:pending.length,maxBufferBytes,maxTotalBytes};}
 };
}
