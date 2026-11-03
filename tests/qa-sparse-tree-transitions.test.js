import test from 'node:test';
import assert from 'node:assert/strict';
import {FarTreeTransitions} from '../tools/experiments/far-tree-transitions.js';
import {QaSparseTreeTransitions} from '../tools/experiments/qa-sparse-tree-transitions.js';

test('sparse candidate transitions match complete recomputation through rebinds, suppression and readiness loss',()=>{
 const original=new FarTreeTransitions(),candidate=new QaSparseTreeTransitions(),controllers=[original,candidate],values=controllers.map(()=>new Map()),enabled=controllers.map(()=>new Map());
 const sinks=controllers.map((_,i)=>({setTreeReadiness:(id,v)=>values[i].set(id,v),setTreeEnabled:(id,v)=>enabled[i].set(id,v)}));
 let available=new Set(),rev=0,ready=true,ids=[];const coverage={get revision(){return rev;},has(id,suppressed){return available.has(id)&&!suppressed?.has(id);},candidates(){return available;}};
 const compare=()=>{assert.deepEqual([...candidate.states].sort(),[...original.states].sort());assert.deepEqual([...candidate.active].sort(),[...original.active].sort());for(const id of ids){assert.equal(values[1].get(id),values[0].get(id));assert.equal(enabled[1].get(id),enabled[0].get(id));}};
 let seed=1234567;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let step=0;step<240;step++){
  const op=step%6;
  if(op===0){ids=Array.from({length:24},(_,i)=>'tree-'+i).filter(()=>random()>.22);controllers.forEach((c,i)=>c.bind(sinks[i],ids.map(id=>({id}))));}
  else if(op===1){available=new Set(Array.from({length:24},(_,i)=>'tree-'+i).filter(()=>random()>.72));rev++;controllers.forEach(c=>c.setCoverage(coverage,ready));}
  else if(op===2){ready=random()>.3;controllers.forEach(c=>c.setCoverage(coverage,ready));}
  else if(op===3){const suppressed=new Set(ids.filter(()=>random()>.8));controllers.forEach(c=>c.setSuppressions(suppressed));}
  else if(op===4){const dt=random()*.5;controllers.forEach(c=>c.advance(dt));}
  else{rev++;controllers.forEach(c=>c.setCoverage(coverage,ready));}
  compare();
 }
 controllers.forEach(c=>c.clear());compare();
});

test('sparse prototype falls back to complete scan without candidate guarantee',()=>{
 const c=new QaSparseTreeTransitions(),values=new Map();c.bind({setTreeReadiness:(id,v)=>values.set(id,v),setTreeEnabled(){}},[{id:'a'}]);
 c.setCoverage({revision:1,has:id=>id==='a'},true);c.advance(1);assert.equal(values.get('a'),1);
 c.setCoverage({revision:2,has:()=>false},true);assert.equal(values.get('a'),0);
});
