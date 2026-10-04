import {assetUrl} from '../rendering/asset-url.js';
// Native lock first; a tiny silent inline video supports browsers without the
// API (including local HTTP mobile testing). No video runs with a native lock.
export function createWakeVideo(document){
  if(!document?.createElement)return null;
  const video=document.createElement('video');video.src=assetUrl('/assets/screen-awake.mp4');video.loop=true;video.preload='none';
  video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  return video;
}
// Optional platform capability: failure never interrupts gameplay.
export class GameScreenWakeLock {
  constructor({wakeLock=globalThis.navigator?.wakeLock,document=globalThis.document,createVideo=createWakeVideo}={}){
    this.api=wakeLock;this.document=document;this.active=false;this.sentinel=null;this.pending=null;this.generation=0;
    this.createVideo=createVideo;this.video=null;this.nativeUnavailable=!wakeLock?.request;this.lastError=null;
    this.visibility=()=>{if(document.hidden)this.release();else this.request();};this.interaction=()=>this.request();
    document?.addEventListener('visibilitychange',this.visibility);document?.addEventListener('pointerdown',this.interaction);
    for(const event of ['pointerup','click','keydown'])document?.addEventListener(event,this.interaction);
    document?.addEventListener('fullscreenchange',this.visibility);
  }
  setActive(value){this.active=!!value;if(this.active)this.request();else this.release();}
  request(){
    if(!this.active||this.document?.hidden)return;
    if(this.nativeUnavailable){this.requestVideo();return;}
    if(this.sentinel&&!this.sentinel.released||this.pending)return;
    const generation=this.generation;
    let pending;try{pending=Promise.resolve(this.api.request('screen'));}catch(error){this.lastError=error;this.nativeUnavailable=true;this.requestVideo();return;}
    this.pending=pending;
    pending.then(sentinel=>{
      if(generation!==this.generation||!this.active||this.document?.hidden){Promise.resolve(sentinel.release()).catch(()=>{});return;}
      this.sentinel=sentinel;sentinel.addEventListener('release',()=>{
        if(this.sentinel!==sentinel)return;
        this.sentinel=null;
        // A released sentinel cannot be reused. Recover without requiring the
        // player to touch the screen while watching an incursion or a tutorial.
        queueMicrotask(()=>this.request());
      },{once:true});
    }).catch(error=>{if(generation!==this.generation)return;this.lastError=error;this.nativeUnavailable=true;}).finally(()=>{if(this.pending===pending)this.pending=null;if(this.nativeUnavailable&&this.active&&!this.document?.hidden)this.requestVideo();});
  }
  requestVideo(){
    this.video??=this.createVideo(this.document);const video=this.video;
    if(!video||video.paused===false||this.pending)return;
    const generation=this.generation;
    let pending;try{pending=Promise.resolve(video.play());}catch(error){this.lastError=error;return;}
    this.pending=pending;
    pending.then(()=>{if(!this.active||this.document?.hidden)video.pause();else if(generation===this.generation)this.lastError=null;}).catch(error=>{if(generation===this.generation)this.lastError=error;}).finally(()=>{if(this.pending===pending)this.pending=null;});
  }
  release(){this.generation++;this.pending=null;this.video?.pause();const sentinel=this.sentinel;this.sentinel=null;if(sentinel)try{Promise.resolve(sentinel.release()).catch(()=>{});}catch{}}
  dispose(){this.active=false;this.release();this.document?.removeEventListener('visibilitychange',this.visibility);for(const event of ['pointerdown','pointerup','click','keydown'])this.document?.removeEventListener(event,this.interaction);this.document?.removeEventListener('fullscreenchange',this.visibility);if(this.video){this.video.removeAttribute('src');this.video.load?.();this.video=null;}}
}
