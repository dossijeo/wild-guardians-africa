import './campaign-cinematics.css';
import {PencilBackground} from './cinematic-pencil.js';
import {WebGpuPencilBackground} from './cinematic-pencil-webgpu.js';
import {prepareCinematicGuide} from './cinematic-pencil-guide.js';
import {loadCinematicImage} from './cinematic-image.js';

const BASE=new URL('cinematics/',document.baseURI);
const DELAY=matchMedia('(prefers-reduced-motion: reduce)').matches?140:580;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const imageUrl=path=>new URL(path,BASE).href;
const language=()=>window.WildGuardiansLanguage?.getLanguage?.()==='es'?'ES':'EN';

export class CampaignCinematics{
  constructor({host=document.body,onComplete,onClosed,onError,pencilBackend='webgl'}={}){
    if(!['webgl','webgpu-worker'].includes(pencilBackend))throw TypeError('Invalid cinematic pencil backend');this.pencilBackend=pencilBackend;
    this.host=host;this.onComplete=onComplete;this.onClosed=onClosed;this.onError=onError;this.token=0;this.active=false;this.finishing=false;
    this.voice=new Audio();this.voice.preload='metadata';this.voice.playsInline=true;
  }
  async play(actNumber){
    if(this.active)return;
    this.active=true;const token=++this.token,controller=new AbortController();this.loadController=controller;
    this.element=document.createElement('section');this.element.className='campaign-cinema';this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');
    this.element.innerHTML='<div class="campaign-cinema__veil"></div><div class="campaign-cinema__status" role="status">Cargando cinemática…</div><button type="button" class="campaign-cinema__skip"></button>';
    this.element.setAttribute('aria-label',language()==='ES'?'Cinemática de campaña':'Campaign cinematic');
    this.element.querySelector('.campaign-cinema__status').textContent=language()==='ES'?'Cargando cinemática…':'Loading cinematic…';
    this.element.querySelector('button').textContent=language()==='ES'?'Saltar cinemática':'Skip cinematic';
    this.element.querySelector('button').onclick=()=>this.finish(token);
    this.host.append(this.element);
    const root=this.element;
    requestAnimationFrame(()=>{if(token===this.token&&this.element===root)root.classList.add('is-open');});
    try{
      const response=await fetch(new URL('manifest.json',BASE),{signal:controller.signal});if(token!==this.token)return;if(!response.ok)throw new Error(`Cinematics manifest HTTP ${response.status}`);
      const manifest=await response.json();if(token!==this.token)return;const act=manifest.acts.find(item=>item.number===actNumber);
      if(!act||act.scenes.length!==5)throw new Error(`Cinematic act ${actNumber} unavailable`);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.pencil=this.pencilBackend==='webgpu-worker'?new WebGpuPencilBackground():new PencilBackground();
      const scenes=act.scenes;let next=this.prepare(scenes[0],controller.signal);
      await sleep(DELAY); // Fade gameplay to black while the first slide decodes.
      for(let i=0;i<scenes.length;i++){
        const prepared=await next;if(token!==this.token)return;
        if(prepared.error)throw prepared.error;
        next=i+1<scenes.length?this.prepare(scenes[i+1],controller.signal):null;
        await this.show(prepared,token);
        if(token!==this.token)return;
      }
      await this.finish(token);
    }catch(error){if(token===this.token){this.onError?.(error);await this.finish(token);}}
  }
  prepare(scene,signal){
    const loadImage=path=>loadCinematicImage(imageUrl(path),{signal});
    const guide=prepareCinematicGuide({pencil:this.pencil,backend:this.pencilBackend,sceneId:scene.id,loadImage,imageUrl});
    return Promise.all([Promise.all(scene.layers.map(layer=>loadImage(layer.image))),guide]).then(([images,guide])=>({scene,images,guide}),error=>({error}));
  }
  async show({scene,images,guide},token){
    const lang=language();const duration=Math.max(10,(scene.audio[lang]?.durationSeconds??10)+.8);
    const stack=document.createElement('div');stack.className='campaign-cinema__scene';
    for(let i=0;i<images.length;i++){
      const img=images[i],motion=scene.layers[i].motion;
      img.alt='';let layer=img;
      if(i===0){layer=document.createElement('div');layer.className='campaign-cinema__layer campaign-cinema__background';img.className='campaign-cinema__background-image';layer.append(img);}
      else img.className='campaign-cinema__layer';
      for(const [key,value] of Object.entries({'--sx':`${motion.startXPercent}%`,'--ex':`${motion.endXPercent}%`,'--sy':`${motion.startYPercent}%`,'--ey':`${motion.endYPercent}%`,'--ss':motion.startScale,'--es':motion.endScale,'--scene-duration':`${duration}s`}))layer.style.setProperty(key,value);
      stack.append(layer);
    }
    const shade=document.createElement('div');shade.className='campaign-cinema__shade';stack.append(shade);
    const caption=document.createElement('p');caption.className='campaign-cinema__caption';caption.textContent=lang==='ES'?scene.narrationRaw:scene.narrationRawEN;stack.append(caption);
    this.element.querySelector('.campaign-cinema__status')?.remove();
    const previous=this.element.querySelector('.campaign-cinema__scene');
    this.element.insertBefore(stack,this.element.querySelector('.campaign-cinema__veil'));
    if(guide){this.pencil?.attach(stack.querySelector('.campaign-cinema__background'),images[0],guide,Number(scene.id)*.173);this.pencil?.draw(0,true);}
    requestAnimationFrame(()=>{if(token!==this.token||!stack.isConnected)return;stack.classList.add('is-visible');this.element?.querySelector('.campaign-cinema__veil')?.classList.add('is-clear');});
    if(previous){await sleep(DELAY);previous.remove();}
    if(token!==this.token)return;
    this.voice.pause();this.voice.src=imageUrl(scene.audio[lang].file);this.voice.load();
    let ended=false;this.voice.onended=()=>{ended=true;};
    try{await this.voice.play();}catch{ /* The slide still advances if playback is blocked. */ }
    let elapsed=0,last=performance.now();
    while(token===this.token){
      const now=performance.now();if(!document.hidden)elapsed+=(now-last)/1000;last=now;
      if(guide)this.pencil?.draw(Math.min(1,elapsed/(duration*.5)),true);
      if(elapsed>=duration&&(ended||this.voice.error||this.voice.paused))break;
      if(elapsed>=Math.max(duration+8,(scene.audio[lang]?.durationSeconds??duration)+8))break;
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
  }
  async finish(token=this.token){
    if(token!==this.token||!this.active||this.finishing)return;
    this.finishing=true;++this.token;this.loadController?.abort();this.loadController=null;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();
    const root=this.element;
    root?.querySelector('.campaign-cinema__veil')?.classList.remove('is-clear');
    await sleep(DELAY);
    if(token+1!==this.token)return;
    this.pencil?.dispose();this.pencil=null;
    // Keep the cover in place until the authoritative transition settles.
    // A transient failure must remain retryable while simulation stays paused.
    let pending=false;
    const complete=async()=>{
      if(pending||token+1!==this.token)return;
      pending=true;
      try{await this.onComplete?.();}
      catch(error){
        if(token+1!==this.token)return;
        this.onError?.(error);
        let status=root?.querySelector('.campaign-cinema__status');
        if(!status&&root){status=document.createElement('div');status.className='campaign-cinema__status';status.setAttribute('role','status');root.append(status);}
        if(status)status.textContent=language()==='ES'?'No se pudo continuar. Inténtalo de nuevo.':'Could not continue. Please try again.';
        const button=root?.querySelector('button');if(button){button.style.zIndex='5';button.textContent=language()==='ES'?'Reintentar':'Retry';button.onclick=()=>void complete();}
        return;
      }finally{pending=false;}
      if(token+1!==this.token)return;
      root?.classList.remove('is-open');
      await sleep(DELAY);
      if(token+1!==this.token)return;
      root?.remove();if(this.element===root)this.element=null;this.active=false;this.finishing=false;this.onClosed?.();
    };
    await complete();
  }
  dispose(){++this.token;this.active=false;this.finishing=false;this.loadController?.abort();this.loadController=null;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();this.pencil?.dispose();this.pencil=null;this.element?.remove();this.element=null;}
}
