// Run with `node tools/experiments/benchmark-money-add.mjs` on either revision.
// The reference keeps the original cross-product addition for a paired A/B test.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {add,rational} from '../../src/simulation/money.js';

const reference=(a,b)=>rational(BigInt(a.n)*BigInt(b.d)+BigInt(b.n)*BigInt(a.d),
  BigInt(a.d)*BigInt(b.d));
const terms=Array.from({length:200},(_,i)=>rational(BigInt((i*37)%127+1),
  BigInt(1000003+i*20)));
const growthFixture=JSON.parse(readFileSync(new URL(
  '../../docs/qa/exact-money-performance/manglares-day11-growth-operand.json',
  import.meta.url)));
const workloads=[
  {name:'distinct-denominators',start:rational(0),terms},
  {name:'restored-growth-account',start:growthFixture.consumed,
    terms:Array(1000).fill(rational(1,1000000000))}
];
const sourceHash=createHash('sha256').update(readFileSync(new URL(
  '../../src/simulation/money.js',import.meta.url))).digest('hex');
const run=(fn,start,values)=>{
  const started=performance.now();
  let sum=start;
  for(const term of values)sum=fn(sum,term);
  return {ms:performance.now()-started,sum};
};
const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return (sorted[1]+sorted[2])/2;
};
const results=workloads.map(workload=>{
  const {start,terms:values}=workload;
  for(const fn of [reference,add])run(fn,start,values);
  const samples={reference:[],candidate:[]};
  const expected=run(reference,start,values).sum;
  for(const name of ['reference','candidate','candidate','reference',
    'candidate','reference','reference','candidate']){
    const result=run(name==='reference'?reference:add,start,values);
    samples[name].push(result.ms);
    if(result.sum.n!==expected.n||result.sum.d!==expected.d)
      throw Error(`${name} changed the exact rational sum`);
  }
  return {name:workload.name,terms:values.length,
    referenceMedianMs:median(samples.reference),
    candidateMedianMs:median(samples.candidate),samples};
});
console.log(JSON.stringify({sourceHash,node:process.version,results},null,2));
