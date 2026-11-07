// Latest camera pose only. A reader never waits for the writer: an incomplete
// sample is ignored until the next frame or interaction boundary.
const fields=['x','y','z','targetX','targetY','targetZ','fov','near','far'];
const headerBytes=8,bytes=headerBytes+(fields.length+1)*8;
export function createSharedCameraMailbox(buffer=new SharedArrayBuffer(bytes)){
 if(!(buffer instanceof SharedArrayBuffer)||buffer.byteLength!==bytes)throw TypeError('Invalid camera mailbox');
 const header=new Int32Array(buffer,0,2),values=new Float64Array(buffer,headerBytes,fields.length+1);
 return {
  buffer,
  write(pose,version){
   if(!pose||!Number.isSafeInteger(version)||version<1||fields.some(key=>!Number.isFinite(pose[key])))throw TypeError('Invalid shared camera pose');
   Atomics.add(header,0,1);try{values[0]=version;for(let i=0;i<fields.length;i++)values[i+1]=pose[fields[i]];}finally{Atomics.add(header,0,1);}
  },
  read(){
   const before=Atomics.load(header,0);if(before&1)return null;const version=values[0];
   const pose={};for(let i=0;i<fields.length;i++)pose[fields[i]]=values[i+1];
   if(Atomics.load(header,0)!==before||!Number.isSafeInteger(version)||version<1)return null;
   return {version,pose};
  },
 };
}
