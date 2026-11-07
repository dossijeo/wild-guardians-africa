// Headless geometry/query evidence only: not a campaign or GPU benchmark.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture} from './probe-raid-reservation-saturation.mjs';
import {createPlant} from '../src/simulation/crops.js';
import {resolveAgriculturalImpact,agriculturalQueryStats} from '../src/simulation/raid-agricultural-impact.js';
const out=process.argv[2]??'docs/qa/raid-agricultural-impact';mkdirSync(out,{recursive:true});
const rows=[];
for(const distant of [0,400,4000]){
 const {s,nav}=fixture('mono');s.plants=[[40,0],[40,1],[41,1]].map(([x,z],i)=>createPlant('near'+i,'mijo',x,z,'center'));
 for(let i=0;i<distant;i++)s.plants.push(createPlant('far'+i,'mijo',500+i*2,500,'center'));nav.setState(s);
 const make=(id,damage)=>({id,species:'warthog',x:40,z:-1.7,radius:1.1,heading:0,attackId:id,damageProfile:{cropDamage:damage,structureDamage:25,attackRadius:3,areaCap:7,peripheralWeight:.5}});
 const first=resolveAgriculturalImpact(s,make('real-first',1),s.plants[0],nav),coldStats=agriculturalQueryStats(s.plants);
 // Zero-damage contacts still query geometry without inventing kills or resetting HP.
 for(let i=0;i<1000;i++)resolveAgriculturalImpact(s,make('probe'+i,0),s.plants[0],nav);
 rows.push({distant,first,coldStats,warmStats:agriculturalQueryStats(s.plants),localCandidatesPerProbe:(agriculturalQueryStats(s.plants).visited-coldStats.visited)/1000,rng:s.rng});
}
writeFileSync(out+'/query-evidence.json',JSON.stringify({scope:'Operation counts, static native geometry, no elapsed-time/GPU/campaign claim',rows},null,2)+'\n');
const files=['src/simulation/raid-agricultural-impact.js','src/simulation/raids.js','src/persistence/snapshots.js','tests/raid-agricultural-impact.test.js','tests/player-raids.test.js','tools/probe-agricultural-impact-query.mjs'];
writeFileSync(out+'/source.json',JSON.stringify({base:'ef2222cd282bb8a6297ebaeeb7dd5bf8609e5498',files:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))},null,2)+'\n');
