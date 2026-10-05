// Diagnostic only: ffprobe packet positions, never re-encode the original MP3s.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const tracks=[];
for(const pack of ['a','b']){
  const bank=JSON.parse(readFileSync(`public/content/music-${pack}.json`));
  for(const track of bank.tracks.filter(t=>!t.silent)){
    const file='public'+track.data.url,raw=readFileSync(file);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-select_streams','a:0','-of','json',file],{maxBuffer:16*1024*1024}));
    const packets=probe.packets;assert.ok(packets.length>100);
    assert.ok(packets.every(p=>p.duration_time==='0.024000'),'Expected original 48 kHz MPEG-1 frames');
    const windows=[0,30,60,bank.duration-6].map(seconds=>{
      const first=Math.max(0,Math.floor(seconds/.024)-24),last=Math.min(packets.length,first+300);
      return {startByte:Number(packets[first].pos),endByte:Number(packets[last-1].pos)+Number(packets[last-1].size),firstFrame:first,frames:last-first,compareSeconds:seconds};
    });
    tracks.push({pack,id:track.id,url:track.data.url,sha256:createHash('sha256').update(raw).digest('hex'),packetSamples:packets.length*1152,duration:bank.duration,windows});
  }
}
const output='tests/browser/music-frame-probe.json';writeFileSync(output,JSON.stringify({sampleRate:48000,channels:2,samplesPerFrame:1152,tracks},null,2)+'\n');
console.log(JSON.stringify({output,tracks:tracks.length,packetSamples:tracks.map(t=>[t.pack,t.id,t.packetSamples])}));
