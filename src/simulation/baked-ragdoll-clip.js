// Numeric, allocation-free playback of offline physical falls. World placement
// and collision adaptation belong to the caller; no navigation is changed here.
export class BakedRagdollClip {
 constructor(metadata,buffer){
  const {byteOffset,floatCount,frames,sampleRate}=metadata;
  if(!Number.isInteger(byteOffset)||byteOffset<0||byteOffset%4||!Number.isInteger(frames)||frames<2||floatCount!==frames*98||!(sampleRate>0)||byteOffset+floatCount*4>buffer.byteLength)throw Error('Invalid baked ragdoll clip');
  this.metadata=metadata;this.values=new Float32Array(buffer,byteOffset,floatCount);this.duration=(frames-1)/sampleRate;
 }
 sample(time,out){
  if(out.length!==98||!Number.isFinite(time))throw Error('Invalid baked ragdoll sample');
  const frame=Math.max(0,Math.min(this.metadata.frames-1,time*this.metadata.sampleRate)),lo=Math.floor(frame),hi=Math.min(this.metadata.frames-1,lo+1),t=frame-lo,a=lo*98,b=hi*98,v=this.values;
  for(let i=0;i<98;i+=7){
   for(let k=0;k<3;k++)out[i+k]=v[a+i+k]+(v[b+i+k]-v[a+i+k])*t;
   let dot=0;for(let k=3;k<7;k++)dot+=v[a+i+k]*v[b+i+k];
   const sign=dot<0?-1:1;dot=Math.min(1,Math.abs(dot));let w0=1-t,w1=t;
   if(dot<.9995){const theta=Math.acos(dot),sin=Math.sin(theta);w0=Math.sin((1-t)*theta)/sin;w1=Math.sin(t*theta)/sin;}
   let length=0;for(let k=3;k<7;k++){const q=v[a+i+k]*w0+v[b+i+k]*w1*sign;out[i+k]=q;length+=q*q;}
   length=Math.sqrt(length);for(let k=3;k<7;k++)out[i+k]/=length;
  }
  return out;
 }
}
