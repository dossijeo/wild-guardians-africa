import {plant,previewCenter,placeStructure,observeGameEvents,pause,resume} from '/src/simulation/game.js';

export async function exerciseCrop(w){
 let centerSetup=null;
 if(!w.state.structures.some(s=>s.kind==='center'&&s.status==='intact')){
  const pauses=[...w.state.pauses];
  try{
   for(const reason of pauses)resume(w.state,reason);
   outer:for(let r=8;r<=32;r+=4)for(let a=0;a<8;a++){
    const x=w.controls.target.x+Math.cos(a*Math.PI/4)*r,z=w.controls.target.z+Math.sin(a*Math.PI/4)*r;
    const draft=previewCenter(w.state,{x,z},w.nav);if(!draft.valid)continue;
    placeStructure(w.state,'qa-yard-center',{x,z},w.nav);centerSetup={x:draft.x,z:draft.z};break outer;
   }
   if(!centerSetup)throw Error('No valid center placement');
  }finally{for(const reason of pauses)pause(w.state,reason);}
  w.sync(0);w.render(1/30);
 }
 const q=w.qaContinuousGrass,events=[],stops=observeGameEvents(w.state,e=>events.push(e.type));
 const items=()=>[...q.tiles.values()].flatMap(t=>t.items);
 const candidates=items().filter(p=>Math.hypot(p[0]-w.controls.target.x,p[2]-w.controls.target.z)<18);
 const site=candidates.find(p=>w.nav.placement(p[0],p[2],.4).valid&&!w.state.plants.some(c=>c.alive&&Math.hypot(c.x-p[0],c.z-p[2])<2.5));
 if(!site){stops();throw Error('No eligible grass-covered crop site');}
 const near=()=>items().filter(p=>Math.hypot(p[0]-site[0],p[2]-site[2])<2.2).length;
 const before=near(),previous=[...w.state.pauses],count=w.state.plants.length;
 try{
  for(const reason of previous)resume(w.state,reason);
  try{plant(w.state,'qa-yard-crop','maiz',site[0],site[2],w.nav);}catch(e){throw Error(e.message+JSON.stringify({pauses:w.state.pauses,result:w.state.result,raid:w.state.raid,structures:w.state.structures.map(s=>({kind:s.kind,status:s.status})),time:w.state.time}));}
 }finally{for(const reason of previous)pause(w.state,reason);stops();}
 const dirtyAfterEvent=q.occupancyDirty;
 w.sync(0);w.render(1/30);
 const after=near();
 if(w.state.plants.length!==count+1||!events.includes('CropPlaced')||!dirtyAfterEvent||before===0||after!==0)throw Error(JSON.stringify({before,after,events,dirtyAfterEvent}));
 return {centerSetup,site:[site[0],site[2]],before,after,events,dirtyAfterEvent,dirtyAfterSync:q.occupancyDirty,coverage:q.audit(),note:'Real plant command; paused immediately after synchronous command. Cached module anchors checked within crop exclusion radius, not animated blade extents.'};
}
