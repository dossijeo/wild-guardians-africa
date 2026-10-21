// Diagnostic call accounting, deliberately separate from timing comparisons.
// Counts bytes submitted by GL API calls, not driver traffic or VRAM residency.
export function traceUploadTraffic(gl,{rendererMemory=null}={}){
 const original=new Map();let frame;
 const reset=()=>frame={bufferAllocationBytes:0,bufferUploadBytes:0,rendererBufferUploadBytes:rendererMemory?0:null,textureUploadBytes:0,bufferCalls:0,textureCalls:0};reset();
 const bytes=(data,offset=0,length)=>{if(!data)return 0;const stride=data.BYTES_PER_ELEMENT??1;return (length||((data.length??data.byteLength)-offset))*stride;};
 const wrap=(name,record)=>{if(typeof gl[name]!=='function')return;const fn=gl[name];original.set(name,fn);gl[name]=function(...args){record(args);return fn.apply(this,args);};};
 const uploaded=(data,n)=>{frame.bufferUploadBytes+=n;if(rendererMemory&&data?.buffer===rendererMemory)frame.rendererBufferUploadBytes+=n;};
 wrap('bufferData',a=>{frame.bufferCalls++;if(typeof a[1]==='number')frame.bufferAllocationBytes+=a[1];else{const n=bytes(a[1],a[3],a[4]);frame.bufferAllocationBytes+=n;uploaded(a[1],n);}});
 wrap('bufferSubData',a=>{frame.bufferCalls++;uploaded(a[2],bytes(a[2],a[3],a[4]));});
 const pixelBytes=(format,type)=>{
  const channels=format===gl.RGBA||format===gl.RGBA_INTEGER?4:format===gl.RGB||format===gl.RGB_INTEGER?3:format===gl.RG||format===gl.RG_INTEGER?2:1;
  if(type===gl.UNSIGNED_SHORT_4_4_4_4||type===gl.UNSIGNED_SHORT_5_5_5_1||type===gl.UNSIGNED_SHORT_5_6_5)return 2;
  if(type===gl.UNSIGNED_INT_24_8||type===gl.UNSIGNED_INT_2_10_10_10_REV||type===gl.UNSIGNED_INT_10F_11F_11F_REV||type===gl.UNSIGNED_INT_5_9_9_9_REV)return 4;
  return channels*(type===gl.FLOAT||type===gl.UNSIGNED_INT||type===gl.INT?4:type===gl.HALF_FLOAT||type===gl.UNSIGNED_SHORT||type===gl.SHORT?2:1);
 };
 wrap('texSubImage2D',a=>{frame.textureCalls++;const explicit=a.length>=9,w=explicit?a[4]:(a[6]?.width??0),h=explicit?a[5]:(a[6]?.height??0);frame.textureUploadBytes+=w*h*pixelBytes(a[explicit?6:4],a[explicit?7:5]);});
 wrap('texImage2D',a=>{frame.textureCalls++;const explicit=a.length>=9,data=a[explicit?8:5];if(data){const w=explicit?a[3]:data.width,h=explicit?a[4]:data.height;frame.textureUploadBytes+=w*h*pixelBytes(a[explicit?6:3],a[explicit?7:4]);}});
 return {reset,snapshot:()=>({...frame}),dispose(){for(const [name,fn] of original)gl[name]=fn;original.clear();}};
}
