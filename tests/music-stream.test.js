import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicStream} from '../src/audio/music-stream.js';
import {AudioSystem} from '../src/audio/audio.js';

function fixture(){
  const media={plays:0,pauses:0,loads:0,play(){this.plays++;return Promise.resolve();},pause(){this.pauses++;},removeAttribute(key){delete this[key];},load(){this.loads++;}};
  const nodes=[],context={state:'running',currentTime:1,destination:{},resume:async()=>{},suspend(){this.state='suspended';},createGain(){const node={gain:{value:1},connect(to){this.to=to;},disconnect(){this.closed=true;}};nodes.push(node);return node;},createMediaElementSource(element){assert.equal(element,media);const node={connect(to){this.to=to;},disconnect(){this.closed=true;}};nodes.push(node);return node;}};
  return {media,nodes,context};
}
test('menu streaming uses the music bus, original pitch and loop without decoding a buffer',async()=>{
  const {media,nodes,context}=fixture(),destination={};
  const stream=new MusicStream(context,destination,'./original.mp3',{createMedia:()=>media});await stream.play();
  assert.equal(media.src,'./original.mp3');assert.equal(media.loop,true);assert.equal(media.playbackRate,1);assert.equal(media.crossOrigin,'anonymous');
  assert.equal(nodes[0].to,nodes[1]);assert.equal(nodes[1].to,destination);assert.equal(nodes[1].gain.value,.7);
  stream.pause();await stream.play();assert.equal(media.plays,2);
  stream.dispose();stream.dispose();await stream.play();assert.equal(media.plays,2);assert.equal(media.loads,1);assert.equal(media.src,undefined);assert.ok(nodes.every(node=>node.closed));
});
test('a pending play cannot resurrect a disposed streaming track',async()=>{
  const {media,context}=fixture();let resolve;media.play=()=>new Promise(done=>{resolve=done;});
  const stream=new MusicStream(context,{},'music.mp3',{createMedia:()=>media}),pending=stream.play();stream.dispose();resolve();await pending;
  assert.equal(media.src,undefined);assert.equal(media.pauses,2);
});
test('AudioSystem menu streams, pauses and unloads on entering gameplay without fetching PCM',async()=>{
  const {media,nodes,context}=fixture();let bytes=0;
  const audio=new AudioSystem({music:.4,sfx:.6},{createMedia:()=>media,json:async()=>({music:'./menu.mp3'}),bytes:async()=>{bytes++;throw Error('unexpected decode');}});
  audio.context=context;await audio.menu();assert.equal(bytes,0);assert.equal(audio.buffers.size,0);assert.equal(media.plays,1);
  assert.equal(audio.musicGain.gain.value,.4);const stream=audio.menuStream;audio.suspend();assert.equal(media.pauses,1);
  context.state='running';audio.resume();await new Promise(resolve=>setImmediate(resolve));assert.equal(media.plays,2);
  audio.stopMusic();assert.equal(audio.menuStream,null);assert.equal(stream.disposed,true);assert.equal(media.src,undefined);
  assert.ok(nodes.slice(-2).every(node=>node.closed));
});
test('streaming playback rejection releases the menu and permits retry',async()=>{
  const {media,context}=fixture();media.play=async()=>{throw Error('play blocked');};
  const audio=new AudioSystem({music:1,sfx:1},{createMedia:()=>media,json:async()=>({music:'./menu.mp3'})});audio.context=context;
  await assert.rejects(audio.menu(),/play blocked/);assert.equal(audio.menuActive,false);assert.equal(audio.menuStream,null);assert.equal(media.src,undefined);
  media.play=async()=>{};await audio.menu();assert.equal(audio.menuActive,true);audio.stop();
});
