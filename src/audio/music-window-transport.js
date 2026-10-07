import {MusicTransport} from './music-transport.js';

// Shares the original section/branch/mixer policy. Decks own cheap logical
// gains; native sources exist only for audible short MP3 windows.
export class MusicWindowTransport extends MusicTransport {
  get pool(){return this.audio.musicWindowPool;}
  createDeck(when,offset,fade){
    const audio=this.audio,gain=audio.context.createGain();
    const deck={start:when,offset,end:when+this.bank.duration-offset,gain,voices:new Map(),sources:[]};
    gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(1,when+fade);gain.connect(audio.musicGain);
    for(const {track} of this.loaded){
      const volume=audio.context.createGain(),index=this.bank.tracks.indexOf(track);
      const level=this.mixer?this.mixer.value(track.id,when):this.policy.levels[this.scene][index];
      // Match startBuffer's immediate level as well as future automation.
      // Leaving the default gain (1) until a fractional event leaks one sample.
      volume.gain.value=level*(this.bank.safetyGain??.5)*.45;
      volume.gain.setValueAtTime(level*(this.bank.safetyGain??.5)*.45,when);volume.connect(gain);
      const voice={id:track.id,volume,native:new Map(),scheduled:new Set(),stopAt:Infinity,
        stop(at){
          this.stopAt=at??-Infinity;
          for(const source of this.native.values()){
            if(at===undefined){
              audio.stopVoice(source);
              // A suspended clock cannot deliver ended until it resumes. A
              // cancelled window must not retain its PCM reference meanwhile.
              if(audio.context.state!=='running')source.buffer=null;
            }else try{source.stop(Math.min(source.musicWindowEnd,at));}catch{}
          }
          if(at===undefined){this.native.clear();volume.disconnect();}
        }};
      deck.sources.push(voice);deck.voices.set(track.id,volume.gain);
    }
    this.mixer?.addVoices(deck.voices,when);this.decks.push(deck);return deck;
  }
  needed(offset,when){
    const windows=[];
    for(const {track} of this.loaded){
      const entry=this.pool.at(track.id,offset);if(!entry)continue;
      const end=when+(entry.endSample/this.pool.index.sampleRate-offset);
      if(this.mixer.audibleDuring(track.id,when,Math.max(when,end)))windows.push(entry);
    }
    return windows;
  }
  deckReady(when,offset){return this.needed(offset,when).every(entry=>this.pool.ready.has(entry.key));}
  request(entry,keep){
    keep.add(entry.key);
    const pool=this.pool;
    if(!pool.pending.has(entry.key))pool.load(entry.id,entry.window).catch(error=>{
      if(this.pool===pool&&this.wantedKeys?.has(entry.key))this.windowError=error;
    });
  }
  pump(now){
    const keep=new Set(),rate=this.pool.index.sampleRate,clockRate=this.audio.context.sampleRate??rate;
    if(this.plan&&this.plan.kind!=='natural'&&!this.plan.deck){
      const {when,offset}=this.spliceFor(this.plan);
      // Keep only the imminent registered destination, not every possible edge.
      if(when-now<=8)for(const entry of this.needed(offset,when))this.request(entry,keep);
    }
    for(const deck of this.decks){
      const limit=Math.min(deck.end,deck.stopAt??Infinity);
      if(now>=limit)continue;
      const position=Math.max(deck.offset,deck.offset+now-deck.start);
      for(const voice of deck.sources){
        for(const key of voice.native.keys())keep.add(key);
        const track=this.pool.tracks.get(voice.id);
        const first=Math.floor(position/this.pool.index.secondsPerWindow);
        for(let number=first;number<=first+1&&number<track.windows.length;number++){
          const entry={...track.windows[number],id:voice.id,window:number,key:this.pool.key(voice.id,number)};
          const start=Math.max(deck.start,deck.start+entry.startSample/rate-deck.offset);
          const boundary=Math.ceil((deck.start+entry.endSample/rate-deck.offset)*clockRate-1e-7)/clockRate;
          const end=Math.min(limit,boundary,voice.stopAt);
          if(end<=now||end<=start||!this.mixer.audibleDuring(voice.id,Math.max(now,start),end))continue;
          this.request(entry,keep);if(voice.scheduled.has(entry.key))continue;
          const ready=this.pool.ready.get(entry.key);if(!ready)continue;
          // A late entrance uses the current shared position, never offset zero.
          const audibleFrom=this.mixer.audibleFrom(voice.id,Math.max(now,start),end);
          if(audibleFrom===null)continue;
          // A fractional start is rounded by the native sample clock. Make
          // that rounding explicit and compensate the read position so a new
          // window follows the original continuously running source phase.
          const when=Math.ceil(Math.max(start,now+.02,audibleFrom)*clockRate-1e-7)/clockRate;
          // Cancellation around an exact wrap can leave -1e-14 seconds. Native
          // start() rejects even that negative zero; the first valid sample is 0.
          const offset=Math.max(0,(deck.offset*rate+(when-deck.start)*rate-entry.firstSample)/rate);
          if(when>=end)continue;
          const source=this.audio.startBuffer(ready.buffer,{music:true,destination:voice.volume,gain:1,when,offset,stopAt:end});
          if(!source)throw Error('Music context suspended while scheduling a window');
          source.musicWindowEnd=end;source.musicWindowKey=entry.key;source.musicDeckStart=deck.start;source.musicDeckOffset=deck.offset;
          source.musicWindowFirstSample=entry.firstSample;voice.scheduled.add(entry.key);voice.native.set(entry.key,source);
          const ended=source.onended;source.onended=()=>{ended?.();voice.native.delete(entry.key);source.buffer=null;};
        }
      }
    }
    this.wantedKeys=keep;this.pool.retain(keep);
  }
  update(scene,now){
    if(this.windowError)throw this.windowError;
    this.pump(now);super.update(scene,now);this.pump(now);
  }
}
