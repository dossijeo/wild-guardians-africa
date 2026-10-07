import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SpiritVoice,spiritVoice} from '../src/audio/spirit-voice.js';
import {translate} from '../public/i18n/catalog.js';
import {guardianCopy} from '../src/tutorial/guardian-copy.js';
import {TutorialController} from '../src/tutorial/controller.js';
import * as Game from '../src/simulation/game.js';
import {syncTutorialActionPause} from '../src/tutorial/action-pause.js';
import {tutorialHudHandTarget} from '../src/ui/tutorial-hud-hand.js';
const manifest=JSON.parse(readFileSync(new URL('../content/manifests/spirit-voices.json',import.meta.url)));
const copy=JSON.parse(readFileSync(new URL('../docs/reference/Wild_Guardians_Espiritu_ES_EN_v2.json',import.meta.url)));
test('54 original Opus stereo clips match registered bytes, hashes and both current text catalogs',()=>{
  assert.equal(manifest.records.length,54);
  for(const language of ['es','en'])assert.equal(manifest.records.filter(r=>r.language===language).length,27);
  for(const record of manifest.records){
    const bytes=readFileSync(new URL('../public/'+record.path,import.meta.url)),head=bytes.indexOf('OpusHead');
    assert.equal(bytes.length,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
    assert.equal(bytes[head+9],2);assert.equal(bytes.readUInt32LE(head+12),48000);
    assert(Object.values(copy[record.language]).includes(record.text));assert.equal(spiritVoice(record.text,record.language).id,record.id);
  }
  for(const source of Object.keys(copy.es))for(const language of ['es','en'])assert(spiritVoice(translate(guardianCopy(source),language),language),'missing clip for '+source);
});
class FakeAudio {
 constructor(){this.paused=false;this.playPromise=Promise.resolve();}
 play(){return this.playPromise;}
 pause(){this.paused=true;}
 removeAttribute(){this.released=true;}
 load(){this.loaded=true;}
}
const record=manifest.records[0];
test('replacement stops/releases old media immediately and ignores stale ended and play promises',async()=>{
 const audios=[],voice=new SpiritVoice({create:()=>{const a=new FakeAudio();audios.push(a);return a;}});let ended=0;
 voice.play(record,()=>ended++);const lateEnded=audios[0].onended;voice.play(record,()=>ended++);
 assert(audios[0].paused&&audios[0].released);lateEnded();assert.equal(ended,0);
 await Promise.resolve();assert.equal(voice.status,'playing');audios[1].onended();assert.equal(ended,1);assert(!voice.active);assert(audios[1].paused);voice.stop();
});
test('blocked autoplay, load error, hung loading and stalled playback fall back without advancing',async()=>{
 for(const mode of ['blocked','error','hung','stalled']){
  const media=new FakeAudio();if(mode==='blocked')media.playPromise=Promise.reject(new Error('NotAllowedError'));if(mode==='hung')media.playPromise=new Promise(()=>{});
  const voice=new SpiritVoice({create:()=>media,timeout:8});let ended=0;voice.play(record,()=>ended++);
  if(mode==='error')media.onerror();if(mode==='stalled'){await Promise.resolve();media.onwaiting();}
  await new Promise(resolve=>setTimeout(resolve,15));assert.equal(voice.status,'fallback',mode);assert.equal(ended,0);assert(!voice.active);assert(media.paused&&media.released);voice.dispose();
 }
});
test('actual ended preserves uncompleted center and planting actions, their hands and signaled pause',()=>{
 const state=Game.newGame({seed:71}),profile={read:()=>new Set(),record(){},basicCompleted:false},tutorial=new TutorialController(state,profile);
 const audio=new FakeAudio(),voice=new SpiritVoice({create:()=>audio});
 voice.play(record,()=>tutorial.dismiss({automatic:true}));audio.onended();assert.equal(tutorial.presentation().id,'basic.center');
 voice.play(record,()=>tutorial.dismiss({automatic:true}));audio.onended();assert.equal(state.structures.length,0);assert.equal(state.tutorial.step,'center');assert(state.tutorial.guideAfterAuto.includes('basic.center'));
 assert.equal(tutorial.presentation(),null);assert.equal(tutorialHudHandTarget(state,null),'[data-menu="build"]');assert(syncTutorialActionPause(state,{hudTarget:true}));assert(state.pauses.includes('tutorial-action'));
 const nav={placement:()=>({valid:true,suppress:[]}),setState(){},field:{surface:()=>0},path:(_a,b)=>[{x:b.x,z:b.z}]};
 Game.placeStructure(state,'center',{x:10,z:0},nav);tutorial.update();assert.equal(tutorial.presentation().id,'basic.plant');
 voice.play(record,()=>tutorial.dismiss({automatic:true}));audio.onended();assert.equal(state.plants.length,0);assert.equal(state.tutorial.step,'plant');assert(state.tutorial.guideAfterAuto.includes('basic.plant'));assert.equal(tutorialHudHandTarget(state,null),'[data-menu="grow"]');
 voice.dispose();
});

test('a delayed play resolution cannot cancel recovery after media starts waiting',async()=>{
 const media=new FakeAudio();let resolvePlay;media.playPromise=new Promise(resolve=>{resolvePlay=resolve;});
 const voice=new SpiritVoice({create:()=>media,timeout:8});let ended=0;
 voice.play(record,()=>ended++);media.onwaiting();resolvePlay();await Promise.resolve();
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(voice.status,'fallback');assert.equal(ended,0);
 assert(media.paused&&media.released);voice.dispose();
});

test('playing after waiting cancels recovery and advances only on actual ended',async()=>{
 const media=new FakeAudio();let resolvePlay;media.playPromise=new Promise(resolve=>{resolvePlay=resolve;});
 const voice=new SpiritVoice({create:()=>media,timeout:8});let ended=0;
 voice.play(record,()=>ended++);media.onstalled();resolvePlay();await Promise.resolve();media.onplaying();
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(voice.status,'playing');assert.equal(ended,0);assert(!media.released);
 media.onended();assert.equal(ended,1);assert.equal(voice.status,'ended');voice.dispose();
});
