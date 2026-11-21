import {observePathMotion} from './locomotion.js';

// Experimental capture of all other bodies over one authority advance. It
// reports gaps and roster changes; it does not certify collision-free playback.
export function captureMotionPeers(game,selected){
 const roster=()=>[...(game.raid?.animals??[]),...game.workers].filter(a=>a!==selected),initial=roster(),entries=[],started=game.elapsed;let rosterChanged=false;
 try{for(const actor of initial){const segments=[],entry={actor,start:{at:started,x:actor.x,z:actor.z},startStatus:actor.status,radius:actor.radius??.28,segments};entry.stop=observePathMotion(actor,(x0,z0,x1,z1,t0,t1)=>segments.push({at:game.elapsed,x0,z0,x1,z1,t0,t1}));entries.push(entry);}}
 catch(error){for(const e of entries)e.stop();throw error;}
 function checkpoint(){const current=roster();if(current.length!==initial.length||current.some((actor,i)=>actor!==initial[i]))rosterChanged=true;return current;}
 return {checkpoint,finish(){
  const current=checkpoint(),present=new Set(current),endAt=game.elapsed;
  const peers=entries.map(({actor,start,startStatus,radius,segments,stop})=>{stop();const end={at:endAt,x:actor.x,z:actor.z};let x=start.x,z=start.z,last=start.at,continuous=present.has(actor),timed=true;
   for(const s of segments){if(s.x0!==x||s.z0!==z)continuous=false;x=s.x1;z=s.z1;if(!Number.isFinite(s.t0)||!Number.isFinite(s.t1)||s.t0<last-1e-8||s.t1<s.t0||s.t1>endAt+1e-8)timed=false;else last=s.t1;}
   if(x!==end.x||z!==end.z)continuous=false;
   return {actorId:actor.id,start,end,startStatus,endStatus:actor.status,radius,segments,continuous,timed};});
  return {peers,rosterChanged};
 }};
}
