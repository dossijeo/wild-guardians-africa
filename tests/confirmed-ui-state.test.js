import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedUiState} from '../src/app/confirmed-ui-state.js';
test('bootstrap fallback ends once the Worker view is confirmed',()=>{const bootstrap={day:1},world={workerGpuOnly:true};assert.equal(confirmedUiState(world,bootstrap),bootstrap);const view={day:2};world.actorAudio=view;world.confirmedHud={};world.hudOnlyConfirmed=true;assert.equal(confirmedUiState(world,bootstrap),view);delete world.actorAudio;assert.throws(()=>confirmedUiState(world,bootstrap),/unavailable/);world.actorAudio=view;delete world.confirmedHud;assert.throws(()=>confirmedUiState(world,bootstrap),/unavailable/);assert.equal(confirmedUiState(null,bootstrap),bootstrap);});
