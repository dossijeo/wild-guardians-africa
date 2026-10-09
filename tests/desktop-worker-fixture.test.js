import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopWorkerFixture} from '../tools/create_desktop_worker_fixture.mjs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {resumeLoadedWorld} from '../src/app/resume-loaded-world.js';
import * as Game from '../src/simulation/game.js';
import {hiringCost} from '../src/simulation/workforce.js';
test('worker tester fixture is a genuinely paid youngMale with QA selection outside the persisted Game state',()=>{
 const fixture=createDesktopWorkerFixture(),state=deserialize(fixture.snapshot);
 assert.equal(state.workers.length,1);assert.equal(state.workers[0].profile,'youngMale');assert.equal(state.commandIds.includes('desktop-worker-hire'),true);
 assert.equal(state.ledger.entries['desktop-worker-hire'].n,String(-hiringCost({youngMale:1})));let balance=1500n;for(const entry of Object.values(state.ledger.entries)){assert.equal(entry.d,'1');balance+=BigInt(entry.n);}assert.equal(BigInt(state.ledger.balance.n),balance);assert.equal(state.raid,null);assert.notEqual(state.workers[0].status,'home');assert.equal(state.spells.length,0);
 assert.deepEqual(fixture.workerRenderQa,{enabled:true,mode:'visual',caseIndices:[34,18]});assert.equal(Object.hasOwn(state,'workerRenderQa'),false);assert.equal(fixture.snapshot.includes('workerRenderQa'),false);
 resumeLoadedWorld(state,{hidden:true});const before=serialize(state);Game.tick(state,600);assert.equal(serialize(state),before);resumeLoadedWorld(state);assert.deepEqual(state.pauses,[]);
});
