import {MusicLoadQueue} from './music-load-queue.js';

// Only requested short windows are decoded. Callers retain the current,
// following and transition windows; silent tracks have no decoded entry.
export class MusicWindowPool {
  constructor(index,{readRange,decode,sampleRate=index.sampleRate,queue=new MusicLoadQueue()}={}){
    if(sampleRate!==index.sampleRate)throw Error('Music windows require the validated source sample rate');
    this.index=index;this.readRange=readRange;this.decode=decode;this.queue=queue;
    this.tracks=new Map(index.tracks.map(track=>[track.id,track]));this.pending=new Map();this.ready=new Map();this.disposed=false;
  }
  key(id,window){return `${id}:${window}`;}
  at(id,seconds){
    const track=this.tracks.get(id);if(!track||seconds<0||seconds>=this.index.duration)return null;
    const window=Math.floor(seconds/this.index.secondsPerWindow);return {id,window,key:this.key(id,window),...track.windows[window]};
  }
  load(id,window){
    const key=this.key(id,window),track=this.tracks.get(id),entry=track?.windows[window];
    if(this.disposed||!entry)return Promise.resolve(null);
    if(!this.pending.has(key)){
      let pending;
      const current=()=>!this.disposed&&this.pending.get(key)===pending;
      pending=Promise.resolve().then(()=>this.queue.run(current,async()=>{
        const encoded=await this.readRange(track.url,entry.startByte,entry.endByte);
        if(!current())return null;
        const buffer=await this.decode(encoded);
        if(!current())return null;
        if(buffer.length!==entry.decodedSamples||buffer.sampleRate!==this.index.sampleRate||buffer.numberOfChannels!==2)throw Error('Decoded MP3 window does not match its source index');
        const result={buffer,...entry,key,id,window};this.ready.set(key,result);return result;
      }));
      this.pending.set(key,pending);
      pending.catch(()=>{if(current()){this.pending.delete(key);this.ready.delete(key);}});
    }
    return this.pending.get(key);
  }
  retain(keys){
    const keep=new Set(keys);
    for(const key of this.pending.keys())if(!keep.has(key)){this.pending.delete(key);this.ready.delete(key);}
  }
  pcmBytes(){return [...this.ready.values()].reduce((sum,{buffer})=>sum+buffer.length*buffer.numberOfChannels*4,0);}
  dispose(){this.disposed=true;this.pending.clear();this.ready.clear();}
}
