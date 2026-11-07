import {createWorld} from './mobility-worker-world-change.js';
let world,base;const options={worker:false,species:'hyena'};
try{
 world=await createWorld();
 for(let z=-10;z<=10&&!base;z+=2)for(let x=-10;x<=10&&!base;x+=2){const p={x:world.village.x+x,z:world.village.z+z},end={x:p.x+1.4,z:p.z};if(!world.session.actorStepClear(p,end,options))continue;const id=world.session.core.addOrientedBarrier(p.x+2.6,p.z,1.2,1.2,0,0);const safe=id>0&&world.session.actorStepClear(p,{x:p.x+.4,z:p.z},options)&&!world.session.actorCanStand(end,options);if(id>0)world.session.core.removeBarrier(id);if(safe)base=p;}
 if(!base||!world.network)throw Error('No native test path');postMessage({kind:'ready',base,network:world.network,chunks:world.chunks});
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=({data})=>{try{
 if(!world||data.kind!=='change'||data.token!=='command-1'||data.worldVersion!==1)throw Error('Invalid command');
 const started=performance.now();let queries=0;do{const x=world.village.x-12+(queries%7)*3,z=world.village.z-12+(Math.floor(queries/7)%7)*3;world.session.routeActorNative({x,z},{x:x+9,z:z+7},options);queries++;}while(performance.now()-started<500);
 const barrier=world.session.core.addOrientedBarrier(base.x+2.6,base.z,1.2,1.2,0,0),stopPoint={x:base.x+.4,z:base.z},future={x:base.x+1.4,z:base.z},stopSafe=world.session.actorStepClear(base,stopPoint,options),futureBlocked=!world.session.actorCanStand(future,options);
 if(!barrier||!stopSafe||!futureBlocked)throw Error('Native post-change checks failed');
 postMessage({kind:'changed',token:data.token,barrier,stopSafe,futureBlocked,queries,elapsedMs:performance.now()-started,event:{worldVersion:2,at:1,point:{x:.4,z:0},version:2}});
}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
