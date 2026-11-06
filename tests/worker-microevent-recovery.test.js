import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {microState,reserveEvent,settleEvent} from '../src/microevents/economy.js';
import {createWorkerMicroeventEconomy} from '../src/microevents/worker-economy.js';

test('abandoned visual reservation is cancelled before checkpoint without losing confirmed consequences',async()=>{
 const state=newGame({seed:712,slotId:'micro-recovery'});
 state.plants.push({id:'plant-1',x:0,z:0,alive:true,species:'platano'});
 const memory=microState(state);memory.previousIncome=10000;
 settleEvent(state,reserveEvent(state,'birds','plant-1'),'ignored');
 const ticket=reserveEvent(state,'seeds','plant-1'),operations=[];
 const runtime={submit(command){operations.push(command.kind);if(command.kind==='microSettle')return Promise.resolve({value:settleEvent(state,command.ticket,command.outcome,{enabled:command.enabled,losses:command.losses})});if(command.kind==='snapshot')return Promise.resolve(structuredClone(state));throw Error('unexpected command');}};
 const recovery=createWorkerMicroeventEconomy(runtime,{pendingTicket:ticket});
 const checkpoint=runtime.submit({kind:'snapshot'});
 await recovery.ready;const saved=await checkpoint;
 assert.deepEqual(operations,['microSettle','snapshot']);
 assert.equal(saved.microevents.ticket,null);
 assert.deepEqual(saved.microevents.pendingLosses,{'plant-1':1});
 assert.equal(saved.microevents.rewards,0);
});
