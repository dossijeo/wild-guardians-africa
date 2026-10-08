import {loadingCopy} from './loading-copy.js';
import {loadingWaitMessage} from '../app/loading-recipe.js';
const text=(element,value)=>{if(element.textContent!==value)element.textContent=value;};

export class LoadingOverlay {
 constructor({locale='en-US',pointer='mouse',onCancel=()=>{},document:doc=document}={}){
  this.locale=locale;this.pointer=pointer;this.element=doc.createElement('div');this.element.id='world-loading';this.element.className='interactive-loading-indicator';
  this.element.innerHTML='<div class="interactive-loading-info"><div class="interactive-loading-heading"><span class="interactive-loading-title" role="status"></span><span id="loading-progress"></span></div><div class="interactive-loading-track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div><small class="interactive-loading-help"></small></div><button id="loading-cancel" class="interactive-loading-cancel"></button>';
  this.title=this.element.querySelector('.interactive-loading-title');this.percent=this.element.querySelector('#loading-progress');this.track=this.element.querySelector('.interactive-loading-track');this.bar=this.track.firstElementChild;this.help=this.element.querySelector('.interactive-loading-help');this.cancel=this.element.querySelector('#loading-cancel');this.cancel.onclick=onCancel;
 }
 render(snapshot,progress,{night=0,accepting=true,pointer=this.pointer}={}){
  if(this.disposed)return;this.pointer=pointer;const copy=loadingCopy(snapshot,{locale:this.locale,pointer,progress});
  text(this.title,snapshot.unchangedFor>15000&&!snapshot.ready?loadingWaitMessage(snapshot,this.locale).replace(/ · \d+ %$/,''):copy.title);
  text(this.percent,copy.percent+' %');text(this.help,accepting?copy.help:'');text(this.cancel,copy.cancel);
  if(this.value!==copy.value){this.value=copy.value;this.bar.style.transform='scaleX('+copy.value+')';this.element.dataset.progress=String(copy.value);}
  if(this.track.getAttribute('aria-valuenow')!==String(copy.percent))this.track.setAttribute('aria-valuenow',String(copy.percent));if(this.track.getAttribute('aria-label')!==copy.title)this.track.setAttribute('aria-label',copy.title);
  const dark=String(night>=.5);if(this.element.dataset.night!==dark)this.element.dataset.night=dark;
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.cancel.onclick=null;this.element.remove();}
}
