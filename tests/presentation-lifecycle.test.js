import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createPresentationLifecycleJournal,publishAnimalGone} from '../src/simulation/presentation-lifecycle.js';
test('lifecycle journal orders confirmed facts without consuming or mutating gameplay sequence',()=>{
 const state=Game.newGame({seed:712,slotId:'journal'}),journal=createPresentationLifecycleJournal(state,Game.observeGameEvents),before=state.sequence;
 Game.emit(state,'SpellActivated',{kind:'attack',targetId:'a'});state.elapsed+=.1;publishAnimalGone(state,'a');state.elapsed+=.2;Game.emit(state,'RaidEnded');
 assert.equal(state.sequence,before+2);assert.deepEqual(journal.drain(),[{kind:'event',eventId:'event-'+before,at:0},{kind:'animalGone',actorId:'a',at:.1},{kind:'event',eventId:'event-'+(before+1),at:state.elapsed}]);assert.deepEqual(journal.drain(),[]);journal.dispose();publishAnimalGone(state,'a');assert.throws(()=>journal.drain());
});
test('all gameplay events receive simulation timestamps without modifying saved events',()=>{
 const state=Game.newGame({seed:713,slotId:'journal-all'}),journal=createPresentationLifecycleJournal(state,Game.observeGameEvents),before=state.sequence;
 state.elapsed=1;Game.emit(state,'TestFirst',{value:1});state.elapsed=1.25;Game.emit(state,'TestSecond',{value:2});
 const events=structuredClone(state.events.slice(-2)),facts=journal.drain();
 assert.deepEqual(facts,[{kind:'event',eventId:'event-'+before,at:1},{kind:'event',eventId:'event-'+(before+1),at:1.25}]);
 assert.deepEqual(state.events.slice(-2),events);assert.equal(Object.hasOwn(events[0],'at'),false);journal.dispose();
});
