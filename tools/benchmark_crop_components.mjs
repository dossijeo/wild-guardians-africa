import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createCropGrouping} from '../src/simulation/crop-components.js';
import {contiguousGroup} from '../src/simulation/crops.js';

assert.ok(process.argv[2],'Pass output JSON');
const report={scope:'Isolated CPU enumeration of crop components used by raid target selection. Includes index construction and preserves every BFS member order. Not pathfinding, complete raid timing, FPS or RAM.',cases:[]};
for(const [name,count,spacing,mixed] of [['small',20,1.5,false],['dense',1200,1.5,false],['sparse',1200,3,false],['mixed',1200,1.5,true]]){
 const plants=Array.from({length:count},(_,i)=>({id:'p-'+i,alive:true,species:mixed?['maiz','mijo','algodon'][i%3]:'mijo',x:(i%40)*spacing,z:Math.floor(i/40)*spacing}));
 const enumerate=indexed=>{const index=indexed?createCropGrouping(plants):null,seen=new Set(),groups=[];for(const p of index?.living??plants.filter(p=>p.alive))if(!seen.has(p.id)){const group=index?index.group(p):contiguousGroup(plants,p);for(const q of group)seen.add(q.id);groups.push(group.map(q=>q.id));}return groups;};
 const times={reference:[],candidate:[]};let components;
 for(let sample=0;sample<35;sample++){
  const outputs={};for(const mode of sample%2?['candidate','reference']:['reference','candidate']){const start=performance.now();outputs[mode]=enumerate(mode==='candidate');if(sample>=5)times[mode].push(performance.now()-start);}
  assert.deepEqual(outputs.candidate,outputs.reference);components=outputs.candidate.length;
 }
 const median=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
 const row={name,count,components,referenceMedianMs:median(times.reference),candidateMedianMs:median(times.candidate),times};report.cases.push(row);writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...row,times:undefined}));
}
