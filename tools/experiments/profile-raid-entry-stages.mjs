import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {deserialize} from '../../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../../src/world/navigation.js';
import {raidEntryRequest} from '../../src/world/raid-entry-data.js';
import {chooseRaidEntry,warmRaidApproaches} from '../../src/simulation/raids.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const directory=resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Usage: node profile-raid-entry-stages.mjs CAMPAIGN_DIRECTORY [entry|first|trace|warm]');
const mode=process.argv[3]??'entry';
if(!['entry','first','trace','warm'].includes(mode))throw Error('Mode must be entry, first, trace or warm');
const partial=JSON.parse(readFileSync(resolve(directory,'partial.json'),'utf8'));
const state=deserialize(gunzipSync(readFileSync(resolve(directory,'partial-state.json.gz'))).toString());
const key=partial.entryTransport.waits.at(-1).key,inputs=JSON.parse(key);
const group=inputs[6],bounds=inputs[7],view=inputs[8];
const profile=JSON.parse(readFileSync(new URL(`../../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
const nav=new Navigation(state.seed,state.biome,profile);
nav.setState(state);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
const request=raidEntryRequest(state,nav,group,key,1);
const probe=new Navigation(request.state.seed,request.state.biome,request.profile);
probe.setState(request.state);probe.setActiveBounds(request.bounds);probe.setRaidView(request.view.eye,request.view.target);
const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
const began=performance.now(),entry=chooseRaidEntry(request.state,specs,bounds,randomInt(request.state,0,3),probe);
const entryMilliseconds=performance.now()-began;
console.log(JSON.stringify({phase:'entry',milliseconds:entryMilliseconds,group:group.length,found:!!entry,plants:request.state.plants.length,structures:request.state.structures.length}));
if(mode!=='entry'){
 if(mode==='trace'){
  const original=probe.findPathSteps.bind(probe);let searches=0;
  probe.findPathSteps=function*(...args){
   const search=++searches,began=performance.now(),steps=original(...args);let yields=0,step;
   do{
    step=steps.next();if(!step.done&&++yields%10000===0)console.log(JSON.stringify({phase:'path-progress',search,yields,milliseconds:performance.now()-began,start:args[0],end:args[1]}));
    if(!step.done)yield step.value;
   }while(!step.done);
   if(search<=5||search%200===0)console.log(JSON.stringify({phase:'path-end',search,yields,milliseconds:performance.now()-began,found:!!step.value,start:args[0],end:args[1]}));
   return step.value;
  };
 }
 const warmSpecs=mode==='first'||mode==='trace'?specs.slice(0,1):specs;
 const warmEntry=mode==='first'||mode==='trace'?{...entry,entries:entry.entries.slice(0,1)}:entry;
 const warmBegan=performance.now(),choices=warmRaidApproaches(request.state,warmSpecs,warmEntry,probe);
 console.log(JSON.stringify({phase:'warm',milliseconds:performance.now()-warmBegan,choices:choices.length,selected:choices.filter(Boolean).length}));
}
