import {ASSETS} from './native-hud.js';
import {permission} from '../simulation/rules.js';
import {assetUrl} from '../rendering/asset-url.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function awakeningHudState(state,{selecting=false,blocked=false}={}){
  const progress=clamp(state.awakenings?.progress??0,0,100),ready=progress>=100;
  const available=ready&&state.awakenings?.enabled!==false&&permission(state,'awakening')&&!blocked;
  return {progress,ready,available,selecting,disabled:!selecting&&!available,
    label:selecting?'Cancelar selección de Despertar':ready?'Despertar disponible: bendecir una planta o muralla':`Energía de Despertar: ${Math.floor(progress)} de 100`,
    caption:selecting?'Elige una planta o muralla':ready?'¡Despertar!':'Despertar'};
}
// Allocate the new circular control inside the existing action column's vertical budget.
export function awakeningHudPlacement(dims,{statsRight=0,menuLeft=dims.w}={}){
  const {w,h,header,reserve,portrait,short}=dims;
  if(portrait){
    const gap=short?3:4,available=h-header-reserve-10,diameter=Math.min(clamp(w*.27,78,112),(available-4*44/.715-4*gap)/1.25),height=diameter*1.25;
    const aw=Math.max(44,Math.min(dims.aw,(available-height-4*gap)/4*.715));
    const ah=aw/.715,total=4*ah+4*gap+height,top=header+Math.max(5,(h-reserve-header-total)/2);
    return {portrait:true,right:Math.max(6,12+(aw-diameter)/2),top:top+4*ah+4*gap,width:diameter,height,
      actions:{top,width:aw,gap},noticeOffset:0};
  }
  const left=statsRight+16,available=menuLeft-12-left;
  if(available>=128)return {portrait:false,left,top:short?7:8,width:Math.min(520,available),height:short?54:92,noticeOffset:0};
  return {portrait:false,left:12,top:header+8,width:Math.min(240,w-dims.aw-36),height:48,noticeOffset:58};
}
export class AwakeningHud {
  constructor(stage,onActivate){
    this.stage=stage;this.element=stage.ownerDocument.createElement('div');this.element.id='awakeningHud';this.element.setAttribute('role','group');this.element.setAttribute('aria-label','Despertares');
    this.element.innerHTML=`<span class="awakening-accessible-meter" role="progressbar" aria-label="Energía de Despertar" aria-valuemin="0" aria-valuemax="100"></span>
      <button type="button" id="awakeningButton" disabled><svg class="awakening-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45"/><circle class="awakening-ring-value" cx="50" cy="50" r="45"/></svg>
      <img class="awakening-icon" alt="" aria-hidden="true"><span class="awakening-caption">Despertar</span><span class="awakening-short-caption" aria-hidden="true">Despertar</span><span class="awakening-bar" aria-hidden="true"><i></i></span><span class="awakening-value" aria-hidden="true">0 / 100</span></button>`;
    this.button=this.element.querySelector('button');this.button.onclick=onActivate;
    for(const [name,key] of [['corner-left','frame_tl'],['corner-right','frame_tr']])this.element.style.setProperty('--awakening-'+name,`url("${assetUrl(ASSETS[key].src)}")`);
    this.element.querySelector('img').src=assetUrl(ASSETS.magic_icon.src);stage.querySelector('#hud').append(this.element);
  }
  render(state,options={}){
    const view=awakeningHudState(state,options);
    this.button.disabled=view.disabled;this.button.setAttribute('aria-label',view.label);this.button.setAttribute('aria-pressed',String(view.selecting));
    const last=state.awakenings?.history.at(-1);
    this.button.title=last?`${view.label} · Última jornada: agricultura ${last.agriculture.toFixed(1)}, economía ${last.economy.toFixed(1)}, defensa ${last.defense.toFixed(1)}, acontecimientos ${last.events.toFixed(1)}`:view.label;
    this.element.classList.toggle('is-ready',view.available);this.element.classList.toggle('is-selecting',view.selecting);
    this.stage.classList.toggle('awakening-selecting',view.selecting);
    this.element.style.setProperty('--awakening-progress',view.progress/100);
    this.element.style.setProperty('--awakening-arc',String(282.7433*(1-view.progress/100)));
    this.element.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(Math.floor(view.progress)));
    this.element.querySelector('.awakening-caption').textContent=view.caption;
    this.element.querySelector('.awakening-short-caption').textContent=view.selecting?'Cancelar':'Despertar';
    this.element.querySelector('.awakening-value').textContent=`${Math.floor(view.progress)} / 100`;
  }
  layout(dims){
    const days=this.stage.querySelector('#days'),menu=this.stage.querySelector('#menuButton');
    const placement=awakeningHudPlacement(dims,{statsRight:days.offsetLeft+days.offsetWidth,menuLeft:menu.offsetLeft});
    this.element.classList.toggle('is-medallion',placement.portrait);
    Object.assign(this.element.style,{left:placement.left===undefined?'auto':placement.left+'px',right:placement.right===undefined?'auto':`max(${placement.right}px, env(safe-area-inset-right, 0px))`,top:placement.top+'px',width:placement.width+'px',height:placement.height+'px'});
    if(placement.actions){
      const {width,top,gap}=placement.actions;dims.aw=width;this.stage.style.setProperty('--action-w',width+'px');
      this.stage.querySelector('#actions').style.top=top+'px';this.stage.querySelector('#actions').style.gap=gap+'px';
      this.stage.querySelector('#events').style.width=Math.min(240,dims.w-width-35)+'px';
    }
    if(placement.noticeOffset){
      const events=this.stage.querySelector('#events'),banner=this.stage.querySelector('#placementBanner');
      events.style.top=(dims.header+placement.noticeOffset+8)+'px';banner.style.top=(dims.header+placement.noticeOffset+8)+'px';
    }
    return dims;
  }
  dispose(){this.button.onclick=null;this.element.remove();}
}
