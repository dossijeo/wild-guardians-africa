import {assetUrl} from '../rendering/asset-url.js';
import {createOverlayPainter} from './overlay-painter.js';
import {OverlayPolicy,OVERLAY_EFFECTS} from './overlay-policy.js';
const textures=new Map();let preload;
export function preloadScreenOverlays(){return preload??=Promise.all(Object.keys(OVERLAY_EFFECTS).map(async id=>{const image=new Image();image.src=assetUrl(`content/game-juice/${id}.webp`);try{await image.decode();textures.set(id,image);}catch{/* A missing decorative image never blocks gameplay; vector fallback remains. */}}));}
const clamp=(v)=>Math.max(0,Math.min(1,v)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export class ScreenOverlays{
 constructor(stage,{now=()=>performance.now(),quality=()=> 'media',reduced=()=>false}={}){this.stage=stage;this.now=now;this.quality=quality;this.reduced=reduced;this.policy=new OverlayPolicy();this.canvas=document.createElement('canvas');this.canvas.className='juice-overlay';this.canvas.setAttribute('aria-hidden','true');this.canvas.hidden=true;stage.append(this.canvas);this.ctx=this.canvas.getContext('2d',{alpha:true});this.painter=createOverlayPainter(this.ctx);this.lastDraw=-Infinity;this.drawCount=0;preloadScreenOverlays();this.resize=new ResizeObserver(()=>this.size());this.resize.observe(stage);this.size();}
 size(){this.lastQuality=this.quality();const low=['baja','muy_baja'].includes(this.quality()),max=low?480:this.quality()==='alta'?960:640,scale=Math.min(1,max/Math.max(this.stage.clientWidth,this.stage.clientHeight));this.canvas.width=Math.max(1,Math.round(this.stage.clientWidth*scale));this.canvas.height=Math.max(1,Math.round(this.stage.clientHeight*scale));this.lastDraw=-Infinity;}
 request(id){return this.policy.request(id,this.now());}
 update({blocked=false,allowResult=false}={}){if(this.lastQuality!==this.quality())this.size();const ending=['victory','defeat'].includes(this.policy.pending?.id??this.policy.active?.id),active=this.policy.update(this.now(),{blocked:blocked&&!(ending&&allowResult),reduced:this.reduced()});this.canvas.hidden=!active;if(!active)return;const now=this.now();if(now-this.lastDraw<33)return;this.lastDraw=now;this.drawCount++;const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height,p=clamp((now-active.start)/(active.end-active.start)),reduced=this.reduced(),E=smooth(0,reduced?.22:.105,p)*(1-smooth(reduced?.60:.56,1,p)),A=E*2;
 ctx.clearRect(0,0,w,h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';const texture=textures.get(active.id);if(texture){const zoom=reduced?1:1.04+.025*Math.sin(p*Math.PI),x=(w-w*zoom)*.5+(reduced?0:Math.sin(p*2.4)*w*.008);ctx.globalAlpha=clamp(A);ctx.drawImage(texture,x,(h-h*zoom)*.5,w*zoom,h*zoom);ctx.globalAlpha=1;}
 if(!reduced&&A>.001&&this.quality()!=='muy_baja')this.painter.draw(active.id,w,h,p,A,this.quality()!=='baja');
 }
 dispose(){this.resize.disconnect();this.policy.dispose();this.painter.dispose();this.canvas.remove();this.canvas.width=this.canvas.height=1;}
}
