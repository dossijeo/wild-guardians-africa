export async function verifyFixedQuality(w,{control=false,refreshShadow=false}={}){
 const c=w.mangroveMaterialCache;if(!c)throw Error('Integrated cache missing');const original=w.quality,samples=[];if(refreshShadow)w.releaseNativeShadow.cache.invalidate();
 try{for(const quality of (control?Array(5).fill(original):['media','muy_baja','media','muy_baja','media'])){
  if(control&&refreshShadow)w.releaseNativeShadow.cache.invalidate();
  if(!control)w.qualitySetting(quality);for(let i=0;i<45;i++)await new Promise(requestAnimationFrame);
  const states=[...c.states.values()],ground=[...w.chunks.values()].map(g=>g.children.find(m=>m.userData.ground).material);
  samples.push({quality,water:[...w.materialRegistry.waters].map(([m,u])=>({id:m.id,type:m.type,time:u.uTime.value,uniforms:Object.fromEntries(Object.entries(u).filter(([k,v])=>typeof v.value==='number').map(([k,v])=>[k,v.value]))})),far:w.farVegetation?.stats,shadow:{...w.releaseNativeShadow.cache.stats},entries:c.queue.entries.size,bytes:c.queue.stats.bytes,publications:c.queue.stats.published,hooks:states.reduce((n,s)=>n+s.hooks.size,0),tracked:states.reduce((n,s)=>n+s.record.materials.size,0),unpatched:ground.filter(m=>!states.some(s=>s.hooks.has(m))).length,capture:w.renderer.domElement.toDataURL('image/png').split(',')[1],memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError()});
 }
 if(samples.some(s=>s.unpatched||s.glError||s.hooks!==s.tracked))throw Error('Quality switch lost cache patch');
 return {control,refreshShadow,samples,scope:'Real quality switches; cache hook ownership and GL validation'};
 }finally{if(!control)w.qualitySetting(original);}
}
