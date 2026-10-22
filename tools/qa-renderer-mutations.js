import {placeStructure,plant,quoteWallChain,buildWallChain,removeWall,observeGameEvents,pause,resume} from '/src/simulation/game.js';

// Actual gameplay command boundaries, never called by performance sampling.
export async function exerciseRendererMutations(w){
 const s=w.state,previousPauses=[...s.pauses],events=[],rows=[];
 s.raid=null;s.time=150;s.tutorial.step='done';
 const candidates=()=>[...w.chunks.values()].flatMap(g=>g.userData.lodBatches??[]).flatMap(b=>b.instances).filter(p=>Math.hypot(p.x-w.controls.target.x,p.z-w.controls.target.z)<100).sort((a,b)=>a.x-b.x||a.z-b.z);
 const stop=observeGameEvents(s,event=>events.push(event.type));
 const verify=label=>{
  w.render(0);
  const suppressed=new Set(s.suppressed);
  const stale=()=>[...new Set([...w.chunks.values()].flatMap(group=>group.userData.lodBatches??[]).flatMap(batch=>batch.instances).filter(p=>suppressed.has(p.id)).map(p=>p.id))].sort();
  for(const id of suppressed)if(!w.nav.suppressed.has(id))throw Error('Navigation did not confirm suppression');
  const snapshot=()=>[...w.assetGroups.shadows].map(([key,g])=>[key,g.mesh.count,Array.from(g.mesh.instanceMatrix.array.slice(0,g.mesh.count*16))]);
  rrSwap('main');w.syncResidentProps();w.render(0);const baseline=JSON.stringify(snapshot()),staleMain=stale();
  rrSwap('candidate');w.syncResidentProps();w.render(0);const staleCandidate=stale();
  if(staleCandidate.length||!staleMain.length&&JSON.stringify(snapshot())!==baseline)throw Error('Render mismatch after '+label);
  rows.push({label,suppressed:s.suppressed.length,chunks:w.chunks.size,plants:s.plants.length,structures:s.structures.length,staleMain,staleCandidate,suppressionContractPassed:staleCandidate.length===0,baselineSuppressionContractPassed:staleMain.length===0});
 };
 try{
  for(const reason of previousPauses)resume(s,reason);
  if(!s.structures.some(p=>p.kind==='center'&&p.hp>0)){if(!placeStructure(s,'rr-center',s.villages[0].center,w.nav))throw Error('Actual center command failed');verify('center-built');}
  let planted=0,checked=0,valid=0,suppressible=0;
  for(const p of candidates()){
   if(planted===3)break;
   if(s.plants.some(c=>c.alive&&Math.hypot(c.x-p.x,c.z-p.z)<1.1))continue;
   const check=w.nav.placement(p.x,p.z,.4);checked++;if(check.valid)valid++;if(check.suppress?.length)suppressible++;if(!check.valid||!check.suppress?.length)continue;
   const before=s.suppressed.length;
   if(!plant(s,'rr-crop-'+planted,'maiz',p.x,p.z,w.nav))continue;
   if(s.suppressed.length<=before)throw Error('Crop did not suppress prop');
   verify('crop-'+planted++);
  }
  if(planted!==3)throw Error('Insufficient actual crop command sites: '+JSON.stringify({planted,checked,valid,suppressible}));
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
  return {events,rows,suppressionContractPassed:rows.every(row=>row.suppressionContractPassed)};
 }finally{stop();for(const reason of previousPauses)pause(s,reason);}
}
