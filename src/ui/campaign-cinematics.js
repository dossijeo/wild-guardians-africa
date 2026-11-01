import './campaign-cinematics.css';
import {PencilBackground} from './cinematic-pencil.js';

const BASE=new URL('cinematics/',document.baseURI);
const DELAY=matchMedia('(prefers-reduced-motion: reduce)').matches?140:580;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const imageUrl=path=>new URL(path,BASE).href;
const language=()=>window.WildGuardiansLanguage?.getLanguage?.()==='es'?'ES':'EN';

function loadImage(path){
  const image=new Image();image.decoding='async';image.src=imageUrl(path);
  const ready=image.decode?image.decode():new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});
  return ready.then(()=>{if(!image.naturalWidth)throw new Error(`Cinematic image unavailable: ${path}`);return image;});
}

export class CampaignCinematics{
  constructor({host=document.body,onComplete,onError}={}){
    this.host=host;this.onComplete=onComplete;this.onError=onError;this.token=0;this.active=false;
    this.voice=new Audio();this.voice.preload='metadata';this.voice.playsInline=true;
  }
  async play(actNumber){
    if(this.active)return;
    this.active=true;const token=++this.token;
    this.element=document.createElement('section');this.element.className='campaign-cinema';this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');
    this.element.innerHTML='<div class="campaign-cinema__veil"></div><div class="campaign-cinema__status" role="status">Cargando cinemática…</div><button type="button" class="campaign-cinema__skip"></button>';
    this.element.setAttribute('aria-label',language()==='ES'?'Cinemática de campaña':'Campaign cinematic');
    this.element.querySelector('.campaign-cinema__status').textContent=language()==='ES'?'Cargando cinemática…':'Loading cinematic…';
    this.element.querySelector('button').textContent=language()==='ES'?'Saltar cinemática':'Skip cinematic';
    this.element.querySelector('button').onclick=()=>this.finish(token);
    this.host.append(this.element);
    requestAnimationFrame(()=>this.element?.classList.add('is-open'));
    try{
      const response=await fetch(new URL('manifest.json',BASE));if(!response.ok)throw new Error(`Cinematics manifest HTTP ${response.status}`);
      const manifest=await response.json();const act=manifest.acts.find(item=>item.number===actNumber);
      if(!act||act.scenes.length!==5)throw new Error(`Cinematic act ${actNumber} unavailable`);
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.pencil=new PencilBackground();
      const scenes=act.scenes;let next=this.prepare(scenes[0]);
      await sleep(DELAY); // Fade gameplay to black while the first slide decodes.
      for(let i=0;i<scenes.length;i++){
        const prepared=await next;if(token!==this.token)return;
        if(prepared.error)throw prepared.error;
        next=i+1<scenes.length?this.prepare(scenes[i+1]):null;
        await this.show(prepared,token);
        if(token!==this.token)return;
      }
      await this.finish(token);
    }catch(error){if(token===this.token){this.onError?.(error);await this.finish(token);}}
  }
  prepare(scene){
    const guide=this.pencil&&/^\d{2}$/.test(scene.id)?loadImage(`pencil-guides/scene-${scene.id}.webp`).catch(()=>null):Promise.resolve(null);
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
    if(token!==this.token||!this.active)return;
    this.active=false;++this.token;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();
    const root=this.element;
    root?.querySelector('.campaign-cinema__veil')?.classList.remove('is-clear');
    await sleep(DELAY);
    if(token+1!==this.token)return;
    this.pencil?.dispose();this.pencil=null;
    this.onComplete?.(); // Prepare hiring/victory while the screen is black.
    root?.classList.remove('is-open');
    await sleep(DELAY);
    root?.remove();if(this.element===root)this.element=null;
  }
  dispose(){++this.token;this.active=false;this.voice.pause();this.voice.removeAttribute('src');this.voice.load();this.pencil?.dispose();this.pencil=null;this.element?.remove();this.element=null;}
}
