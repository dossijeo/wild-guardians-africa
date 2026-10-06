import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkTargetIndex} from '../src/rendering/work-target-index.js';
import {workVfxPlans,WorkVfx} from '../src/rendering/work-vfx.js';
test('target index preserves last-wins Map semantics, live fields and every membership/ID edit',()=>{
 const index=new WorkTargetIndex(),p={id:'p',x:1},s={id:'s',x:2},state={plants:[p,{id:'p',x:3}],structures:[s]};
 const check=()=>assert.deepEqual([...index.forState(state)],[...new Map([...state.plants,...state.structures].map(e=>[e.id,e]))]);
 check();const initial=index.index;state.plants[1].x=5;check();assert.equal(index.index,initial);
 for(const edit of [()=>state.plants.push({id:'q'}),()=>state.plants.pop(),()=>state.plants.reverse(),()=>state.plants[1]={id:'new'},()=>state.plants[0].id='renamed',()=>state.structures[0]={id:'renamed',x:99},()=>state.structures=[],()=>state.plants=[...state.plants]]){const old=index.index;edit();check();assert.notEqual(index.index,old);}
 index.reset();assert.equal(index.index,null);assert.equal(index.state,null);assert.deepEqual(index.plantEntries,[]);check();
 const old=index.index;check();assert.equal(index.index,old);check();assert.equal(index.forState({...state}).get('new'),state.plants[1]);assert.notEqual(index.index,old);
});
test('cached plans track task, profile, growth phase and replaced targets without mutating gameplay',()=>{
 const index=new WorkTargetIndex(),state={workers:[{id:'w',profile:'olderMale',status:'acting',taskId:'t',actionRemaining:2}],tasks:[{id:'t',kind:'water',targetId:'p'}],plants:[{id:'p',x:1,z:2}],structures:[]};
 for(let i=0;i<40;i++){
  if(i===3)state.plants[0]={id:'p',x:9,z:5};if(i===6)state.tasks[0].kind='initial';if(i===9)state.workers[0].profile='youngFemale';if(i===15)state.workers[0].status='walking';if(i===20)state.workers[0].status='acting';if(i===25)state.plants[0].id='q';if(i===26)state.tasks[0].targetId='q';
  state.workers[0].actionRemaining=i*.1;const before=JSON.stringify(state);
  assert.deepEqual(workVfxPlans(state,index),workVfxPlans(state));assert.equal(JSON.stringify(state),before);
 }
});
test('same-ID replacements reuse unique indexes while aliased duplicate IDs preserve last occurrence',()=>{
 const index=new WorkTargetIndex(),a={id:'a'},b={id:'b'},state={plants:[a,b],structures:[]},first=index.forState(state);
 state.plants[1]={id:'b',x:10};assert.equal(index.forState(state),first);assert.equal(first.get('b'),state.plants[1]);
 state.plants=[a,a];index.forState(state);state.plants[0]={id:'a',x:20};assert.equal(index.forState(state).get('a'),a);
 state.plants[1]={id:'a',x:30};assert.equal(index.forState(state).get('a').x,30);
});
test('disposing the actual manager releases cached state and rebuilding its presentation creates a fresh index',()=>{
 let disposed=0;
 const library={create:()=>({position:{set(){}},rotation:{},native:{time:0},seek(t){this.native.time=t;},advance(t){this.native.time+=t;},dispose(){disposed++;}})};
 const manager=new WorkVfx(library,{}, {add(){}},()=>0),state={time:0,elapsed:0,workers:[{id:'w',profile:'olderMale',status:'acting',taskId:'t',actionRemaining:2}],tasks:[{id:'t',kind:'water',targetId:'p'}],plants:[{id:'p',x:1,z:2}],structures:[]};
 manager.update(state);assert.equal(manager.targetIndex.state,state);const previous=manager.targetIndex.index;
 manager.dispose();assert.equal(disposed,1);assert.equal(manager.targetIndex.index,null);assert.equal(manager.targetIndex.state,null);assert.equal(manager.effects.size,0);
 manager.update(state);assert.notEqual(manager.targetIndex.index,previous);manager.dispose();assert.equal(disposed,2);
});
