import {paintLoadingFrame} from './loading-frame.js';
import {loadingCopy} from './loading-copy.js';
import {loadingWaitMessage} from '../app/loading-recipe.js';
const text=(element,value)=>{if(element.textContent!==value)element.textContent=value;};

export class LoadingOverlay {
 constructor({locale='en-US',pointer='mouse',onCancel=()=>{},frameImages=null,document:doc=document,observeResize=callback=>new ResizeObserver(callback)}={}){
  this.locale=locale;this.pointer=pointer;this.element=doc.createElement('div');this.element.id='world-loading';this.element.className='interactive-loading-indicator';
  this.element.innerHTML='<div class="interactive-loading-info"><div class="interactive-loading-wood"><canvas class="loading-frame" aria-hidden="true"></canvas><div class="interactive-loading-heading"><span class="interactive-loading-title" role="status"></span><span id="loading-progress"></span></div><div class="interactive-loading-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div></div><small class="interactive-loading-help"></small></div><button id="loading-cancel" class="interactive-loading-cancel"><canvas class="loading-frame" aria-hidden="true"></canvas><span></span></button>';
  this.title=this.element.querySelector('.interactive-loading-title');this.percent=this.element.querySelector('#loading-progress');this.track=this.element.querySelector('.interactive-loading-track');this.bar=this.track.firstElementChild;this.help=this.element.querySelector('.interactive-loading-help');this.cancel=this.element.querySelector('#loading-cancel');this.cancelLabel=this.cancel.querySelector('span');this.cancel.onclick=onCancel;this.frameImages=frameImages;this.frameHosts=[this.element.querySelector('.interactive-loading-wood'),this.cancel];
  if(frameImages?.frame_center)this.help.style.backgroundImage='url("'+frameImages.frame_center.src+'")';
  this.resizeObserver=observeResize(()=>this.paintFrames());for(const host of this.frameHosts)this.resizeObserver.observe(host);
 }
 paintFrames(){if(this.disposed||!this.frameImages)return;for(const host of this.frameHosts)paintLoadingFrame(host,this.frameImages);}
 render(snapshot,progress,{night=0,accepting=true,pointer=this.pointer}={}){
  if(this.disposed)return;this.pointer=pointer;const copy=loadingCopy(snapshot,{locale:this.locale,pointer,progress});
  text(this.title,snapshot.unchangedFor>15000&&!snapshot.ready?loadingWaitMessage(snapshot,this.locale).replace(/ · \d+ %$/,''):copy.title);
  text(this.percent,copy.percent+' %');text(this.help,accepting?copy.help:'');text(this.cancelLabel,copy.cancel);
  if(this.value!==copy.value){this.value=copy.value;this.bar.style.transform='scaleX('+copy.value+')';this.element.dataset.progress=String(copy.value);}
  if(this.track.getAttribute('aria-valuenow')!==String(copy.percent))this.track.setAttribute('aria-valuenow',String(copy.percent));if(this.track.getAttribute('aria-label')!==copy.title)this.track.setAttribute('aria-label',copy.title);
  const dark=String(night>=.5);if(this.element.dataset.night!==dark)this.element.dataset.night=dark;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.resizeObserver.disconnect();this.cancel.onclick=null;this.frameImages=null;this.element.remove();}
}
