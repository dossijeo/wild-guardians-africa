import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocationAsync} from '../src/world/villages.js';
import {centerServicePoint} from '../src/world/centers.js';
import {rational} from '../src/simulation/money.js';
import {isMature} from '../src/simulation/crops.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

// Controlled replay, not a natural campaign opening: 10000 explicit QA coins.
// All purchases, labour, watering, harvest, raids and dawn use production rules.
export async function prepareReplay(read,{seed=712,biome='sabana',culture='mapungubwe'}={}){
 const payload=(await read('villages')).find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
 const pack=await read('biome-'+BIOME_IDS[biome]),nav=new Navigation(seed,biome,pack.profile),place=await findInitialLocationAsync(nav,payload);
 const state=Game.newGame({seed,biome,culture,slotId:'qa-seed-replay'}),commands=[];
 Object.assign(state.villages[0],place);state.suppressed.push(...place.suppress);nav.setState(state);state.ledger.balance=rational(10000);Game.resume(state,'intro');
 const command=(id,kind,args,apply)=>{apply();commands.push({id,kind,args});};
 command('center','center',place.center,()=>Game.placeStructure(state,'center',place.center,nav));
 const center=state.structures[0],departure=centerServicePoint(center,state,.8),plots=[];
 for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
  const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
  if(nav.placement(p.x,p.z,.4).valid&&nav.path(departure,p,.28,null,true)&&nav.path(p,departure,.28,null,true))plots.push(p);
 }
 plots.sort((a,b)=>Math.hypot(a.x-departure.x,a.z-departure.z)-Math.hypot(b.x-departure.x,b.z-departure.z)||a.z-b.z||a.x-b.x);
 if(plots.length<15)throw new Error('Replay needs fifteen legal original-terrain plots');
 for(const [i,p] of plots.slice(0,15).entries()){const species=i<10?'mijo':'girasol',id='plant-'+i;command(id,'plant',{species,...p},()=>Game.plant(state,id,species,p.x,p.z,nav));}
 Game.openInitialHiring(state);command('hire-1','hire',{olderFemale:1,youngMale:1},()=>Game.hire(state,'hire-1',{olderFemale:1,youngMale:1}));state.tutorial.step='done';
 return {state,nav,payload,commands,command,checkpoint:0,trace:[],events:[]};
}
export async function runReplay(run,{visual=async()=>{},reloadAt=Infinity,maxSteps=1800}={}){
 const {nav,command}=run;let last=0,reloaded=false;
 for(let step=0;step<maxSteps;step++){
  const s=run.state;if(s.result||s.day>=3)break;
  if(s.pauses.includes('hiring'))command('hire-'+s.day,'hire',{olderFemale:1,youngMale:1},()=>Game.hire(s,'hire-'+s.day,{olderFemale:1,youngMale:1}));
  if(s.day>=2)for(const p of s.plants.filter(p=>p.species==='mijo'&&isMature(p)&&!p.harvestRequested))command('harvest-'+p.id,'harvest',{plantId:p.id},()=>Game.harvest(s,'harvest-'+p.id,p.id));
  Game.tick(s,1,nav);
  const fresh=s.events.filter(e=>Number(e.id.slice(6))>last);run.events.push(...fresh.map(e=>({...e})));last=Number(s.events.at(-1)?.id.slice(6)??last);
  if(!reloaded&&s.elapsed>=reloadAt){run.state=deserialize(serialize(s));nav.setState(run.state);reloaded=true;}
  if(step%50===0||fresh.some(e=>['NightStarted','Dawn','AgriculturalEventApplied','RaidSpawned','RaidEnded','GameOver'].includes(e.type))){
   const before=serialize(run.state);await visual(run,step);if(serialize(run.state)!==before)throw new Error('Presentation mutated replay domain at step '+step);
   run.trace.push({step,snapshot:before});run.checkpoint++;
  }
 }
 return {commands:run.commands,events:run.events,trace:run.trace,state:run.state,reloaded,checkpoints:run.checkpoint};
}
