import test from 'node:test';
import assert from 'node:assert/strict';
import {captureNarration} from '../tools/experiments/narration-audio-capture.js';
function fixture(){
 const streams=[],elements=[],connections=[];
 const create=()=>{const element=new EventTarget();element.paused=true;element.readyState=0;element.captureStream=()=>{const stream=new EventTarget(),track={stops:0,stop(){this.stops++;}};stream.tracks=[];stream.getTracks=()=>stream.tracks;stream.getAudioTracks=()=>stream.tracks;stream.track=track;streams.push(stream);return stream;};elements.push(element);return element;};
 const voice={create},destination={};
 const context={createMediaStreamSource(stream){const source={stream,disconnects:0,connect(to){assert.equal(to,destination);connections.push(source);},disconnect(){this.disconnects++;}};return source;}};
 return {voice,create,context,destination,streams,elements,connections};
}
test('successive streamed clips join when tracks arrive and release without pausing narration',()=>{
 const f=fixture(),tap=captureNarration(f.context,f.destination,[f.voice,f.voice]);
 for(let i=0;i<2;i++){
  const el=f.voice.create('clip');el.dispatchEvent(new Event('playing'));const stream=f.streams[i];assert.equal(f.connections.length,i);
  stream.tracks.push(stream.track);stream.dispatchEvent(new Event('addtrack'));el.dispatchEvent(new Event('playing'));assert.equal(f.connections.length,i+1);
  el.dispatchEvent(new Event('emptied'));assert.equal(stream.track.stops,1);assert.equal(f.connections[i].disconnects,1);
 }
 tap.release();tap.release();assert.equal(f.voice.create,f.create);assert.deepEqual(tap.report,{attached:2,errors:[]});
});
test('already playing clip is captured; releasing keeps original media unchanged',()=>{
 const f=fixture();f.voice.audio=f.create();f.voice.audio.paused=false;f.voice.audio.readyState=4;
 const tap=captureNarration(f.context,f.destination,[f.voice]);assert.equal(f.streams.length,1);const stream=f.streams[0];stream.tracks.push(stream.track);stream.dispatchEvent(new Event('addtrack'));tap.release();
 assert.equal(f.voice.audio.paused,false);assert.equal(f.voice.audio.readyState,4);assert.equal(stream.track.stops,1);assert.equal(f.connections[0].disconnects,1);
});
test('unsupported media capture is reported rather than claiming captured narration',()=>{
 const f=fixture(),tap=captureNarration(f.context,f.destination,[f.voice]),el=f.voice.create();delete el.captureStream;el.dispatchEvent(new Event('playing'));
 assert.equal(tap.report.attached,0);assert.match(tap.report.errors[0],/unavailable/);tap.release();assert.equal(f.voice.create,f.create);
});
