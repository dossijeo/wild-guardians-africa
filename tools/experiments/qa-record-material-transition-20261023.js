export async function recordMaterialTransition(w,{frames=180,fps=30}={}){
 const original=w.render,base=w.camera.position.clone(),stream=w.renderer.domElement.captureStream(fps),parts=[],samples=[];
 const mimeType=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));
 if(!mimeType){for(const track of stream.getTracks())track.stop();throw Error('WebM recorder unavailable');}
 const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});let index=0,timer;
 try{
  const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};recorder.onstop=resolve;recorder.onerror=e=>reject(Error(e.error?.message??'Video error'));timer=setTimeout(()=>reject(Error('Transition video timeout')),45000);});
  w.render=function(...args){w.camera.position.set(base.x+8*Math.sin(index/149*Math.PI*2),base.y,base.z);const value=original.apply(this,args);
   samples.push({frame:index,at:performance.now(),camera:w.camera.position.toArray(),retired:w.qaIncrementalGround?.queue.retired.size??0,transitions:[...(w.qaIncrementalGround?.states??new Map()).values()].flatMap(s=>Object.keys(s.transitions??{}).map(kind=>({key:s.record.key,kind,weight:s.uniforms[kind==='coarse'?'uQaCoarseFade':'uQaFineFade'].value})))});
   if(++index>=frames){w.render=original;recorder.stop();}return value;};
  recorder.start();await done;
  const bytes=new Uint8Array(await new Blob(parts,{type:mimeType}).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {mimeType,data:btoa(binary),samples,scope:'Real canvas recording with deterministic camera positions; recorder overhead excludes performance claims'};
 }finally{clearTimeout(timer);w.render=original;if(recorder.state!=='inactive')recorder.stop();for(const track of stream.getTracks())track.stop();w.camera.position.copy(base);w.render(0);}
}
