import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem, soundPriority} from '../src/audio/audio.js';
const bank = JSON.parse(readFileSync(new URL('../public/content/sfx.json', import.meta.url)));
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
 const audio = new AudioSystem({sfx: 1, music: 1}), sources = [];
 audio.context = {state: 'running', currentTime: 0, createBufferSource() {const s = {playbackRate: {value: 7}, connect() {}, disconnect() {}, start() {}, stop() {}}; sources.push(s); return s;}, createGain() {return {gain: {value: 0}, connect() {}, disconnect() {}};}};
 audio.sfx = bank; audio.sfxGain = {}; audio.musicGain = {}; audio.buffer = async url => ({url});
 const original = audio.sound.bind(audio);
 audio.sound = (id, options) => id === 'game_farmer_hurt' ? original(id, options) : Promise.resolve(null);
 return {audio, sources};
}
const injured = id => ({id, type: 'WorkerIncapacitated', targetId: id, presentation: {x: 4, z: 7}});
const warningUrl = bank.items.find(r => r.id === 'game_farmer_hurt').audio.url;
test('simultaneous injuries group one warning, never replay history, and leave facts unchanged', async () => {
 const {audio, sources} = fixture(), state = {pauses: []}, events = [injured('one'), injured('two'), injured('three')], before = JSON.stringify(events);
 audio.process(events, {state}); audio.process(events, {state}); await flush();
 assert.equal(sources.length, 1); assert.equal(sources[0].buffer.url, warningUrl); assert.equal(sources[0].playbackRate.value, 1);
 assert.equal(audio.voices.get(sources[0]).bus, 'ui'); assert.equal(audio.voices.get(sources[0]).family, 'worker-danger');
 assert.equal(JSON.stringify(events), before); audio.stop();
 const restored = fixture(); restored.audio.remember(events); restored.audio.process(events, {state}); await flush(); assert.equal(restored.sources.length, 0); restored.audio.stop();
});
test('first hit, fall animation and recovery are not an incapacitation warning', async () => {
 const {audio, sources} = fixture();
 audio.process(['WorkerHit', 'WorkerRecovered', 'WorkerArrived'].map((type, id) => ({type, id})), {state: {pauses: []}}); await flush();
 assert.equal(sources.length, 0); assert.equal(soundPriority('game_farmer_hurt'), 3); audio.stop();
});
test('late decoding, blocking pause and leaving the scene discard a stale injury warning', async () => {
 for (const action of ['late', 'hidden', 'stop']) {
  const {audio, sources} = fixture(), state = {pauses: []}; let release;
  audio.buffer = () => new Promise(resolve => release = resolve);
  audio.process([injured(action)], {state}); await flush();
  if (action === 'late') audio.context.currentTime = .6;
  if (action === 'hidden') state.pauses.push('hidden');
  if (action === 'stop') audio.stop();
  release({url: warningUrl}); await flush(); assert.equal(sources.length, 0); audio.stop();
 }
});
