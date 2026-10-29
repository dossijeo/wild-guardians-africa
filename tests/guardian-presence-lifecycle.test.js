import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioSystem} from '../src/audio/audio.js';
import {playGuardianWorldCue} from '../src/audio/guardian-presence.js';
const flush=()=>new Promise(r=>setImmediate(r));
function setup(){
 const pending=[],sources=[];
 const audio=new AudioSystem({sfx:1,music:0},{bytes:async url=>({url})});
 audio.sfx={items:['spirit_appear','spirit_disappear','spirit_power_activate'].map(id=>({id,audio:{url:id}}))};
 audio.context={state:'running',currentTime:1,decodeAudioData:data=>new Promise(resolve=>pending.push({data,resolve})),createGain:()=>({gain:{value:0},connect(){},disconnect(){this.disconnected=true;}}),createBufferSource(){const s={playbackRate:{value:1},connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(s);return s;}};
 return {audio,pending,sources};
}
test('scene stop rejects pending Guardian decode and a new scene can reuse its decoded buffer',async()=>{
 const {audio,pending,sources}=setup();
 const old=playGuardianWorldCue(audio,'spirit_appear');await flush();assert.equal(pending.length,1);
 audio.stop();pending[0].resolve(pending[0].data);assert.equal(await old,null);assert.equal(sources.length,0);
 const current=await playGuardianWorldCue(audio,'spirit_appear');assert.ok(current.started);assert.equal(audio.voices.size,1);
 audio.stop();assert.equal(audio.voices.size,0);assert.equal(audio.active.length,0);assert.ok(current.stopped&&current.disconnected);
});
test('out-of-order decodes retain latest presence plus launch and stop disconnects both voices',async()=>{
 const {audio,pending,sources}=setup();
 const arrival=playGuardianWorldCue(audio,'spirit_appear');await flush();
 const launch=playGuardianWorldCue(audio,'spirit_power_activate');await flush();
 const dissolve=playGuardianWorldCue(audio,'spirit_disappear');await flush();
 pending[2].resolve(pending[2].data);const last=await dissolve;
 pending[1].resolve(pending[1].data);const cast=await launch;
 pending[0].resolve(pending[0].data);assert.equal(await arrival,null);
 assert.deepEqual(new Set(audio.active),new Set([last,cast]));assert.equal(sources.length,2);
 const gains=[...audio.voices.values()].map(v=>v.volume);audio.stop();audio.stop();
 assert.equal(audio.voices.size,0);assert.equal(audio.active.length,0);assert.ok(sources.every(s=>s.stopped&&s.disconnected));assert.ok(gains.every(g=>g.disconnected));
});
