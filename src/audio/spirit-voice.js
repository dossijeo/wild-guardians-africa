import manifest from '../../content/manifests/spirit-voices.json' with {type:'json'};

export function spiritVoice(text,language){return manifest.records.find(item=>item.language===language&&item.text===text);}

// One streamed clip at a time. No bank preload, PCM cache or changed sample clock.
export class SpiritVoice {
  constructor({create=url=>new Audio(url),url=path=>path,volume=()=>1,onState=()=>{},timeout=12000}={}){
    Object.assign(this,{create,url,volume,onState,timeout});this.ticket=0;this.status='idle';this.audio=null;
  }
  state(status){this.status=status;this.onState(status);}
  stop(){
    this.ticket++;clearTimeout(this.timer);const audio=this.audio;this.audio=null;
    if(audio){audio.onended=audio.onerror=audio.onloadedmetadata=null;audio.pause();audio.removeAttribute('src');audio.load();}
    this.state('idle');
  }
  play(record,onEnded){
    this.stop();if(!record){this.state('fallback');return;}
    const ticket=this.ticket,current=()=>ticket===this.ticket&&this.audio===audio;
    let audio;
    const fallback=()=>{if(current()){this.stop();this.state('fallback');}};
    try{audio=this.create(this.url(record.path));this.audio=audio;audio.preload='auto';audio.volume=this.volume();this.state('loading');
      audio.onended=()=>{if(!current())return;this.stop();this.state('ended');onEnded?.();};audio.onerror=fallback;
      this.timer=setTimeout(fallback,this.timeout);
      Promise.resolve(audio.play()).then(()=>{if(!current())return;clearTimeout(this.timer);this.state('playing');},fallback);
    }catch{if(audio)fallback();else this.state('fallback');}
  }
  get active(){return ['loading','playing'].includes(this.status);}
  refreshVolume(){if(this.audio)this.audio.volume=this.volume();}
  dispose(){this.stop();}
}
