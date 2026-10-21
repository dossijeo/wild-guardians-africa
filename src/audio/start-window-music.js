import {MusicWindowPool} from './music-window-pool.js';
import {MusicWindowTransport} from './music-window-transport.js';
import {musicRangeReader} from './music-range-reader.js';
import {MUSIC_POLICIES} from './music-policy.js';

// Prime only the currently audible short windows. The musical clock starts
// after that group is ready, so slow initial downloads cannot desync layers.
export async function prepareWindowMusic(audio,pack,bank,current,onPool=()=>{}){
  const index=await audio.resources.json(`/content/music-windows-${pack}.json`);
  if(!current())return null;
  const reader=audio.resources.musicReader??musicRangeReader();
  const pool=new MusicWindowPool(index,{readRange:reader.readRange,
    decode:data=>audio.context.decodeAudioData(data),sampleRate:audio.context.sampleRate,queue:audio.musicLoads});
  onPool(pool);
  const offset=audio.resources.musicTransport?.offset??0;
  let scene;
  try{
    do{
      scene=audio.musicScene??'day';
      await Promise.all(bank.tracks.filter((track,i)=>!track.silent&&MUSIC_POLICIES[pack].levels[scene][i]>0).map(track=>{
        const entry=pool.at(track.id,offset);if(!entry)throw Error('Music start is outside its source index');
        return pool.load(track.id,entry.window);
      }));
      if(!current()){pool.dispose();return null;}
    }while(scene!==(audio.musicScene??'day'));
  }catch(error){pool.dispose();throw error;}
  return pool;
}

export function startWindowMusic(audio,pack,bank,pool,{startDelay=.1}={}){
  audio.musicWindowPool=pool;
  audio.musicRetryAt=0;
  audio.transport=new MusicWindowTransport(audio,pack,bank,
    bank.tracks.filter(track=>!track.silent).map(track=>({track})),
    {...audio.resources.musicTransport,startDelay});
}
