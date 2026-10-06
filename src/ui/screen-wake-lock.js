import {assetUrl} from '../rendering/asset-url.js';
// Native lock first; fallback media includes a silent AAC track. A video-only
// animation may play successfully without inhibiting a mobile display timer.
export function createWakeVideo(document){
  if(!document?.createElement)return null;
  const video=document.createElement('video');video.src=assetUrl('/assets/screen-awake.mp4');video.loop=true;video.preload='none';
  video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
  video.setAttribute('aria-hidden','true');video.tabIndex=-1;
  // Keep it mounted and inside the viewport; do not use display:none or an
  // off-screen position, which mobile browsers may suspend. No input surface.
  video.style.cssText='position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:0';
  document.body?.appendChild(video);
  return video;
}
// Optional platform capability: failure never interrupts gameplay.
export class GameScreenWakeLock {
  constructor({wakeLock=globalThis.navigator?.wakeLock,document=globalThis.document,createVideo=createWakeVideo}={}){
    this.api=wakeLock;this.document=document;this.active=false;this.sentinel=null;this.pending=null;this.generation=0;
    this.createVideo=createVideo;this.video=null;this.nativeUnavailable=!wakeLock?.request;this.lastError=null;
    this.visibility=()=>{if(document.hidden)this.release();else this.retry();};this.interaction=()=>this.retry();
    this.frameDocuments=new WeakSet();this.frameAbort=new AbortController();
    this.frameLoad=event=>{if(event.target?.tagName==='IFRAME')this.bindFrame(event.target);};
    document?.addEventListener('load',this.frameLoad,true);
    for(const frame of document?.querySelectorAll?.('iframe')??[])this.bindFrame(frame);
    document?.addEventListener('visibilitychange',this.visibility);document?.addEventListener('pointerdown',this.interaction);
    for(const event of ['pointerup','click','keydown'])document?.addEventListener(event,this.interaction);
    document?.addEventListener('fullscreenchange',this.visibility);
  }
  setActive(value){this.active=!!value;if(this.active)this.request();else this.release();}
  bindFrame(frame){
    // Same-origin menu/selector gestures do not bubble into the game document.
    // Use the gesture synchronously there, too; foreign host frames are ignored.
    let document;try{document=frame.contentDocument;}catch{return;}
    if(!document||this.frameDocuments.has(document)||this.frameAbort.signal.aborted)return;
    this.frameDocuments.add(document);
    for(const event of ['pointerdown','pointerup','click','keydown'])document.addEventListener(event,this.interaction,{signal:this.frameAbort.signal});
  }
  policyBlocked(){
    // A host iframe can deny this capability even when navigator exposes it.
    // Query again on retry: a host may subsequently change its delegation.
    try{const policy=this.document?.permissionsPolicy??this.document?.featurePolicy;return policy?.allowsFeature?.('screen-wake-lock')===false;}catch{return false;}
  }
  retry(){
    if(!this.active||this.document?.hidden)return;
    if(this.policyBlocked()){this.nativeUnavailable=true;this.requestVideo();return;}
    // A policy/power/visibility rejection need not be permanent. Start an
    // existing fallback synchronously in the gesture before retrying native.
    if(this.nativeUnavailable)this.requestVideo();
    if(this.api?.request&&!this.pending){this.nativeUnavailable=false;this.request();}
    else this.request();
  }
  request(){
    if(!this.active||this.document?.hidden)return;
    // Start fallback directly in the input handler when denial is already
    // knowable; do not wait for a rejected native promise and lose the gesture.
    if(this.policyBlocked()){this.nativeUnavailable=true;this.requestVideo();return;}
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
      this.video?.pause();this.lastError=null;
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
  dispose(){this.active=false;this.release();this.frameAbort.abort();this.document?.removeEventListener('load',this.frameLoad,true);this.document?.removeEventListener('visibilitychange',this.visibility);for(const event of ['pointerdown','pointerup','click','keydown'])this.document?.removeEventListener(event,this.interaction);this.document?.removeEventListener('fullscreenchange',this.visibility);if(this.video){this.video.removeAttribute('src');this.video.load?.();this.video.remove?.();this.video=null;}}
}
