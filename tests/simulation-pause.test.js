import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {dispatchSimulationPause} from '../src/app/simulation-pause.js';

test('local pause and resume retain existing synchronous behavior',()=>{
 const state=newGame({seed:712,slotId:'pause'});dispatchSimulationPause(state,null,true,'menu');assert.ok(state.pauses.includes('menu'));
 dispatchSimulationPause(state,null,false,'menu');assert.ok(!state.pauses.includes('menu'));
});

test('worker pause and resume are queued even while presentation is stale',async()=>{
 const state=newGame({seed:712,slotId:'pause'}),commands=[],pending=[];
 const runtime={submit(command){commands.push(command);return new Promise(resolve=>pending.push(resolve));}};
 const pause=dispatchSimulationPause(state,runtime,true,'menu'),resume=dispatchSimulationPause(state,runtime,false,'menu');
 assert.deepEqual(commands,[{kind:'pause',reason:'menu'},{kind:'resume',reason:'menu'}]);assert.ok(!state.pauses.includes('menu'));
 pending[0]({value:null});pending[1]({value:null});await Promise.all([pause,resume]);assert.ok(!state.pauses.includes('menu'));
});
