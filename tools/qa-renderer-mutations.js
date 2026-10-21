import {plant,quoteWallChain,buildWallChain,removeWall,observeGameEvents,pause,resume} from '/src/simulation/game.js';

// Actual gameplay command boundaries, never called by performance sampling.
export async function exerciseRendererMutations(w){
 const s=w.state,previousPauses=[...s.pauses],events=[],rows=[];
 s.raid=null;s.time=150;s.tutorial.step='done';
 const candidates=()=>[...w.chunks.values()].flatMap(g=>g.userData.lodBatches??[]).flatMap(b=>b.instances).filter(p=>Math.hypot(p.x-w.controls.target.x,p.z-w.controls.target.z)<35).sort((a,b)=>a.x-b.x||a.z-b.z);
 const stop=observeGameEvents(s,event=>events.push(event.type));
 const verify=label=>{
  w.render(0);
  const suppressed=new Set(s.suppressed);
  for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])if(batch.instances.some(p=>suppressed.has(p.id)))throw Error('Confirmed suppression left a render instance');
  const snapshot=()=>[...w.assetGroups.shadows].map(([key,g])=>[key,g.mesh.count,Array.from(g.mesh.instanceMatrix.array.slice(0,g.mesh.count*16))]);
  rrSwap('main');w.render(0);const baseline=JSON.stringify(snapshot());
  rrSwap('candidate');w.render(0);if(JSON.stringify(snapshot())!==baseline)throw Error('Shadow mismatch after '+label);
  rows.push({label,suppressed:s.suppressed.length,chunks:w.chunks.size,plants:s.plants.length,structures:s.structures.length});
 };
 try{
  for(const reason of previousPauses)resume(s,reason);
  let planted=0;
  for(const p of candidates()){
   if(planted===3)break;
   if(s.plants.some(c=>c.alive&&Math.hypot(c.x-p.x,c.z-p.z)<1.1))continue;
   const check=w.nav.placement(p.x,p.z,.4);if(!check.valid||!check.suppress?.length)continue;
   const before=s.suppressed.length;
   if(!plant(s,'rr-crop-'+planted,'maiz',p.x,p.z,w.nav))continue;
   if(s.suppressed.length<=before)throw Error('Crop did not suppress prop');
   verify('crop-'+planted++);
  }
  if(planted!==3)throw Error('Insufficient actual crop command sites');
  const options={maxPieces:1,smooth:false,snap:false};let selected;
  for(const p of candidates()){
   const points=[[p.x-1.2,p.z],[p.x+1.2,p.z]],plan=quoteWallChain(s,'empalizada',points,w.nav,options);
   if(plan.pieces.length&&plan.suppressed.length){selected={points,plan};break;}
  }
  if(!selected)throw Error('No actual wall command site');
  if(!buildWallChain(s,'rr-wall','empalizada',selected.points,w.nav,{...options,preparedPlan:selected.plan}))throw Error('Wall command failed');
  verify('wall-built');const wall=s.structures.find(p=>p.id===selected.plan.pieces[0].id);
  if(!wall)throw Error('Committed wall missing');removeWall(s,'rr-remove-wall',wall.id,w.nav);verify('wall-removed');
  if(events.filter(x=>x==='CropPlaced').length!==3||!events.includes('WallChainBuilt')||!events.includes('WallRemoved'))throw Error('Missing confirmed events');
  return {events,rows};
 }finally{stop();for(const reason of previousPauses)pause(s,reason);}
}
