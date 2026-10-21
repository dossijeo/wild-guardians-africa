import {plant,observeGameEvents,pause,resume} from '/src/simulation/game.js';

// Runs real crop commands against the renderer stress fixture. Candidate search
// is QA setup, not frame preparation, and uses the existing placement authority.
export async function exerciseRendererMutations(w){
 if(!w.qaDenseFixture)throw Error('Mutation validation requires the dense fixture');
 // Crop commands require a peaceful fixture and an unpaused command boundary.
 // No asynchronous yield occurs before the pause is restored.
 const previousPauses=[...w.state.pauses];
 if(previousPauses.includes('context-lost'))throw Error('Cannot exercise commands with a lost context');
 w.state.raid=null;w.state.time=150;w.qaDenseFixture.animals=0;for(const reason of previousPauses)resume(w.state,reason);
 const module=w.assetGroups.qaWildRenderer,events=[],samples=[];
 const stop=observeGameEvents(w.state,event=>events.push(event.type));
 try{
  const candidates=[];
  for(const batch of module.sources.keys())for(const p of batch.instances)
   if(Math.hypot(p.x-w.controls.target.x,p.z-w.controls.target.z)<35)candidates.push(p);
  candidates.sort((a,b)=>a.x-b.x||a.z-b.z||a.id.localeCompare(b.id));
  for(const p of candidates){
   if(samples.length===3)break;
   if(w.state.plants.some(c=>c.alive&&Math.hypot(c.x-p.x,c.z-p.z)<1.1))continue;
   const check=w.nav.placement(p.x,p.z,.4);
   if(!check.valid||!check.suppress?.length)continue;
   const before=new Map(module?.sources??[]),oldCount=w.state.suppressed.length;
   if(module)module.metrics={};
   const start=performance.now();
   plant(w.state,`wr-mutation-${samples.length}`,'maiz',p.x,p.z,w.nav);
   const commandMs=performance.now()-start;
   const renderStart=performance.now();w.render(1/30);
   const renderMs=performance.now()-renderStart;
   const added=w.state.suppressed.slice(oldCount);
   if(added.some(id=>!w.nav.suppressed.has(id)))throw Error('Navigation suppression view not updated');
   const stale=[...module.sources.keys()].some(batch=>batch.instances.some(p=>added.includes(p.id)));
   if(stale)throw Error('Renderer retains a suppressed prop after confirmed event');
   let retained=0,retired=0;
   for(const [batch,source] of before)if(module.sources.get(batch)===source)retained++;else retired++;
   samples.push({x:p.x,z:p.z,commandMs,renderMs,addedSuppressions:w.state.suppressed.length-oldCount,
    retainedSources:retained,retiredSources:retired,metrics:{...module?.metrics}});
  }
  if(samples.length!==3)throw Error(`Only ${samples.length} valid mutation sites found`);
  if(events.filter(type=>type==='CropPlaced').length!==3)throw Error('Missing confirmed crop events');
  return {samples,events};
 }finally{stop();for(const reason of previousPauses)pause(w.state,reason);}
}
