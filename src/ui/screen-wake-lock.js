// Optional platform capability: failure never interrupts gameplay.
export class GameScreenWakeLock {
  constructor({wakeLock=globalThis.navigator?.wakeLock,document=globalThis.document}={}){
    this.api=wakeLock;this.document=document;this.active=false;this.sentinel=null;this.pending=null;this.generation=0;
    this.visibility=()=>{if(document.hidden)this.release();else this.request();};this.interaction=()=>this.request();
    document?.addEventListener('visibilitychange',this.visibility);document?.addEventListener('pointerdown',this.interaction);
  }
  setActive(value){this.active=!!value;if(this.active)this.request();else this.release();}
  request(){
    if(!this.active||this.document?.hidden||!this.api?.request||this.sentinel&&!this.sentinel.released||this.pending)return;
    const generation=this.generation;
    let pending;try{pending=Promise.resolve(this.api.request('screen'));}catch{return;}
    this.pending=pending;
    pending.then(sentinel=>{
      if(generation!==this.generation||!this.active||this.document?.hidden){Promise.resolve(sentinel.release()).catch(()=>{});return;}
      this.sentinel=sentinel;sentinel.addEventListener('release',()=>{if(this.sentinel===sentinel)this.sentinel=null;},{once:true});
    }).catch(()=>{}).finally(()=>{if(this.pending===pending)this.pending=null;});
  }
  release(){this.generation++;this.pending=null;const sentinel=this.sentinel;this.sentinel=null;if(sentinel)try{Promise.resolve(sentinel.release()).catch(()=>{});}catch{}}
  dispose(){this.active=false;this.release();this.document?.removeEventListener('visibilitychange',this.visibility);this.document?.removeEventListener('pointerdown',this.interaction);}
}
