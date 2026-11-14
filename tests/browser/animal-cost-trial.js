import * as Game from '../../src/simulation/game.js';
import {spawnRaid} from '../../src/simulation/raids.js';
import {installAnimalCostVariant} from './animal-cost-variant.js';
import {GpuTimer} from './gpu-timer.js';
const group=Array.from({length:16},(_,i)=>['hyena','lion','warthog','buffalo','rhino'][i%5]);
export function configureAnimalCostState(state){state.raid=null;state.nightPlan={...state.nightPlan,group,done:false};delete state.nightPlan.actors;delete state.nightPlan.waves;delete state.nightPlan.pressureVersion;state.time=state.nightPlan.at;}
const outcome=s=>({rng:s.rng,time:s.time,elapsed:s.elapsed,result:s.result,animals:s.raid?.animals??[],workers:s.workers,structures:s.structures,plants:s.plants});
const q=(values,p)=>{const a=[...values].sort((a,b)=>a-b);return a[Math.floor((a.length-1)*p)]??null;};
export async function prepareAnimalCostTrial({world,state,nav,variant,done}){
 const wait=()=>new Promise(requestAnimationFrame);let attempts=0;
 while(!state.raid&&attempts++<600){spawnRaid(state,state.nightPlan,nav);await wait();}
 if(state.raid?.animals.length!==16)throw Error('Native spawning did not produce sixteen actors');state.nightPlan.done=true;
 while(!world.raidReady()&&attempts++<900)await wait();if(!world.raidReady())throw Error('Actors did not finish loading');
 const xs=state.raid.animals.map(a=>a.x),zs=state.raid.animals.map(a=>a.z),x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2,y=nav.field.surface(x,z);
 world.raidCamera.beginManual();world.cinematic=true;world.camera.zoom=.85;world.camera.updateProjectionMatrix();world.controls.target.set(x,y+1,z);world.camera.position.set(x+22,y+28,z+27);world.controls.update();
 const adapter=await installAnimalCostVariant(world,variant),timer=new GpuTimer(world.renderer.getContext(),32),initial=structuredClone(outcome(state));
 // Compile every variant's selected materials before the timing window, without
 // advancing game time. Same count on all variants, no real-time warmup bias.
 for(let i=0;i<60;i++)await wait();
 const rows=[],originalFind=nav.findPath;let navMs=0,frame=0,simMs=0,query=false;nav.findPath=function(...args){const t=performance.now();try{return originalFind.apply(this,args);}finally{navMs+=performance.now()-t;}};
 const render=world.render;world.render=function(...args){query=timer.begin(frame);try{return render.apply(this,args);}finally{if(query)timer.end();}};
 const trial={advance(){adapter.reset();navMs=0;const t=performance.now();Game.tick(state,.05,nav);simMs=performance.now()-t;frame++;return true;},sample(row){timer.poll();rows.push({...row,frame,simulationMs:simMs,navigationFindPathMs:navMs,...adapter.stats,physics:{...world.beastPhysics.stats},triangles:world.renderer.info.render.triangles,heap:performance.memory?.usedJSHeapSize??null});if(frame>=400||state.result||state.pauses.length)this.finish();},finish(){world.render=render;nav.findPath=originalFind;const times=rows.map(r=>r.dt),report={kind:'animal-cost',variant,worldAuthority:'spatial-wasm',initial,final:structuredClone(outcome(state)),frames:rows.length,rows,averageFps:1000/(times.reduce((a,b)=>a+b,0)/times.length),medianFps:1000/q(times,.5),frameP95:q(times,.95),frameP99:q(times,.99),gpu:timer.report(),memory:{...world.renderer.info.memory},camera:{position:world.camera.position.toArray(),target:world.controls.target.toArray(),zoom:world.camera.zoom},resolution:[world.canvas.width,world.canvas.height],scope:adapter.scope,navigationScope:'Main-thread findPath wrapper only; worker CPU not directly observable',physicsScope:'Unchanged physics manager; no player Attack commands in this primary raid test; active counts recorded',adapter};delete report.adapter;timer.dispose();adapter.dispose();done(report);}};return trial;
}
