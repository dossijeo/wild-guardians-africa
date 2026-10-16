import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {commitAgriculturalPower,consumeGrowthPower} from '../../src/simulation/agricultural-power.js';
import {rational,add,negate,compare} from '../../src/simulation/money.js';

// Main before this experiment, restricted to initialized campaign accounts.
function baselineConsume(s,spell,extra){
  if(!spell.power||extra<=0)return;
  const a=s.agriculturalPower.days[spell.power.day].growth;
  const previous=spell.power.consumed??rational(0);
  const micros=rational(BigInt(Math.round(extra*1e9)),1000000000n);
  const candidate=add(previous,micros);
  const next=compare(spell.power.amount,candidate)<0?spell.power.amount:candidate;
  a.consumed=add(a.consumed,add(next,negate(previous)));
  spell.power.consumed=next;
}

const source=createHash('sha256').update(readFileSync(
  'src/simulation/agricultural-power.js')).digest('hex');
const scenarios=[
  {name:'already-exhausted',calls:5000,casts:1,spent:true},
  {name:'many-exhausted',calls:2000,casts:100,spent:true},
  {name:'active',calls:100,casts:1,spent:false},
  {name:'becomes-exhausted',calls:500,casts:1,spent:false},
];
const makeState=({spent,casts})=>{
  const s={day:1,plants:[],crates:[],spells:[]};
  for(let i=0;i<casts;i++){
    const plant={id:`bench-plant-${i}`,alive:true};s.plants.push(plant);
    const power=commitAgriculturalPower(s,plant,'growth',11);
    s.spells.push({kind:'growth',targetPlantId:plant.id,remaining:30,power});
    if(spent)power.consumed=power.amount;
  }
  if(spent){
    const a=s.agriculturalPower.days[1].growth;
    a.consumed=a.committed;
  }
  return s;
};
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const report=[];
for(const scenario of scenarios){
  const samples={baseline:[],candidate:[]},hashes={baseline:new Set(),candidate:new Set()};
  const execute=(name,record)=>{
    const s=makeState(scenario);
    const start=performance.now();
    const fn=name==='baseline'?baselineConsume:consumeGrowthPower;
    for(let i=0;i<scenario.calls;i++)fn(s,s.spells[i%s.spells.length],.05);
    const elapsed=performance.now()-start;
    const hash=createHash('sha256').update(JSON.stringify(s)).digest('hex');
    if(record){samples[name].push(elapsed);hashes[name].add(hash);}
  };
  execute('baseline',false);execute('candidate',false);
  for(const name of ['baseline','candidate','candidate','baseline',
    'candidate','baseline','baseline','candidate'])execute(name,true);
  assert.equal(hashes.baseline.size,1);
  assert.deepEqual([...hashes.candidate],[...hashes.baseline]);
  report.push({...scenario,baselineMedianMs:median(samples.baseline),
    candidateMedianMs:median(samples.candidate),samples,
    stateSha256:[...hashes.baseline][0]});
}
console.log(JSON.stringify({source,report},null,2));
