import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spiritVoice} from '../src/audio/spirit-voice.js';
import {TUTORIAL_MESSAGES} from '../src/tutorial/messages.js';
import {translate} from '../public/i18n/catalog.js';
import {agricultureVfxPlans} from '../src/rendering/agriculture-vfx.js';
import {spellRadius} from '../src/simulation/game.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/agricultural-spirit-voices.json',import.meta.url)));
test('six supplied clips resolve exact current tutorial text in both languages with original hashes',()=>{
 assert.equal(manifest.records.length,6);
 for(const messageId of ['magic.growth','magic.multiply','reminder.multiply'])for(const language of ['es','en']){
  const text=translate(TUTORIAL_MESSAGES[messageId].text,language),record=spiritVoice(text,language);
  assert(record);assert.equal(record.id,messageId+'.'+language);assert.equal(record.messageId,messageId);
  const data=readFileSync(new URL('../public/'+record.path,import.meta.url));
  assert.equal(data.length,record.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),record.sha256);
  const head=data.indexOf('OpusHead');assert(head>=0);assert.equal(data[head+9],record.channels);assert.equal(data.readUInt32LE(head+12),48000);
  assert(record.labDurationSeconds>0);assert.equal(record.text,text);
 }
});
test('individual agricultural VFX use the reduced plant radius without changing shield size',()=>{
 assert.equal(spellRadius('shield'),1.95);
 for(const kind of ['growth','multiply']){
  assert.equal(spellRadius(kind),.65);
  const [plan]=agricultureVfxPlans({spells:[{id:'one',kind,x:4,z:7,targetPlantId:'plant',radius:spellRadius(kind),remaining:1}]});
  assert.equal(plan.x,4);assert.equal(plan.z,7);assert.equal(plan.scale,.65/.79);
 }
});
