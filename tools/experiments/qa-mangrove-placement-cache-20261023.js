// Real game command in the disposable QA fixture; no synthetic mask writes.
export async function verifyCropPlacementCache(w){
 const url=performance.getEntriesByType('resource').map(r=>r.name).find(u=>/\/src\/simulation\/game\.js(?:\?|$)/.test(u));
 const game=await import(url),s=w.state,c=w.mangroveMaterialCache;
 if(!c||!s.plants.length)throw Error('Placement cache fixture missing');
 const snapshot=()=>({plants:s.plants.length,objects:w.objects.size,entries:c.queue.entries.size,bytes:c.queue.stats.bytes,publications:c.queue.stats.published,invalidations:c.stats.invalidations});
 const seed=s.plants[0],before=snapshot(),masks=new Map([...c.states].map(([key,v])=>[key,new Uint8Array(v.mask.image.data)]));
 let point=null;
 for(let radius=2;radius<=10&&!point;radius+=2)for(let i=0;i<16&&!point;i++){
  const x=seed.x+Math.cos(i*Math.PI/8)*radius,z=seed.z+Math.sin(i*Math.PI/8)*radius;
  if(s.plants.some(p=>p.alive!==false&&Math.hypot(p.x-x,p.z-z)<1.2))continue;
  if(w.nav.placement(x,z,.4).valid)point={x,z};
 }
 if(!point)throw Error('No valid nearby crop placement');
 let accepted;game.resume(s,'menu');try{accepted=game.plant(s,'qa-ground-real-crop',seed.species,point.x,point.z,w.nav);}finally{game.pause(s,'menu');}
 if(accepted===false||s.plants.length!==before.plants+1)throw Error('Crop placement not committed');
 const crop=s.plants.at(-1);w.syncResidentProps();
 const priorUpdate=w.cropBatch.update;let batchSawCrop=false;w.cropBatch.update=function(plants,...args){batchSawCrop ||= plants.some(p=>p.id===crop.id);return priorUpdate.call(this,plants,...args);};
 try{for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);w.render(0);}}finally{w.cropBatch.update=priorUpdate;}
 if(!batchSawCrop)throw Error('Placed crop missing renderer batch');
 let changedMaskBytes=0;for(const [key,data]of masks){const current=c.states.get(key)?.mask.image.data;if(!current)throw Error('Unexpected chunk removal');for(let i=0;i<data.length;i++)changedMaskBytes+=Number(data[i]!==current[i]);}
 const after=snapshot();if(w.renderer.getContext().getError())throw Error('Placement GL error');
 return {before,after,crop:{id:crop.id,species:crop.species,x:crop.x,z:crop.z},rendererBatchSawCrop:true,changedMaskBytes,capture:w.renderer.domElement.toDataURL('image/png').split(',')[1],scope:'Real crop command with normal navigation and event flow; paused fixture, no construction or synthetic mask invalidation'};
}
