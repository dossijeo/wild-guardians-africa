import {pause,resume,emit} from '../simulation/game.js';
import {operational} from '../simulation/rules.js';
import {isMature} from '../simulation/crops.js';
import {BASIC_MESSAGES,BASIC_STEPS,TUTORIAL_MESSAGES,TUTORIAL_IDS} from './messages.js';
const known=new Set(TUTORIAL_IDS),reason='tutorial-reading';
const delivered=s=>s.crates.some(c=>c.delivered)||s.events.some(e=>e.type==='CrateDelivered');
function actionStep(s){
  if(delivered(s))return 'done';
  if(!s.structures.some(c=>c.kind==='center'&&operational(c)))return 'center';
  if(s.crates.some(c=>!c.delivered))return 'harvest';
  if(!s.plants.some(p=>p.alive))return 'plant';
  if(s.initialPreparation&&s.hiringPaidDay!==s.day)return 'hire';
  return s.plants.some(p=>p.alive&&isMature(p))?'harvest':'observe';
}
export class TutorialController {
  constructor(state,profile,{onError=()=>{}}={}){
    this.state=state;this.profile=profile;this.onError=onError;
    const t=state.tutorial??={step:'intro',seen:[]};
    t.seen=[...new Set((t.seen??[]).filter(id=>known.has(id)))];
    t.pending=[...new Set((t.pending??[]).filter(id=>known.has(id)))];
    if(!BASIC_STEPS.includes(t.step))t.step='intro';
    if(!known.has(t.reading))t.reading=null;
    t.basicSkipped=t.basicSkipped===true;
    if(!t.reading)resume(state,reason);
    this.update();
  }
  seen(id,globalSeen){return this.state.tutorial.seen.includes(id)||globalSeen.has(id);}
  update(){
    const s=this.state,t=s.tutorial,globalSeen=this.profile.read();
    if(s.result==='defeat'){t.reading=null;resume(s,reason);return;}
    if(t.basicSkipped){t.step='done';resume(s,'intro');}
    else if(s.day===1&&(t.step!=='intro'||t.seen.includes('basic.introduction')))t.step=actionStep(s);
    const enqueue=(id,condition,localOnly=false)=>{
      if(condition&&!t.pending.includes(id)&&t.reading!==id&&!(localOnly?t.seen.includes(id):this.seen(id,globalSeen)))t.pending.push(id);
    };
    enqueue('mechanic.defenses',s.day>=2);
    enqueue('mechanic.first-raid',!!s.raid);
    enqueue('magic.shield',s.day>=2&&!!s.raid);
    enqueue('magic.growth',s.day>=3);
    enqueue('magic.multiply',s.day>=5);
    enqueue('worker.recovery',s.workers.some(w=>w.incapacitated)||s.people.some(p=>p.recoveryUntil>=s.day));
    enqueue('campaign.liberation',s.result==='victory',true);
    enqueue('world.expansion',s.postgame&&!s.result);
    // A saved, acknowledged message must not hold a stale pause indefinitely.
    if(t.reading&&t.seen.includes(t.reading)){t.reading=null;resume(s,reason);}
    if(t.reading){pause(s,reason);return;}
    if(s.pauses.some(p=>['menu','hidden','context-lost','hiring'].includes(p)))return;
    const basicId=BASIC_MESSAGES[t.step];
    const basicAvailable=!t.basicSkipped&&(s.day===1||t.step==='done')&&(t.step!=='done'||delivered(s));
    if(s.result==='victory')t.reading=t.seen.includes('campaign.liberation')?null:'campaign.liberation';
    else if(basicAvailable&&!t.seen.includes(basicId))t.reading=basicId;
    else {
      t.pending=t.pending.filter(id=>id==='campaign.liberation'?!t.seen.includes(id):!this.seen(id,globalSeen));
      if(s.result==='victory')t.reading=t.pending.includes('campaign.liberation')?'campaign.liberation':null;
      else {
        const urgent=s.raid&&['mechanic.first-raid','magic.shield'].find(id=>t.pending.includes(id));
        t.reading=urgent||t.pending.shift()||null;
      }
    }
    if(t.reading){t.pending=t.pending.filter(id=>id!==t.reading);pause(s,reason);emit(s,'TutorialMessageStarted',{messageId:t.reading});}
  }
  acknowledge(){
    const t=this.state.tutorial,id=t.reading;if(!id)return false;
    if(!t.seen.includes(id))t.seen.push(id);
    try{this.profile.record(id);}catch(error){this.onError(error);}
    t.reading=null;resume(this.state,reason);
    if(id==='basic.introduction'){resume(this.state,'intro');t.step=actionStep(this.state);}
    this.update();return true;
  }
  skipBasic(){
    const t=this.state.tutorial;
    if(!this.profile.basicCompleted||t.step!=='intro'||t.reading!=='basic.introduction')return false;
    t.basicSkipped=true;t.step='done';t.reading=null;resume(this.state,'intro');resume(this.state,reason);this.update();return true;
  }
  presentation(){
    const s=this.state,t=s.tutorial;
    if(s.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p)))return null;
    if(t.reading){const id=t.reading;return {id,...TUTORIAL_MESSAGES[id],blocking:true,canSkip:id==='basic.introduction'&&this.profile.basicCompleted};}
    if(s.result==='victory')return {id:'campaign.liberation',...TUTORIAL_MESSAGES['campaign.liberation'],blocking:false,result:true};
    if(s.result==='defeat')return {id:'result.defeat',gesture:'warning',text:s.messages.at(-1)?.text??'No quedan recursos suficientes para continuar.',blocking:false,result:true};
    if(s.day===1&&!t.basicSkipped&&t.step!=='done'){
      if(t.step==='harvest'&&s.crates.some(c=>!c.delivered)&&!s.plants.some(p=>p.alive&&isMature(p)))return {id:'basic.harvest',variant:'delivery',gesture:'idle',text:'La caja recogida viaja al centro. Espera su entrega: las monedas se cobran al llegar. Si una caja queda en el suelo, conserva su valor hasta que el equipo pueda recuperarla.',blocking:false};
      return {id:BASIC_MESSAGES[t.step],...TUTORIAL_MESSAGES[BASIC_MESSAGES[t.step]],blocking:false};
    }
    return null;
  }
}
