import test from 'node:test';
import assert from 'node:assert/strict';
import {captureGameAudio,installGameAudioCapture} from '../tools/experiments/game-audio-capture.js';
function fixture(){
 const destination={stream:{getTracks:()=>[track]}},track={stops:0,stop(){this.stops++;}},calls=[];
 const node=name=>({connect(to){calls.push([name,'connect',to]);},disconnect(to){assert.equal(to,destination);calls.push([name,'disconnect',to]);}});
 const audio={context:{state:'running',createMediaStreamDestination:()=>destination},sfxGain:node('sfx'),musicGain:node('music')};
 return {audio,destination,track,calls};
}
test('capture taps both buses and releases only capture connections, once',()=>{
 const f=fixture(),tap=captureGameAudio(f.audio);assert.equal(tap.stream,f.destination.stream);
 tap.release();tap.release();assert.deepEqual(f.calls.map(x=>x.slice(0,2)),[['sfx','connect'],['music','connect'],['sfx','disconnect'],['music','disconnect']]);assert.equal(f.track.stops,1);
});
test('partial connection failure releases tracks and successful connection',()=>{
 const f=fixture();f.audio.musicGain.connect=()=>{throw Error('attach failed');};f.audio.musicGain.disconnect=()=>{throw Error('not connected');};
 assert.throws(()=>captureGameAudio(f.audio),/attach failed/);assert.equal(f.track.stops,1);assert.equal(f.calls.at(-1)[1],'disconnect');
});
test('locked audio fails instead of producing silent evidence',()=>{
 const f=fixture();f.audio.context.state='suspended';assert.throws(()=>captureGameAudio(f.audio),/not unlocked/);assert.equal(f.calls.length,0);
});
test('failed receiver releases tap and uninstall removes listener',()=>{
 const f=fixture(),target=new EventTarget(),uninstall=installGameAudioCapture(target,f.audio);let failures=0;
 const request=()=>{const event=new Event('guardian-qa-capture-audio');event.detail={accept(){throw Error('receiver failed');},reject(error){assert.match(error.message,/receiver failed/);failures++;}};target.dispatchEvent(event);};
 request();assert.equal(f.track.stops,1);assert.equal(failures,1);uninstall();request();assert.equal(failures,1);
});
