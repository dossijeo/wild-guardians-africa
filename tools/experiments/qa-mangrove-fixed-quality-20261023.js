export async function verifyFixedQuality(w,{control=false}={}){
 const c=w.mangroveMaterialCache;if(!c)throw Error('Integrated cache missing');const original=w.quality,samples=[];
 try{for(const quality of (control?Array(5).fill(original):['media','muy_baja','media','muy_baja','media'])){
  if(!control)w.qualitySetting(quality);for(let i=0;i<45;i++)await new Promise(requestAnimationFrame);
  const states=[...c.states.values()],ground=[...w.chunks.values()].map(g=>g.children.find(m=>m.userData.ground).material);
  samples.push({quality,entries:c.queue.entries.size,bytes:c.queue.stats.bytes,publications:c.queue.stats.published,hooks:states.reduce((n,s)=>n+s.hooks.size,0),tracked:states.reduce((n,s)=>n+s.record.materials.size,0),unpatched:ground.filter(m=>!states.some(s=>s.hooks.has(m))).length,capture:w.renderer.domElement.toDataURL('image/png').split(',')[1],memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError()});
 }
 if(samples.some(s=>s.unpatched||s.glError||s.hooks!==s.tracked))throw Error('Quality switch lost cache patch');
 return {control,samples,scope:'Real quality switches; cache hook ownership and GL validation'};
 }finally{if(!control)w.qualitySetting(original);}
}
