import {pause,resume,emit} from '../simulation/game.js';
import {operational} from '../simulation/rules.js';
import {isMature} from '../simulation/crops.js';
import {BASIC_MESSAGES,BASIC_STEPS,TUTORIAL_MESSAGES,TUTORIAL_IDS,DEFENSES_FOLLOWUP} from './messages.js';
import {REPEATABLE_MAGIC_IDS,shieldReminderKey,usefulPeacefulMagic,recordMagicReminder} from './magic-reminders.js';
const known=new Set(TUTORIAL_IDS),reason='tutorial-reading';
const delivered=s=>s.crates.some(c=>c.delivered)||s.events.some(e=>e.type==='CrateDelivered');
function readingActionCompleted(s,id){
  if(id==='basic.center')return s.structures.some(c=>c.kind==='center'&&operational(c));
  if(id==='basic.plant')return s.plants.length>0;
  if(id==='basic.hiring')return s.hiringPaidDay!=null;
  if(id==='basic.work')return s.plants.some(p=>p.alive&&isMature(p))||s.crates.length>0||delivered(s);
  if(id==='basic.harvest')return delivered(s);
  return false;
}
function actionStep(s){
  if(delivered(s))return 'done';
  if(!s.structures.some(c=>c.kind==='center'&&operational(c)))return 'center';
  if(s.crates.some(c=>!c.delivered))return 'harvest';
  if(!s.plants.some(p=>p.alive))return 'plant';
  if(s.initialPreparation&&s.hiringPaidDay!==s.day)return 'hire';
  return s.plants.some(p=>p.alive&&isMature(p))?'harvest':'observe';
}
export class TutorialController {
  constructor(state,profile,{onError=()=>{},isNarrating=()=>false}={}){
    this.state=state;this.profile=profile;this.onError=onError;this.isNarrating=isNarrating;
    const t=state.tutorial??={step:'intro',seen:[]};
    t.seen=[...new Set((t.seen??[]).filter(id=>known.has(id)))];
    t.pending=[...new Set((t.pending??[]).filter(id=>known.has(id)))];
    t.guideAfterAuto=[...new Set((t.guideAfterAuto??[]).filter(id=>['basic.center','basic.plant'].includes(id)))];
    if(!BASIC_STEPS.includes(t.step))t.step='intro';
    if(!known.has(t.reading))t.reading=null;
    t.basicSkipped=t.basicSkipped===true;
    resume(state,reason);resume(state,'intro');resume(state,'tutorial-action');
    this.update();
  }
  seen(id,globalSeen){return this.state.tutorial.seen.includes(id)||globalSeen.has(id);}
  recordSeen(id){
    if(REPEATABLE_MAGIC_IDS.has(id))return;
    const t=this.state.tutorial;
    if(!t.seen.includes(id))t.seen.push(id);
    try{this.profile.record(id);}catch(error){this.onError(error);}
  }
  update(){
    const s=this.state,t=s.tutorial,globalSeen=this.profile.read();
    resume(s,reason);resume(s,'intro');
    // Real actions may complete while a spoken explanation is still audible.
    // Keep its reading identity until ended/manual dismissal, without undoing
    // actions or preventing the simulation from recording their completion.
    if(t.reading&&this.isNarrating(t.reading)){
      if(!t.basicSkipped&&t.step!=='done'&&(t.step!=='intro'||t.seen.includes('basic.introduction')))t.step=actionStep(s);
      return;
    }
    if(s.result==='defeat'){t.reading=null;resume(s,reason);resume(s,'tutorial-action');return;}
    if(t.basicSkipped){t.step='done';resume(s,'intro');resume(s,'tutorial-action');}
    else if(t.step!=='done'&&(t.step!=='intro'||t.seen.includes('basic.introduction')))t.step=actionStep(s);
    // A completed action advances its explanation immediately, so the next
    // HUD/world hand never waits behind a now-obsolete reading.
    if(t.reading&&readingActionCompleted(s,t.reading)){
      this.recordSeen(t.reading);t.reading=null;
    }
    const enqueue=(id,condition,localOnly=false)=>{
      if(condition&&!t.pending.includes(id)&&t.reading!==id&&!(localOnly?t.seen.includes(id):this.seen(id,globalSeen)))t.pending.push(id);
    };
    if(!s.raid){t.pending=t.pending.filter(id=>id!=='mechanic.first-raid');if(t.reading==='mechanic.first-raid')t.reading=null;}
    if(s.postgame||s.result==='victory'){
      t.pending=t.pending.filter(id=>id!=='mechanic.defenses');
      if(t.reading==='mechanic.defenses')t.reading=null;
    }
    enqueue('mechanic.defenses',!s.postgame&&s.result!=='victory'&&(s.day>1||s.time>=240));
    enqueue('mechanic.first-raid',!!s.raid);
    enqueue('magic.shield',!!s.raid);
    enqueue('magic.growth',s.day>=3);
    enqueue('magic.multiply',s.day>=5);
    enqueue('worker.recovery',s.workers.some(w=>w.incapacitated)||s.people.some(p=>p.recoveryUntil>=s.day));
    enqueue('campaign.liberation',s.result==='victory',true);
    enqueue('world.expansion',s.postgame&&!s.result);
    const shieldKey=shieldReminderKey(s),memo=t.magicReminders??{};
    if(this.reminderCheckAt===undefined||s.elapsed-this.reminderCheckAt>=2||s.elapsed<this.reminderCheckAt){
      this.reminderCheckAt=s.elapsed;this.usefulMagic=usefulPeacefulMagic(s);
    }
    const repeatable=[];
    if(shieldKey&&(memo.shieldRaid!==shieldKey||t.reading==='reminder.shield'))repeatable.push(this.seen('magic.shield',globalSeen)?'reminder.shield':'magic.shield');
    for(const kind of this.usefulMagic??[])if(!s.raid&&s.time<300&&s.cooldowns[kind]===0&&this.seen('magic.'+kind,globalSeen)&&(t.reading==='reminder.'+kind||s.elapsed-(memo[kind+'At']??0)>=120&&s.elapsed-(memo.lastAt??0)>=75))repeatable.push('reminder.'+kind);
    t.pending=t.pending.filter(id=>!REPEATABLE_MAGIC_IDS.has(id)||repeatable.includes(id));
    if(REPEATABLE_MAGIC_IDS.has(t.reading)&&!repeatable.includes(t.reading))t.reading=null;
    for(const id of repeatable)if(!t.pending.includes(id)&&t.reading!==id)t.pending.push(id);
    const urgentShield=repeatable.find(id=>id.endsWith('.shield'));
    if(urgentShield&&t.reading&&t.reading!==urgentShield&&!['basic.introduction','basic.center','basic.plant','basic.hiring'].includes(t.reading)){
      t.pending.unshift(t.reading);t.reading=null;
    }
    // A saved, acknowledged message must not hold a stale pause indefinitely.
    if(t.reading&&!REPEATABLE_MAGIC_IDS.has(t.reading)&&t.seen.includes(t.reading)){t.reading=null;resume(s,reason);}
    if(t.reading)return;
    if(s.pauses.some(p=>['menu','hidden','context-lost','hiring'].includes(p)))return;
    const basicId=BASIC_MESSAGES[t.step];
    const basicAvailable=!t.basicSkipped&&(s.day===1||t.step==='done')&&(t.step!=='done'||delivered(s));
    if(s.result==='victory')t.reading=t.seen.includes('campaign.liberation')?null:'campaign.liberation';
    else if(basicAvailable&&!t.seen.includes(basicId))t.reading=basicId;
    else {
      t.pending=t.pending.filter(id=>REPEATABLE_MAGIC_IDS.has(id)|| (id==='campaign.liberation'?!t.seen.includes(id):!this.seen(id,globalSeen)));
      if(s.result==='victory')t.reading=t.pending.includes('campaign.liberation')?'campaign.liberation':null;
      else {
        const urgent=s.raid&&['mechanic.first-raid','magic.shield'].find(id=>t.pending.includes(id));
        t.reading=urgentShield||urgent||t.pending.shift()||null;
      }
    }
    if(t.reading){t.pending=t.pending.filter(id=>id!==t.reading);recordMagicReminder(s,t.reading);this.presentationAge=0;this.presentationKey=null;emit(s,'TutorialMessageStarted',{messageId:t.reading});}
  }
  acknowledge(){
    const t=this.state.tutorial,id=t.reading;if(!id)return false;
    this.recordSeen(id);
    t.reading=null;resume(this.state,reason);
    if(id==='basic.introduction'){resume(this.state,'intro');t.step=actionStep(this.state);}
    this.update();return true;
  }
  skipBasic(){
    const t=this.state.tutorial;
    if(!this.profile.basicCompleted||t.step!=='intro'||t.reading!=='basic.introduction')return false;
    t.basicSkipped=true;t.step='done';t.reading=null;resume(this.state,'intro');resume(this.state,reason);this.update();return true;
  }
  advance(seconds,{visible=true}={}){
    const message=this.presentation();
    if(!message||!visible||this.isNarrating(message.id)){this.presentationAge=0;return false;}
    const key=message.id+':'+(message.variant??'')+':'+!!message.reading;
    if(key!==this.presentationKey){this.presentationKey=key;this.presentationAge=0;}
    this.presentationAge=(this.presentationAge??0)+Math.max(0,seconds);
    const duration=Math.max(8,Math.min(24,message.text.trim().split(/\s+/).length*60/155+2));
    if(this.presentationAge<duration)return false;
    return this.dismiss({automatic:true});
  }
  dismiss({automatic=false,message=this.presentation()}={}){
    if(!message)return false;
    if(message.reading&&this.state.tutorial.reading===message.id)this.acknowledge();
    const t=this.state.tutorial;
    t.dismissed=[...new Set([...(t.dismissed??[]),message.id+':'+(message.variant??'')])];
    t.guideAfterAuto=(t.guideAfterAuto??[]).filter(id=>id!==message.id);
    if(automatic&&['basic.center','basic.plant'].includes(message.id))t.guideAfterAuto.push(message.id);
    if(!automatic)resume(this.state,'tutorial-action');
    return true;
  }
  presentation(){
    if(this.lastPresentation&&this.isNarrating(this.lastPresentation.id)&&!this.state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p)))return this.lastPresentation;
    const message=this.currentPresentation();
    if(message&&!message.reading&&this.state.tutorial.dismissed?.includes(message.id+':'+(message.variant??'')))return null;
    this.lastPresentation=message;
    return message;
  }
  currentPresentation(){
    const s=this.state,t=s.tutorial;
    if(s.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p)))return null;
    if(t.reading){
      const id=t.reading,afterRaid=s.day>1||!!s.raid||!!(s.nightPlan?.done&&s.nightPlan.group?.length);
      return {id,...TUTORIAL_MESSAGES[id],...(id==='mechanic.defenses'&&afterRaid?{...DEFENSES_FOLLOWUP,variant:'after-raid'}:{}),blocking:false,reading:true,canSkip:id==='basic.introduction'&&this.profile.basicCompleted};
    }
    if(s.result==='victory')return {id:'campaign.liberation',...TUTORIAL_MESSAGES['campaign.liberation'],blocking:false,result:true};
    if(s.result==='defeat')return {id:'result.defeat',gesture:'warning',text:s.messages.at(-1)?.text??'Faltan recursos para alimentar otro mañana.',blocking:false,result:true};
    if(s.day===1&&!t.basicSkipped&&t.step!=='done'){
      if(t.step==='harvest'&&s.crates.some(c=>!c.delivered)&&!s.plants.some(p=>p.alive&&isMature(p)))return {id:'basic.harvest',variant:'delivery',gesture:'idle',text:'Paciencia: la cosecha aún tiene camino. La caja va al centro; cobrarás al entregarla. Si queda en el suelo, no pierde su valor: esperará a que tu equipo vuelva por ella.',blocking:false};
      return {id:BASIC_MESSAGES[t.step],...TUTORIAL_MESSAGES[BASIC_MESSAGES[t.step]],blocking:false};
    }
    return null;
  }
}
