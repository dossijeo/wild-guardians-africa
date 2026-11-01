import {isMainThread,parentPort,Worker} from 'node:worker_threads';
import {writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {Group,AnimationClip,AnimationMixer} from 'three';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastCombatPhysics,beastPhysicsRuntime} from '../../src/rendering/beast-combat-physics.js';

async function execute(){
 const init=performance.now(),R=await beastPhysicsRuntime();
 const model=beastSkin('hyena'),root=new Group();root.add(model);root.position.set(20,0,30);root.updateMatrixWorld(true);
 const animal={id:'beast',species:'hyena',x:20,z:30,status:'attacking',hitsRemaining:8,heading:0,radius:.7,attackRemaining:1,path:[{x:21,z:30}],magicImpact:{at:10,direction:{x:1,y:-.2,z:.2},intensity:1}};
 const state={elapsed:10,structures:[],plants:[],workers:[],raid:{animals:[animal],reservations:{}}};
 const world={state,nav:{field:{surface:()=>0}},objects:new Map([[animal.id,root]]),mixers:new Map([[animal.id,{model,mixer:new AnimationMixer(model),clips:[new AnimationClip('Walking',1,[])]}]]),onError:error=>{throw error;}};
 const manager=new BeastCombatPhysics(world,R),initializationMs=performance.now()-init,samples=[],times=[],phases=new Set();
 try{
  for(let i=0;i<480;i++){
   state.elapsed+=1/60;
   if(i===30)animal.magicImpact={at:state.elapsed,direction:{x:-1,y:-.2,z:.2},intensity:1};
   const start=performance.now();manager.step(state,1/60);manager.before(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);manager.render(animal.id);times.push(performance.now()-start);
   const entry=manager.entries.get(animal.id);phases.add(animal.magicDown?.phase??'released');
   samples.push({elapsed:state.elapsed,x:animal.x,z:animal.z,heading:animal.heading,status:animal.status,path:animal.path,attackRemaining:animal.attackRemaining,magicDown:animal.magicDown?{...animal.magicDown}:null,pose:entry?Array.from(entry.actor.pose):null});
  }
  const sorted=[...times].sort((a,b)=>a-b),p=q=>sorted[Math.floor((sorted.length-1)*q)];
  return {samples,phases:[...phases],initializationMs,timing:{p95:p(.95),p99:p(.99),max:sorted.at(-1)}};
 }finally{manager.dispose();}
}

if(!isMainThread){execute().then(result=>parentPort.postMessage({result}),error=>parentPort.postMessage({error:String(error.stack??error)}));}
else{
 const runs=[];
 for(let run=0;run<3;run++){
  const reference=await execute(),wall=performance.now();
  const remote=await new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url));worker.once('error',reject);worker.once('message',m=>m.error?reject(Error(m.error)):resolve(m.result));});
  const workerWallMs=performance.now()-wall;
  let firstDifference=-1;for(let i=0;i<reference.samples.length;i++)if(JSON.stringify(reference.samples[i])!==JSON.stringify(remote.samples[i])){firstDifference=i;break;}
  if(firstDifference!==-1||!reference.phases.includes('falling')||!reference.phases.includes('released'))throw Error(`Parity or phases failed: ${firstDifference}, ${reference.phases}`);
  runs.push({equal:true,steps:reference.samples.length,phases:reference.phases,firstDifference,main:{initializationMs:reference.initializationMs,timing:reference.timing},worker:{initializationMs:remote.initializationMs,timing:remote.timing,wallMs:workerWallMs}});
 }
 const report={runs,scope:'Node worker_threads, one test rig and real Rapier, flat ground, repeated hit, physical pose and selected logical state compared each step; no Game.tick, browser Worker, WebGL, obstacles, animation clips or performance parity claim.'};
 await writeFile('docs/lighting/tree-near-retexture/performance/mobility-physics-worker-parity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
