import {LOCOMOTION as L} from './locomotion-calibration.js';
import {moveWorker} from './locomotion.js';

// Cosmetic choices have their own persisted stream: waiting never consumes a raid/event roll.
function seedFor(worker,seed){
  let value=2166136261;
  for(const char of `${seed}:${worker.personId??worker.id}`)value=Math.imul(value^char.charCodeAt(0),16777619);
  return value>>>0||1;
}
function random(idle){let x=idle.rng;x^=x<<13;x^=x>>>17;x^=x<<5;idle.rng=x>>>0;return idle.rng/4294967296;}
export function cancelIdle(worker){
  if(worker.idleState?.mode==='walk'){worker.path=null;worker.destinationId=null;}
  worker.idleState=null;worker.running=false;
}
export function updateIdle(worker,anchor,seconds,nav,seed){
  const source=L.sources.find(s=>s.profile===worker.profile);
  let idle=worker.idleState;
  if(!idle||idle.anchorId!==anchor.id){
    cancelIdle(worker);
    idle=worker.idleState={anchorId:anchor.id,mode:'rest',elapsed:0,rng:seedFor(worker,seed),remaining:source.idleSeconds*2};
  }
  worker.running=false;
  if(idle.mode==='walk'){
    if(idle.pathVersion!==nav.version){
      const path=localPath(worker,idle.destination,anchor,nav);
      if(!path){cancelWalk(worker,idle,source);return;}
      worker.path=path;idle.pathVersion=nav.version;
    }
    const previous={x:worker.x,z:worker.z};
    const arrived=moveWorker(worker,seconds); // Ambient walking never requests a run.
    if(Math.hypot(worker.x-previous.x,worker.z-previous.z)>1e-9)worker.heading=Math.atan2(worker.x-previous.x,worker.z-previous.z);
    if(arrived)cancelWalk(worker,idle,source);
    return;
  }
  idle.elapsed+=seconds;idle.remaining-=seconds;
  if(idle.remaining>1e-9)return;
  if(idle.mode==='rest'){
    idle.mode='watch';idle.elapsed=0;idle.remaining=source.alertSeconds*(1+Math.floor(random(idle)*2));return;
  }
  if(random(idle)<1/3&&Math.hypot(worker.x-anchor.x,worker.z-anchor.z)<=8){
    for(let attempt=0;attempt<12;attempt++){
      const angle=random(idle)*Math.PI*2,radius=2+random(idle)*5.5;
      const destination={id:`idle-${worker.id}`,x:anchor.x+Math.sin(angle)*radius,z:anchor.z+Math.cos(angle)*radius};
      const path=localPath(worker,destination,anchor,nav);
      if(!path||Math.hypot(worker.x-destination.x,worker.z-destination.z)<.75)continue;
      idle.mode='walk';idle.destination=destination;idle.pathVersion=nav.version;idle.elapsed=0;
      worker.path=path;worker.destinationId=destination.id;worker.pathVersion=nav.version;return;
    }
  }
  cancelWalk(worker,idle,source);
}
function localPath(worker,destination,anchor,nav){
  const path=nav.path(worker,destination,.28,null,true);
  return path&&path.every(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)<=8)?path:null;
}
function cancelWalk(worker,idle,source){
  worker.path=null;worker.destinationId=null;idle.mode='rest';idle.elapsed=0;
  idle.remaining=source.idleSeconds*(2+Math.floor(random(idle)*3));
}
