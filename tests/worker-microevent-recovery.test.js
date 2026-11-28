import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {microState,reserveEvent,settleEvent} from '../src/microevents/economy.js';
import {createWorkerMicroeventEconomy} from '../src/microevents/worker-economy.js';
import {readFileSync} from 'node:fs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';

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

test('abandoned ticket is cancelled in the real authority before its initial snapshot',async()=>{
 const source=readFileSync(new URL('./fixtures/microevent-world.json',import.meta.url),'utf8');
 const state=deserialize(source),plant=state.plants.find(item=>item.alive);
 assert.ok(plant);const memory=microState(state);memory.previousIncome=10000;
 settleEvent(state,reserveEvent(state,'birds',plant.id),'ignored');
 const losses=structuredClone(memory.pendingLosses),ticket=reserveEvent(state,'seeds',plant.id);
 assert.ok(ticket);assert.ok(Object.keys(losses).length);
 const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const authority=createSimulationAuthority(module,serialize(state),[]);let sequence=0;
 const runtime={submit(command){return Promise.resolve(authority.execute({...command,sequence:++sequence}));}};
 try{
  const recovery=createWorkerMicroeventEconomy(runtime,{pendingTicket:ticket});
  const save=runtime.submit({kind:'snapshot'});
  await recovery.ready;const saved=JSON.parse((await save).snapshot);
  assert.equal(saved.microevents.ticket,null);
  assert.deepEqual(saved.microevents.pendingLosses,losses);
  assert.equal(saved.microevents.rewards,0);
 }finally{authority.dispose();}
});
