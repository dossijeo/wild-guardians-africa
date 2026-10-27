import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {createPlant,waterPlant} from '../../src/simulation/crops.js';
import * as Game from '../../src/simulation/game.js';

const seed=Number(process.argv[2]??712);
const biome=process.argv[3]??'sabana';
const output=process.argv[4];
const counts=[100,500,1500];
const arms=['control','growth','multiply','multiply','growth','control'];
const opening=await createSpatialCampaignOpening({seed,biome});
const {state,nav}=opening;
const results=[];
try{
  state.pauses=[];
  state.day=6;
  state.time=100;
  state.initialPreparation=false;
  state.tutorial.step='done';
  for(const count of counts)for(const [repetition,arm] of arms.entries()){
    state.time=100;
    state.spells=[];
    state.tasks=[];
    state.workers=[];
    state.plants=Array.from({length:count},(_,index)=>{
      const plant=createPlant(`benchmark-${count}-${repetition}-${index}`,'mijo',
        opening.start.site.center.x+5+(index%40)*1.5,
        opening.start.site.center.z+5+Math.floor(index/40)*1.5,null);
      waterPlant(plant);
      return plant;
    });
    const target=state.plants[0];
    const castAt=performance.now();
    if(arm!=='control')Game.cast(state,`benchmark-cast-${count}-${repetition}`,
      arm,target.x,target.z,nav,target.id);
    const castMs=performance.now()-castAt;
    const tickAt=performance.now();
    for(let tick=0;tick<50;tick++)Game.tick(state,.1,nav);
    const tickMs=performance.now()-tickAt;
    results.push({count,arm,repetition,castMs,tickMs,
      perTickMs:tickMs/50,heapUsed:process.memoryUsage().heapUsed,
      spellRemaining:state.spells[0]?.remaining??0});
  }
}finally{opening.dispose();}
const report={kind:'synthetic-simulation-cpu',seed,biome,ticksPerArm:50,
  note:'Measures Game.cast and Game.tick under Wild Engine; excludes Three.js, GPU and VFX.',
  results};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
