// Index byte windows in the original MP3s. No new audio files or transcoding.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sampleRate=48000,samplesPerFrame=1152,framesPerWindow=250,prerollFrames=24,tailFrames=2;
for(const pack of ['a','b']){
  const bank=JSON.parse(readFileSync(`public/content/music-${pack}.json`)),tracks=[];
  for(const track of bank.tracks.filter(t=>!t.silent)){
    const file='public'+track.data.url,raw=readFileSync(file);
    const packets=JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-select_streams','a:0','-of','json',file],{maxBuffer:16*1024*1024})).packets;
    assert.ok(packets.every(p=>p.duration_time==='0.024000'));
    assert.equal(packets.length*samplesPerFrame,Math.round(bank.duration*sampleRate));
    for(let i=1;i<packets.length;i++)assert.equal(Number(packets[i-1].pos)+Number(packets[i-1].size),Number(packets[i].pos));
    const windows=[];
    for(let start=0;start<packets.length;start+=framesPerWindow){
      const end=Math.min(packets.length,start+framesPerWindow),first=Math.max(0,start-prerollFrames),last=Math.min(packets.length,end+tailFrames);
      windows.push({startSample:start*samplesPerFrame,endSample:end*samplesPerFrame,firstSample:first*samplesPerFrame,decodedSamples:(last-first)*samplesPerFrame,startByte:Number(packets[first].pos),endByte:Number(packets[last-1].pos)+Number(packets[last-1].size)});
    }
    tracks.push({id:track.id,url:track.data.url,sha256:createHash('sha256').update(raw).digest('hex'),bytes:raw.length,windows});
  }
  const path=`public/content/music-windows-${pack}.json`;
  writeFileSync(path,JSON.stringify({version:1,sampleRate,samplesPerFrame,secondsPerWindow:6,prerollFrames,tailFrames,duration:bank.duration,tracks})+'\n');
  console.log(JSON.stringify({path,tracks:tracks.length,windows:tracks.reduce((sum,t)=>sum+t.windows.length,0)}));
}
