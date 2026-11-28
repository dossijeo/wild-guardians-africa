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
test('menu resume queues the atomic tutorial command immediately and preserves hidden pause',async()=>{const state=newGame({seed:712,slotId:'pause'}),commands=[],pending=[],runtime={submit(command){commands.push(command);return new Promise(resolve=>pending.push(resolve));}},tutorial={worker:true,started:true,resumeMenu(){return runtime.submit({kind:'tutorialCommand',action:'resume-menu'});}};const pause=dispatchSimulationPause(state,runtime,true,'menu',{tutorial}),resume=dispatchSimulationPause(state,runtime,false,'menu',{tutorial}),hidden=dispatchSimulationPause(state,runtime,true,'hidden',{tutorial});assert.deepEqual(commands,[{kind:'pause',reason:'menu'},{kind:'tutorialCommand',action:'resume-menu'},{kind:'pause',reason:'hidden'}]);pending.forEach(resolve=>resolve({value:null}));await Promise.all([pause,resume,hidden]);});
test('unstarted or closed tutorial and non-menu resumes keep the normal path',async()=>{const state=newGame({seed:712,slotId:'pause'}),commands=[],runtime={submit(command){commands.push(command);return Promise.resolve({value:null});}},tutorial={worker:true,started:false,resumeMenu(){throw Error('unexpected');}};await dispatchSimulationPause(state,runtime,false,'menu',{tutorial});tutorial.started=true;await dispatchSimulationPause(state,runtime,false,'hidden',{tutorial});assert.deepEqual(commands,[{kind:'resume',reason:'menu'},{kind:'resume',reason:'hidden'}]);await assert.rejects(dispatchSimulationPause(state,runtime,false,'menu',{tutorial:{worker:true,started:true,resumeMenu:()=>Promise.reject(Error('closed'))}}),/closed/);});
