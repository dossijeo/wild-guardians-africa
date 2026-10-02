import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLanguage,readLanguage,LANGUAGE_KEY,supportedLanguage} from '../public/i18n/locale.js';
import {messages,translate,formatMessage} from '../public/i18n/catalog.js';
import {TUTORIAL_MESSAGES} from '../src/tutorial/messages.js';

test('explicit language overrides browser preferences; unknown preferences fall back to English',()=>{
  assert.equal(detectLanguage('en',['es-MX']),'en');
  assert.equal(detectLanguage('es',['en-US']),'es');
  assert.equal(detectLanguage(null,['fr-FR','ja-JP']),'en');
  assert.equal(detectLanguage('invalid',[]),'en');
});
test('browser preference order recognises regional English and Spanish variants',()=>{
  assert.equal(detectLanguage(null,['es-ES','en-US']),'es');
  assert.equal(detectLanguage(null,['es-MX']),'es');
  assert.equal(detectLanguage(null,['fr','en-GB','es']),'en');
  assert.equal(detectLanguage(null,[],'es-AR'),'es');
  assert.equal(supportedLanguage('ES_mx'),'es');
});
test('storage failure is safe and persistent override uses its own key',()=>{
  assert.equal(readLanguage({getItem:key=>{assert.equal(key,LANGUAGE_KEY);return 'es';}},{languages:['en']}),'es');
  assert.equal(readLanguage({getItem:()=>{throw Error('blocked');}},{language:'es-MX'}),'es');
});
test('catalog translates complete labels and leaves logical IDs and partial words intact',()=>{
  assert.equal(translate('Día 42 · Gran río · 9 monedas'),'Day 42 · Great River · 9 coins');
  assert.equal(translate('  Cultivos  '),'  Crops  ');
  assert.equal(translate('Maíz','es'),'Maíz');
  assert.equal(translate('superMijo planta_mijo /assets/mijo.glb'),'superMijo planta_mijo /assets/mijo.glb');
});
test('ARIA interpolation and language reversal keep source strings and user parameters',()=>{
  assert.equal(translate('Contratar un hombre joven menos'),'Hire one fewer young man');
  assert.equal(translate('Contratar un mujer mayor más'),'Hire one more older woman');
  assert.equal(formatMessage('Contratar un {profile} más',{profile:'Amara'},'es'),'Contratar un Amara más');
  assert.equal(formatMessage('Contratar un {profile} más',{profile:'Amara'},'en'),'Hire one more Amara');
});
test('all tutorial messages have complete translations, including mechanics and campaign ending',()=>{
  for(const [id,message] of Object.entries(TUTORIAL_MESSAGES)){
    assert.ok(messages[message.text],id);
    assert.notEqual(translate(message.text),message.text,id);
  }
});
test('catalog contains no empty messages, malformed placeholders or untranslated key markers',()=>{
  for(const [source,english] of Object.entries(messages)){
    assert.ok(english.trim(),source);
    assert.deepEqual([...english.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...source.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),source);
    assert.ok(!english.includes('TODO'),source);
  }
});
