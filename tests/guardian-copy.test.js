import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guardianCopy} from '../src/tutorial/guardian-copy.js';
import {translate} from '../public/i18n/catalog.js';
import {TUTORIAL_MESSAGES,DEFENSES_FOLLOWUP} from '../src/tutorial/messages.js';
const supplied=JSON.parse(readFileSync(new URL('../docs/reference/Wild_Guardians_Espiritu_ES_EN_v2.json',import.meta.url),'utf8'));
test('all supplied Spirit replacements preserve the exact Spanish and paired English copy',()=>{
 assert.equal(Object.keys(supplied.es).length,27);assert.equal(Object.keys(supplied.en).length,27);
 for(const [old,replacement] of Object.entries(supplied.es)){
  assert.equal(guardianCopy(old),replacement);assert.equal(guardianCopy(replacement),replacement);
  assert.equal(translate(replacement,'es'),replacement);
  const legacyEnglish=translate(old,'en');assert.ok(Object.hasOwn(supplied.en,legacyEnglish));
  assert.equal(translate(replacement,'en'),supplied.en[legacyEnglish]);
 }
});
test('tutorial and post-raid copy use supplied replacements while unrelated messages stay unchanged',()=>{
 const replacements=new Set(Object.values(supplied.es));
 const laterMagic=new Set(['magic.growth','magic.multiply','reminder.multiply']);
 const outsideReference=[];
 for(const [id,message] of Object.entries(TUTORIAL_MESSAGES)){
  if(!replacements.has(message.text))outsideReference.push(id);
  if(laterMagic.has(id))assert.notEqual(translate(message.text,'en'),message.text,`${id} needs current English copy`);
 }
 assert.deepEqual(outsideReference,[...laterMagic],
  'Only the later daily-power magic lessons may differ from the supplied Spirit script');
 assert.ok(replacements.has(DEFENSES_FOLLOWUP.text));
 for(const text of ['toString','Construir','mensaje futuro',null,undefined])assert.equal(guardianCopy(text),text);
});
