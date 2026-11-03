import {createSimulation} from './mobility-worker-simulation-core.js';
let simulation,actor,from,to,future,startTime,endTime,version=1;
try{
 simulation=await createSimulation({segmentTrace:true});const {game,session}=simulation.diagnosticWorld(),previous=new Map((game.raid?.animals??[]).map(a=>[a.id,{x:a.x,z:a.z,status:a.status}]));startTime=game.elapsed;const batch=simulation.run(5,.05,{full:false});endTime=game.elapsed;
 let maxDistance=0,moving=0,clear=0,rows=[];for(const a of game.raid?.animals??[]){const start=previous.get(a.id),end={x:a.x,z:a.z},distance=start?Math.hypot(end.x-start.x,end.z-start.z):0;const options={worker:false,species:a.species},directClear=distance>.04&&session.actorStepClear(start,end,options);rows.push({id:a.id,species:a.species,fromStatus:start?.status,toStatus:a.status,distance,startStand:session.actorCanStand(start,options),endStand:session.actorCanStand(end,options),directClear,observedSegments:batch.movementSegments.reduce((n,list)=>n+list.filter(segment=>segment.id===a.id).length,0)});maxDistance=Math.max(maxDistance,distance);if(distance>.04)moving++;if(directClear){clear++;for(const [dx,dz] of [[1.4,0],[-1.4,0],[0,1.4],[0,-1.4]]){const candidate={x:end.x+dx,z:end.z+dz};if(session.actorStepClear(end,candidate,{worker:false,species:a.species})){actor=a;from=start;to=end;future=candidate;break;}}if(actor)break;}}
 if(!actor)postMessage({kind:'unavailable',biome:game.biome,animals:game.raid?.animals.length,maxDistance,moving,clear,rows});else postMessage({kind:'ready',actor:{id:actor.id,species:actor.species},from,to,startTime,endTime,biome:game.biome});
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=({data})=>{try{
 if(!simulation||data.kind!=='change'||data.actorId!==actor.id||data.worldVersion!==version||data.token!=='command-1')throw Error('Invalid command');
 const {session,game}=simulation.diagnosticWorld(),options={worker:false,species:actor.species},started=performance.now();let queries=0;do{const x=game.villages[0].x-10+(queries%7)*3,z=game.villages[0].z-10+(Math.floor(queries/7)%7)*3;session.routeActorNative({x,z},{x:x+7,z:z+6},options);queries++;}while(performance.now()-started<300);
 if(!session.actorStepClear(to,future,options))throw Error('Future control already blocked');const barrier=session.core.addOrientedBarrier(future.x,future.z,.35,.35,0,0),stopSafe=session.actorCanStand(to,options),futureBlocked=!session.actorCanStand(future,options);if(!barrier||!stopSafe||!futureBlocked)throw Error('Invalid native barrier result');version++;
 postMessage({kind:'changed',token:data.token,barrier,stopSafe,futureBlocked,future,queries,elapsedMs:performance.now()-started,event:{worldVersion:version,at:endTime,point:to,version:2}});
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};



