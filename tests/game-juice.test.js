import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {rational,transact} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
import {GameJuiceModel} from '../src/ui/game-juice-model.js';
import {saveGame} from '../src/app/save-game.js';

test('real paid placements use confirmed transaction IDs and never displayed prices',()=>{
 const state=Game.newGame({seed:712}),model=new GameJuiceModel(state),nav=clearNavigation();
 Game.placeStructure(state,'center-paid',{x:4,z:0},nav);Game.plant(state,'seed-paid','mijo',8,0,nav);
 const before=serialize(state),rows=model.consume(state);
 assert.equal(rows.find(r=>r.kind==='money').value,-805n);assert.equal(rows.filter(r=>r.kind==='placement').length,2);
 assert.equal(serialize(state),before);assert.deepEqual(model.consume(state),[]);
 const loaded=deserialize(serialize(state));assert.deepEqual(new GameJuiceModel(loaded).consume(loaded),[]);
});
test('exact high frequency settlements group income and expense independently without losing modifiers',()=>{
 const state=Game.newGame({seed:712}),model=new GameJuiceModel(state);state.ledger.balance=rational(1000000);
 for(let i=0;i<100;i++){transact(state.ledger,`deliver:c${i}`,rational(45+i));Game.emit(state,'CrateDelivered',{targetId:`c${i}`});}
 transact(state.ledger,'repair:task',rational(-10));Game.emit(state,'RepairApplied',{repair:{paymentId:'repair:task',paidCoins:9.45}});
 const rows=model.consume(state).filter(r=>r.kind==='money');assert.deepEqual(rows.map(r=>r.value),[9450n,-10n]);
 assert.deepEqual(model.consume(state),[]);
});
test('unsettled delivery and rejected command cannot present invented coins',()=>{
 const state=Game.newGame({seed:712}),model=new GameJuiceModel(state);
 Game.emit(state,'CrateDelivered',{targetId:'not-paid'});assert.deepEqual(model.consume(state),[]);
 assert.throws(()=>Game.plant(state,'bad','unknown',8,0,clearNavigation()));assert.equal(model.consume(state).filter(r=>r.kind==='money').length,0);
});
test('Dawn celebration uses completed nights, not raids, and history never replays',()=>{
 const state=Game.newGame({seed:712}),model=new GameJuiceModel(state);state.completedNights=10;state.day=11;
 Game.emit(state,'RaidEnded');assert.deepEqual(model.consume(state),[]);Game.emit(state,'Dawn');assert.deepEqual(model.consume(state),[{kind:'dawn',night:10}]);
 state.result='defeat';Game.emit(state,'Dawn');assert.deepEqual(model.consume(state),[]);
});
test('critical pulse is bounded per structure/day; cooldown readiness only follows actual transition',()=>{
 const state=Game.newGame({seed:712}),model=new GameJuiceModel(state);
 for(let i=0;i<15;i++)Game.emit(state,'StructureHit',{targetId:'wall',structureHit:{hp:20,maxHp:100}});
 assert.equal(model.consume(state).filter(r=>r.kind==='critical').length,1);
 state.cooldowns.shield=1;model.consume(state);state.cooldowns.shield=0;assert.deepEqual(model.consume(state),[{kind:'ready',spell:'shield'}]);assert.deepEqual(model.consume(state),[]);
});
test('manual save presentation waits for real commit, is silent for autosave, and does not alter messages',async()=>{
 const state=Game.newGame({seed:712});let commit,confirmations=0;
 const pending=saveGame(state,{save:()=>new Promise(resolve=>commit=resolve)},{confirm:true,onConfirm:()=>confirmations++});
 assert.equal(confirmations,0);commit();assert.equal(await pending,true);assert.equal(confirmations,1);assert.deepEqual(state.messages,[]);
 await saveGame(state,{save:()=>Promise.resolve()},{onConfirm:()=>confirmations++});assert.equal(confirmations,1);
 assert.equal(await saveGame(state,{save:()=>Promise.reject(Error('disk full'))},{confirm:true,onConfirm:()=>confirmations++}),false);assert.equal(confirmations,1);
});
