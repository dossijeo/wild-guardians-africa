import test from 'node:test';
import assert from 'node:assert/strict';
import {FarTreeTransitions} from '../tools/experiments/far-tree-transitions.js';

test('candidate enumeration matches full coverage across replacement, suppression, GPU loss and rebind',()=>{
 const full=new FarTreeTransitions(),sparse=new FarTreeTransitions();
 const makeSink=()=>({values:new Map(),enabled:new Map(),setTreeReadiness(id,v){this.values.set(id,v);},setTreeEnabled(id,v){this.enabled.set(id,v);}});
 const a=makeSink(),b=makeSink();let ids=Array.from({length:120},(_,i)=>'tree-'+i),available=new Set(),revision=0,ready=true;
 const plain={get revision(){return revision;},has(id,suppressed){return available.has(id)&&!suppressed?.has(id);}};
 const indexed={get revision(){return revision;},candidateIds(){return [...available,'unknown'];},has:plain.has};
 const bind=()=>{full.bind(a,ids.map(id=>({id})));sparse.bind(b,ids.map(id=>({id})));};bind();
 let seed=783;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let step=0;step<400;step++){
  available=new Set(Array.from({length:12},()=> 'tree-'+Math.floor(random()*120)));revision++;
  ready=step%17!==0;
  full.setCoverage(plain,ready);sparse.setCoverage(indexed,ready);
  const suppressed=new Set(step%3===0?[...available].slice(0,3):[]);full.setSuppressions(suppressed);sparse.setSuppressions(suppressed);
  const dt=random()*.7;full.advance(dt);sparse.advance(dt);
  if(step%11===0){ids=Array.from({length:120},(_,i)=>'tree-'+i).filter((_,i)=>i%3!==step%3);bind();}
  assert.deepEqual(b.values,a.values,'readiness step '+step);assert.deepEqual(b.enabled,a.enabled,'visibility step '+step);
  assert.deepEqual([...sparse.active].sort(),[...full.active].sort(),'active step '+step);
 }
 full.clear();sparse.clear();assert.equal(sparse.covered.size,0);
});

test('candidate enumeration revokes absent ready trees without scanning the full region',()=>{
 const controller=new FarTreeTransitions(),values=new Map();let ids=['tree-3'],revision=0,calls=0;
 const coverage={get revision(){return revision;},candidateIds:()=>ids,has(id){calls++;return ids.includes(id);}};
 controller.bind({setTreeReadiness:(id,v)=>values.set(id,v),setTreeEnabled(){}},Array.from({length:10000},(_,i)=>({id:'tree-'+i})));
 controller.setCoverage(coverage,true);controller.advance(1);assert.equal(values.get('tree-3'),1);assert.equal(calls,1);
 ids=['tree-4'];revision++;controller.setCoverage(coverage,true);assert.equal(values.get('tree-3'),0);assert.equal(calls,3);
 controller.advance(1);assert.equal(values.get('tree-4'),1);
 revision++;controller.setCoverage(coverage,false);assert.equal(values.get('tree-4'),0);assert.equal(controller.active.size,0);
});
