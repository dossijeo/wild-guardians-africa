import {awakeningHudState} from './awakening-hud.js';
import {agriculturalGuidePlant} from '../tutorial/agricultural-guide.js';

export function tutorialHudHandTarget(state,message,toolKind=null,toolSpell=null){
  if(state.result||state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p)))return null;
  if(message?.id==='magic.awakening')return toolKind!=='awakening'&&awakeningHudState(state).available?'#awakeningButton':null;
  if(state.day!==1||state.tutorial.basicSkipped)return null;
  if(['magic.growth','magic.multiply'].includes(message?.id)){const kind=message.id.slice(6);return state.raid||!agriculturalGuidePlant(state,kind)||toolKind==='spell'&&toolSpell===kind?null:'[data-menu="magic"]';}
  const step=state.tutorial.step;
  message??=state.tutorial.guideAfterAuto?.includes('basic.'+step)?{id:'basic.'+step}:null;
  if(!message)return null;
  if(!['center','plant'].includes(step)||message.id!=='basic.'+step||toolKind===step)return null;
  if(state.tutorial.dismissed?.includes(message.id+':')&&!state.tutorial.guideAfterAuto?.includes(message.id))return null;
  return `[data-menu="${step==='center'?'build':'grow'}"]`;
}

// Target discovery only: the 3D Guardian owns all visible guidance.
export class TutorialHudGuide{
 constructor(stage){this.stage=stage;this.visible=false;}
 show(selector){this.selector=selector;this.place();}
 place(){const target=this.selector&&this.stage.querySelector(this.selector),rect=target?.getBoundingClientRect();this.visible=!!rect?.width&&!!rect?.height&&!target.disabled&&!document.hidden;this.rect=this.visible?rect:null;}
 dispose(){}
}
