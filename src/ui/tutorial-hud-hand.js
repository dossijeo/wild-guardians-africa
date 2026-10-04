import {HAND_ASSETS,HAND_INFO} from '../rendering/hands-native.js';
import {assetUrl} from '../rendering/asset-url.js';

export function tutorialHudHandTarget(state,message,toolKind=null){
  if(state.day!==1||state.result||state.tutorial.basicSkipped||state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p)))return null;
  const step=state.tutorial.step;
  message??=state.tutorial.guideAfterAuto?.includes('basic.'+step)?{id:'basic.'+step}:null;
  if(!message)return null;
  if(!['center','plant'].includes(step)||message.id!=='basic.'+step||toolKind===step)return null;
  if(state.tutorial.dismissed?.includes(message.id+':')&&!state.tutorial.guideAfterAuto?.includes(message.id))return null;
  return `[data-menu="${step==='center'?'build':'grow'}"]`;
}

export class TutorialHudHand{
  constructor(stage){
    this.stage=stage;this.image=document.createElement('img');this.image.className='tutorial-hud-hand';this.image.src=assetUrl(HAND_ASSETS.point);this.image.alt='';this.image.setAttribute('aria-hidden','true');this.image.hidden=true;
    const info=HAND_INFO.point;this.image.style.setProperty('--hand-pivot-x',-info.pivot[0]*100+'%');this.image.style.setProperty('--hand-pivot-y',-info.pivot[1]*100+'%');this.image.width=92;
    stage.append(this.image);this.observer=new ResizeObserver(()=>this.place());this.observer.observe(stage);
  }
  show(selector){this.selector=selector;this.place();}
  place(){
    const target=this.selector&&this.stage.querySelector(this.selector),rect=target?.getBoundingClientRect();
    this.image.hidden=!rect||!rect.width||!rect.height||target.disabled||document.hidden;
    if(this.image.hidden)return;
    const position=(rect.left-5)+'px:'+ (rect.top+rect.height*.5)+'px';
    if(position===this.position)return;this.position=position;
    this.image.style.left=(rect.left-5)+'px';this.image.style.top=(rect.top+rect.height*.5)+'px';
  }
  dispose(){this.observer.disconnect();this.image.remove();}
}
