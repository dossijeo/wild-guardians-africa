import test from 'node:test';
import assert from 'node:assert/strict';
import {awakeningState,scoreAwakeningDay,evaluateAwakeningDay,startAwakeningDay,
  recordAwakeningEvent,recordAwakeningOpportunity,validateAwakenings} from '../src/simulation/awakenings.js';
import {newGame,tick} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
import {rational} from '../src/simulation/money.js';
const facts={opportunity:2,productive:2,delivered:80,seedBasis:20,wages:30,repairs:0,
  losses:0,exposed:10,threat:1,eventsCompleted:0};
const context={day:5,hasCenter:true,balance:500,reserve:30};
test('score rewards outcomes proportionally, never absolute farm size or spell casts',()=>{
  const a=scoreAwakeningDay(facts,context);
  const large=Object.fromEntries(Object.entries(facts).map(([k,v])=>[k,k==='threat'?v:v*10]));
  assert.deepEqual(scoreAwakeningDay(large,context),a);
  assert.equal(a.events,0);assert.ok(a.positive>=18&&a.positive<=28);
  assert.equal(scoreAwakeningDay({...facts,opportunity:0,productive:0,delivered:0,exposed:0,threat:0},context).positive,0);
});
test('productive investment days score without requiring increasing sales',()=>{
  const result=scoreAwakeningDay({...facts,delivered:0},context);
  assert.equal(result.agriculture,8);assert.equal(result.economy,6);
  assert.ok(result.positive>=18);
});
test('diminishing returns use live blessing count; losses are not multiplied or penalized twice',()=>{
  const base=scoreAwakeningDay(facts,context),many=scoreAwakeningDay(facts,{...context,active:10});
  assert.ok(Math.abs(many.earned-base.positive/1.8)<1e-6);
  assert.equal(scoreAwakeningDay({...facts,losses:10},{...context,active:10}).penalty,0);
  assert.equal(scoreAwakeningDay(facts,{...context,balance:0,active:100}).penalty,2);
});
test('legacy migration never awards historical days; daily evaluation and opportunity settlements are idempotent across reload',()=>{
  let s=newGame({seed:712});s.day=51;
  const a=awakeningState(s);assert.equal(a.progress,0);assert.equal(a.lastEvaluatedDay,50);
  Object.assign(a.current,facts);s.structures.push({kind:'center',status:'intact',hp:100});
  recordAwakeningOpportunity(s,'micro:1','completed');recordAwakeningOpportunity(s,'micro:1','completed');
  assert.equal(a.current.eventsCompleted,1);
  const result=evaluateAwakeningDay(s);assert.ok(result.delta>0);
  s=JSON.parse(JSON.stringify(s));validateAwakenings(s);
  const before=JSON.stringify(s);assert.equal(evaluateAwakeningDay(s),null);assert.equal(JSON.stringify(s),before);
  s.day++;startAwakeningDay(s);assert.equal(s.awakenings.current.eventsCompleted,0);validateAwakenings(s);
});
test('banked charges do not overflow and survive bad management until explicitly spent',()=>{
  const s=newGame({seed:712}),a=awakeningState(s);a.progress=100;
  s.ledger.balance=rational(0);evaluateAwakeningDay(s);assert.equal(a.progress,100);
});
test('delivery attribution uses settled ledger income exactly once, ignoring unrelated coin transfers',()=>{
  const s=newGame({seed:712});s.crates.push({id:'box',species:'mijo'});s.ledger.entries['deliver:box']=rational(11);
  recordAwakeningEvent(s,{type:'CrateDelivered',targetId:'box'});
  recordAwakeningEvent(s,{type:'CrateDelivered',targetId:'box'});
  assert.equal(s.awakenings.current.delivered,11);
  const before=JSON.stringify(s.awakenings);recordAwakeningEvent(s,{type:'SpellActivated'});assert.equal(JSON.stringify(s.awakenings),before);
});
test('invalid persisted progress is rejected',()=>{
  const s=newGame({seed:712});awakeningState(s).progress=101;assert.throws(()=>validateAwakenings(s));
});
test('real dawn evaluates the closing day once and reload at dawn cannot mint another reward',()=>{
  let s=newGame({seed:712,slotId:'awakening-dawn'});
  s.structures.push({id:'center',kind:'center',status:'intact',hp:100,maxHp:100,x:0,z:0});
  Object.assign(awakeningState(s).current,facts);
  s.time=599.9;s.nightPlan={done:true};s.dayPlan={done:true};
  tick(s,.2,clearNavigation());assert.equal(s.day,2);
  assert.equal(s.awakenings.history.length,1);assert.ok(s.awakenings.progress>0);
  const saved=serialize(s);s=deserialize(saved);tick(s,10,clearNavigation());
  assert.equal(serialize(s),saved);assert.equal(s.awakenings.lastEvaluatedDay,1);
});
test('100-night deterministic cadence screen distinguishes competent, excellent and struggling management',()=>{
  function screen(points){let progress=0,active=0;const nights=[];for(let day=1;day<=100;day++){
    progress=Math.min(100,progress+points/(1+.08*active));
    if(progress>=100){nights.push(day);active++;progress=0;}
  }return nights;}
  const competent=screen(20),excellent=screen(28),struggling=screen(9);
  assert.ok(competent[0]>=4&&competent[0]<=6);assert.ok(competent.length>=12&&competent.length<=14);
  assert.ok(excellent.length>=16&&excellent.length<=18);assert.ok(struggling.length<competent.length);
  assert.ok(competent.at(-1)-competent.at(-2)>competent[1]-competent[0]);
});
