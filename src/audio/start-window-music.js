import {MusicWindowPool} from './music-window-pool.js';
import {MusicWindowTransport} from './music-window-transport.js';
import {musicRangeReader} from './music-range-reader.js';
import {MUSIC_POLICIES} from './music-policy.js';

// Prime only the currently audible short windows. The musical clock starts
// after that group is ready, so slow initial downloads cannot desync layers.
export async function startWindowMusic(audio,pack,bank,current){
  const index=await audio.resources.json(`/content/music-windows-${pack}.json`);
  if(!current())return;
  const reader=audio.resources.musicReader??musicRangeReader();
  const pool=new MusicWindowPool(index,{readRange:reader.readRange,
    decode:data=>audio.context.decodeAudioData(data),sampleRate:audio.context.sampleRate,queue:audio.musicLoads});
  audio.musicWindowPool=pool;
  const offset=audio.resources.musicTransport?.offset??0;
  let scene;
  do{
    scene=audio.musicScene??'day';
    await Promise.all(bank.tracks.filter((track,i)=>!track.silent&&MUSIC_POLICIES[pack].levels[scene][i]>0).map(track=>{
      const entry=pool.at(track.id,offset);if(!entry)throw Error('Music start is outside its source index');
      return pool.load(track.id,entry.window);
    }));
    if(!current())return;
  }while(scene!==(audio.musicScene??'day'));
  if(audio.context.state!=='running'){audio.stopMusic({preserveEvent:true});return;}
  audio.musicRetryAt=0;
  audio.transport=new MusicWindowTransport(audio,pack,bank,bank.tracks.filter(track=>!track.silent).map(track=>({track})),audio.resources.musicTransport);
}
