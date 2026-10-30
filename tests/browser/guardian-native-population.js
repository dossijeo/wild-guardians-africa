// QA only: derived native farm; production placement and hiring validation remain active.
import * as Game from '../../src/simulation/game.js';
import {transact,rational} from '../../src/simulation/money.js';
import {planNight} from '../../src/simulation/raids.js';
import {serialize} from '../../src/persistence/snapshots.js';
export async function populateNativeGuardianTrial(state,nav){
 if(state.wildEngineWorldVersion!==1)throw Error('Native snapshot required');
 const source={day:state.day,workers:state.workers.length,crops:state.plants.length};
 state.day=5;state.time=150;state.pauses=[];state.initialPreparation=false;state.tutorial.step='done';state.hiringPaidDay=5;
 for(const worker of state.workers)worker.contractDay=5;
 transact(state.ledger,'qa-native-population-funding',rational(100000));
 const center=state.structures.find(s=>s.kind==='center'),rejections={};let attempts=0;
 const attempt=fn=>{try{return fn();}catch(error){const reason=String(error.message);rejections[reason]=(rejections[reason]??0)+1;return false;}};
 // Keep the benchmark farm near the loaded settlement. Each purchase updates native occupancy.
 for(let z=-18;z<=18&&state.plants.length<144;z+=1.5){
  for(let x=-18;x<=18&&state.plants.length<144;x+=1.5){attempts++;attempt(()=>Game.plant(state,'qa-native-crop-'+attempts,'mijo',center.x+x,center.z+z,nav));}
  await new Promise(requestAnimationFrame);
 }
 for(let i=0;i<12;i++)attempt(()=>Game.placeStructure(state,'qa-native-wall-'+i,{kind:'wall',material:'zarzas',x:center.x-18+i*2,z:center.z+20},nav));
 Game.hireAdditional(state,'qa-native-workers',{youngMale:8,youngFemale:8,olderMale:8,olderFemale:7},center.id);
 state.dayPlan={done:true};state.raid=null;planNight(state);state.time=state.nightPlan.at;
 return {scope:'QA-derived native farm: day 5, funded purchases and renewed initial contract; validated placement/hiring. Not organically played progression.',source,attempts,rejections,counts:{workers:state.workers.length,crops:state.plants.length,structures:state.structures.length},snapshot:serialize(state)};
}
