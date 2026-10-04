import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesktopVisibilityFixture} from '../tools/create_desktop_visibility_fixture.mjs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {resumeLoadedWorld} from '../src/app/resume-loaded-world.js';
import * as Game from '../src/simulation/game.js';

test('desktop visibility fixture uses paid native first-night gameplay and survives hidden restoration unchanged',()=>{
  const fixture=createDesktopVisibilityFixture(),state=deserialize(fixture.snapshot);
  assert.equal(state.day,1);assert.ok(state.raid);assert.equal(state.result,null);
  assert.equal(state.plants[0].species,'yuca');assert.equal(state.plants[0].water[0].status,'manual');assert.ok(state.plants[0].growth>0);
  assert.equal(state.ledger.balance.n,'648');assert.equal(state.ledger.balance.d,'1');
  let balance=1500n;for(const entry of Object.values(state.ledger.entries)){assert.equal(entry.d,'1');balance+=BigInt(entry.n);}assert.equal(balance,648n);
  assert.equal(state.cooldowns.shield,90);assert.equal(state.spells[0].remaining,20);
  resumeLoadedWorld(state,{hidden:true});assert.deepEqual(state.pauses,['hidden']);
  const before=serialize(state);Game.tick(state,600);assert.equal(serialize(state),before);
  resumeLoadedWorld(state);assert.deepEqual(state.pauses,[]);
});
