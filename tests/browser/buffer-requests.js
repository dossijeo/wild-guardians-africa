// QA only: requested buffer storage, NOT physical GPU memory or total RAM.
// Binding queries deliberately trade timing fidelity for correct VAO/target attribution.
const bindings = ['ARRAY_BUFFER','ELEMENT_ARRAY_BUFFER','COPY_READ_BUFFER','COPY_WRITE_BUFFER','PIXEL_PACK_BUFFER','PIXEL_UNPACK_BUFFER','TRANSFORM_FEEDBACK_BUFFER','UNIFORM_BUFFER'];
export class BufferRequests {
 constructor(gl) {
  this.gl=gl;this.storage=new Map();this.hooks=[];
  this.totals={requests:0,requestedBytes:0,replacedBytes:0,deletedBytes:0,liveBytes:0,peakBytes:0,unattributed:0};
  this.targets=new Map(bindings.filter(name=>Number.isInteger(gl[name])&&Number.isInteger(gl[name+'_BINDING'])).map(name=>[gl[name],gl[name+'_BINDING']]));
  try {
   this.wrap('bufferData',(args)=>{
    const [target,data,,offset=0,length]=args,binding=this.targets.get(target);
    const buffer=binding===undefined?null:gl.getParameter(binding);
    let bytes;
    if(typeof data==='number')bytes=data;
    else if(ArrayBuffer.isView(data)){
     const unit=data.BYTES_PER_ELEMENT??1,available=data.byteLength/unit-offset;
     bytes=(length===undefined||length===0?available:length)*unit;
    }else if(data instanceof ArrayBuffer)bytes=data.byteLength;
    if(!buffer||!Number.isSafeInteger(bytes)||bytes<0){this.totals.unattributed++;return;}
    const prior=this.storage.get(buffer)??0;
    this.storage.set(buffer,bytes);this.totals.requests++;this.totals.requestedBytes+=bytes;
    this.totals.replacedBytes+=prior;this.totals.liveBytes+=bytes-prior;
    this.totals.peakBytes=Math.max(this.totals.peakBytes,this.totals.liveBytes);
   });
   this.wrap('deleteBuffer',([buffer])=>{
    const bytes=this.storage.get(buffer)??0;this.storage.delete(buffer);
    this.totals.deletedBytes+=bytes;this.totals.liveBytes-=bytes;
   });
  }catch(error){this.dispose();throw error;}
 }
 wrap(name,observe){
  const gl=this.gl,original=gl[name],owned=Object.hasOwn(gl,name);
  if(typeof original!=='function')throw Error('Missing WebGL '+name);
  const wrapped=function(...args){const result=original.apply(this,args);observe(args);return result;};
  gl[name]=wrapped;this.hooks.push({name,original,owned,wrapped});
 }
 snapshot(){return {...this.totals,liveBuffers:this.storage.size,scope:'Observed bufferData requests minus replacement/deleteBuffer calls, after probe installation. WebGL errors are not polled. Excludes textures, programs, driver caches, JavaScript heap, earlier allocations and implicit context-loss release. Binding queries add QA overhead; do not use this run for frametime comparisons.'};}
 dispose(){for(const {name,original,owned,wrapped} of this.hooks)if(this.gl[name]===wrapped){if(owned)this.gl[name]=original;else delete this.gl[name];}this.hooks=[];this.storage.clear();}
}
