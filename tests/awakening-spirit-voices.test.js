import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spiritVoice} from '../src/audio/spirit-voice.js';
import {TUTORIAL_MESSAGES} from '../src/tutorial/messages.js';
import {translate} from '../public/i18n/catalog.js';
for(const language of ['es','en'])test(`awakening ${language} uses original audio and matching offline cues`,()=>{
 const text=translate(TUTORIAL_MESSAGES['magic.awakening'].text,language),record=spiritVoice(text,language);assert.ok(record);assert.equal(record.id,'spirit.awakening.'+language);
 const audio=readFileSync(new URL('../public/'+record.path,import.meta.url)),cue=JSON.parse(readFileSync(new URL('../public/content/guardian/lipsync/'+record.id+'.json',import.meta.url)));
 assert.equal(createHash('sha256').update(audio).digest('hex'),record.sha256);assert.equal(cue.sourceSha256,record.sha256);assert.equal(cue.text,text);assert.equal(cue.audio,record.path);assert.equal(cue.recognizer,language==='es'?'phonetic':'pocketSphinx');assert.ok(Math.abs(cue.duration-record.labDurationSeconds)<.04);
 let end=0;assert.ok(cue.mouthCues.length>50);for(const c of cue.mouthCues){assert.ok('ABCDEFGHX'.includes(c.value));assert.ok(c.start>=end-.011&&c.end>c.start&&c.end<=cue.duration+.03);end=c.end;}assert.ok(Math.abs(end-cue.duration)<.04);assert.equal(cue.mouthCues.at(-1).value,'X');
});
