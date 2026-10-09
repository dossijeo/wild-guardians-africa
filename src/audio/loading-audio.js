import {skyNight} from '../rendering/sky.js';

// Presentation-only owner. Catalog decoding and admission stay in AudioSystem;
// every asynchronous cue carries an owner predicate and late voices are stopped.
export class LoadingAudio {
 constructor(audio,state){this.audio=audio;this.setState(state);this.voices=new Set();this.pending=new Set();this.disposed=false;}
 setState(state){this.id=skyNight(state)>=.5?'amb_night':'amb_birds';}
 track(request,current){
  const pending=Promise.resolve(request).then(source=>{
   if(!source)return null;if(!current()){this.audio.stopVoice(source);return null;}
   this.voices.add(source);const ended=source.onended;source.onended=()=>{ended?.();this.voices.delete(source);if(this.loop?.source===source)this.loop.source=null;};return source;
  }).catch(()=>null);
  this.pending.add(pending);pending.then(()=>this.pending.delete(pending));return pending;
 }
 start(){
  if(this.disposed||this.audio.context?.state!=='running')return Promise.resolve(null);
  if(this.loop?.id===this.id&&(this.loop.pending||this.loop.source))return this.loop.pending??Promise.resolve(this.loop.source);
  if(this.loop){this.loop.current=false;if(this.loop.source){this.audio.stopVoice(this.loop.source);this.voices.delete(this.loop.source);}}
  const entry={id:this.id,current:true,source:null,pending:null};this.loop=entry;
  const current=()=>!this.disposed&&entry.current&&this.loop===entry;
  entry.pending=this.track(this.audio.ambientSound(entry.id,{emitter:'loading:ambience',isCurrent:current}),current).then(source=>{entry.pending=null;entry.source=source;return source;});return entry.pending;
 }
 plant(){
  if(this.disposed||this.audio.context?.state!=='running')return Promise.resolve(null);
  const current=()=>!this.disposed;
  return this.track(this.audio.sound('farm_crop_interact',{emitter:'loading:plant',family:'loading-plant',isCurrent:current}),current);
 }
 dispose(){if(this.disposed)return;this.disposed=true;if(this.loop)this.loop.current=false;for(const source of this.voices)this.audio.stopVoice(source);this.voices.clear();this.loop=null;}
}
