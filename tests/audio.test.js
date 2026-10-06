import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AudioSystem,eventSound} from '../src/audio/audio.js';
test('upcoming raid sounds decode once per species before first contact, without starting any voice',async()=>{const audio=new AudioSystem({sfx:1,music:1}),decoded=[],buffers=new Map();audio.sfxBank=async()=>JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));audio.buffer=async url=>{if(!buffers.has(url)){decoded.push(url);buffers.set(url,{});}return buffers.get(url);};audio.prepareAnimalSounds({day:1});await Promise.all(audio.animalSoundPreparation.values());assert.equal(decoded.length,5);audio.prepareAnimalSounds({day:1});await Promise.all(audio.animalSoundPreparation.values());assert.equal(decoded.length,5);audio.prepareAnimalSounds({day:3,nightPlan:{group:['lion','lion','warthog']}});await Promise.all(audio.animalSoundPreparation.values());assert.equal(decoded.length,9);assert.equal(audio.voices.size,0);});

test('Every gameplay sound resolves to a one-shot in the supplied SFX lab',()=>{
  const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));
  for(const [event,id] of Object.entries(eventSound)) {
    const item=bank.items.find(item=>item.id===id);
    assert.ok(item,`${event}: missing ${id}`);
    assert.equal(item.loop,false,`${event}: must be a one-shot`);
  }
});

test('Leaving a scene while a sound decodes cannot start playback afterwards',async()=>{
  const audio=new AudioSystem({sfx:1,music:1});let resolve,started=0;
  audio.context={state:'running',createBufferSource(){started++;throw Error('Stale sound started');}};
  audio.buffer=()=>new Promise(done=>{resolve=done;});
  const pending=audio.play('/sound.wav');audio.stop();resolve({});
  assert.equal(await pending,null);assert.equal(started,0);
});

test('Loading a save suppresses historical sound events while new events still play',()=>{
  const audio=new AudioSystem({sfx:1,music:1}),played=[];
  audio.sound=async id=>played.push(id);
  const history=[{id:'event-1',type:'RaidSpawned'},{id:'event-2',type:'CrateDelivered'}];
  audio.remember(history);audio.process([...history,{id:'event-3',type:'SpellActivated'}]);
  assert.deepEqual(played,['spirit_power_activate']);
});
