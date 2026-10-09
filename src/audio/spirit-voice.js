import manifest from '../../content/manifests/spirit-voices.json' with {type:'json'};

export function spiritVoice(text,language){return manifest.records.find(item=>item.language===language&&item.text===text);}

// One streamed clip at a time. No bank preload, PCM cache or changed sample clock.
export class SpiritVoice {
  constructor({create=url=>new Audio(url),url=path=>path,volume=()=>1,onState=()=>{},timeout=12000}={}){
    Object.assign(this,{create,url,volume,onState,timeout});this.ticket=0;this.status='idle';this.audio=null;
  }
  state(status){if(this.status===status)return;this.status=status;this.onState(status);}
  stop(){
    this.ticket++;clearTimeout(this.timer);const audio=this.audio;this.audio=null;
    if(audio){audio.onended=audio.onerror=audio.onplaying=audio.onwaiting=audio.onstalled=null;audio.pause();audio.removeAttribute('src');audio.load();}
    this.state('idle');
  }
  play(record,onEnded){
    this.stop();this.failure=null;
    if(!record||this.volume()<=0){this.failure=record?'muted':'missing-clip';this.state('fallback');return;}
    const ticket=this.ticket,current=()=>ticket===this.ticket&&this.audio===audio;
    let audio,waiting=false;
    const fallback=(reason='media-error')=>{if(current()){this.stop();this.failure=reason;this.state('fallback');}};
    try{audio=this.create(this.url(record.path));this.audio=audio;audio.preload='auto';audio.volume=this.volume();this.state('loading');
      audio.onended=()=>{if(!current())return;this.stop();this.state('ended');onEnded?.();};audio.onerror=()=>fallback('media-error');
      const waitForRecovery=()=>{if(current()){waiting=true;clearTimeout(this.timer);this.timer=setTimeout(()=>fallback('stalled-timeout'),this.timeout);}};
      audio.onwaiting=waitForRecovery;
      // A stalled download does not imply stopped playback: buffered narration
      // can keep speaking. Only arm recovery when playback actually lacks data
      // or is already waiting. Preserve the original loading watchdog otherwise.
      audio.onstalled=()=>{if(current()&&(waiting||audio.paused||!(audio.readyState>=3)))waitForRecovery();};
      audio.onplaying=()=>{if(current()){waiting=false;clearTimeout(this.timer);this.state('playing');}};
      this.timer=setTimeout(()=>fallback('load-timeout'),this.timeout);
      // A queued play resolution does not prove playback recovered after waiting.
      Promise.resolve(audio.play()).then(()=>{if(!current()||waiting)return;clearTimeout(this.timer);this.state('playing');},error=>fallback(error?.name==='NotAllowedError'?'autoplay-blocked':'play-rejected'));
    }catch{if(audio)fallback('media-error');else{this.failure='media-unavailable';this.state('fallback');}}
  }
  get active(){return ['loading','playing'].includes(this.status);}
  get duration(){return Number.isFinite(this.audio?.duration)?this.audio.duration:null;}
  refreshVolume(){if(this.audio){const volume=this.volume();if(volume<=0){this.stop();this.failure='muted';this.state('fallback');}else this.audio.volume=volume;}}
  dispose(){this.stop();}
}
