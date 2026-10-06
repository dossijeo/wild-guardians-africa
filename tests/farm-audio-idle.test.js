import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkAudio} from '../src/audio/work-audio.js';
import {FarmContactAudio} from '../src/audio/farm-contact-audio.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

for(const Audio of [WorkAudio,FarmContactAudio]){
  for(const status of ['idle','walking','carrying','fleeing','returning'])test(`${Audio.name}: ${status} does not inspect the task FIFO`,()=>{
    const audio=new Audio(()=>{throw Error('unexpected contact');},()=>{},()=>0);
    const state={elapsed:0,pauses:[],workers:Array.from({length:100},(_,i)=>({id:i,status}))};
    Object.defineProperty(state,'tasks',{get(){throw Error('unnecessary FIFO scan');}});
    for(let i=0;i<100;i++){state.elapsed=i*.05;audio.update(state);}
    audio.dispose();
  });

  test(`${Audio.name}: non-acting transition releases a voice without inspecting tasks`,async()=>{
    const source={},stopped=[],worker={id:'w',profile:'olderFemale',status:'acting',taskId:'t',actionRemaining:2,x:0,z:0};
    const state={elapsed:0,pauses:[],workers:[worker],tasks:[{id:'t',kind:'water',targetId:'p'}],plants:[{id:'p',alive:true}],crates:[]};
    const audio=new Audio(()=>source,voice=>stopped.push(voice),()=>0);
    if(Audio===WorkAudio){audio.update(state);await flush();}
    else{
      // Cross the native pour-contact marker instead of injecting an entry.
      worker.actionRemaining=3.4;audio.update(state);
      for(let i=1;i<=28;i++){state.elapsed=i*.05;worker.actionRemaining=3.4-i*.05;audio.update(state);await flush();}
    }
    assert.ok(audio.entries.get('w')?.source===source||audio.entries.get('w')?.voices.has(source));
    worker.status='fleeing';state.elapsed+=.05;
    Object.defineProperty(state,'tasks',{get(){throw Error('unnecessary FIFO scan');}});
    assert.doesNotThrow(()=>audio.update(state));assert.ok(stopped.includes(source));assert.equal(audio.entries.size,0);
    audio.dispose();
  });

  test(`${Audio.name}: active cohort reads the FIFO once per update and sees replacement tasks`,()=>{
    const workers=Array.from({length:100},(_,i)=>({id:i,profile:'olderFemale',status:'acting',taskId:'t',actionRemaining:3.4,x:0,z:0}));
    let reads=0,tasks=[{id:'t',kind:'water',targetId:'p'}];
    const state={elapsed:0,pauses:[],workers,plants:[{id:'p',alive:true}],crates:[]};
    Object.defineProperty(state,'tasks',{get(){reads++;return tasks;}});
    const audio=new Audio(()=>null,()=>{},()=>0);audio.update(state);assert.equal(reads,1);
    tasks=[];state.elapsed=.05;audio.update(state);assert.equal(reads,2);assert.equal(audio.entries.size,0);audio.dispose();
  });
}
