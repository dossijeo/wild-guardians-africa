const agricultural=kind=>kind==='growth'||kind==='multiply';
const measured=value=>Number.isFinite(value)&&value>=0?value:null;

// Read-only UI telemetry. Contact duration is measured input, not thinking time
// or a claim of total human engagement. Selection timeout never earns credit.
export class ManualMagicActivity {
 constructor(){this.reset();}
 reset(){this.days=new Map();this.active=new Map();this.day=null;}
 row(day){
  if(!this.days.has(day))this.days.set(day,{day,selections:0,selectionContactSeconds:0,unknownSelectionContacts:0,
   applications:0,applicationContactSeconds:0,unknownApplicationContacts:0,applicationCpuSeconds:0,
   meaningfulApplicationContactSeconds:0,redundantMultiplyApplications:0,nonproductiveGrowthApplications:0,
   simulatedEffectSeconds:0,extraGrowthSeconds:0,benefitedPlantCount:0,ids:new Set()});
  return this.days.get(day);
 }
 selected(day,kind,seconds){
  if(!agricultural(kind))return;
  const row=this.row(day),contact=measured(seconds);row.selections++;
  if(contact===null)row.unknownSelectionContacts++;else row.selectionContactSeconds+=contact;
 }
 applied(state,spell,{gestureSeconds=null,applicationCpuSeconds=0,benefited=false}={}){
  if(!agricultural(spell?.kind)||this.active.has(spell.id))return false;
  this.update(state);
  const row=this.row(state.day),contact=measured(gestureSeconds);row.applications++;
  if(contact===null)row.unknownApplicationContacts++;else row.applicationContactSeconds+=contact;
  row.applicationCpuSeconds+=measured(applicationCpuSeconds)??0;
  const entry={spell,day:state.day,contact:contact??0,remaining:spell.remaining,extra:0,credited:false};
  if(spell.kind==='multiply'){
   if(benefited)this.credit(row,entry);else row.redundantMultiplyApplications++;
  }
  this.active.set(spell.id,entry);return true;
 }
 credit(row,entry){
  if(entry.credited)return;entry.credited=true;
  row.meaningfulApplicationContactSeconds+=entry.contact;
  row.ids?.add(entry.spell.targetPlantId);row.benefitedPlantCount=row.ids?.size??row.benefitedPlantCount;
 }
 update(state){
  for(const [id,entry] of this.active){
   const row=this.row(entry.day),remaining=entry.spell.remaining>1e-9?entry.spell.remaining:0,extra=entry.spell.growthSecondsAdded??0;
   row.simulatedEffectSeconds+=Math.max(0,entry.remaining-remaining);entry.remaining=remaining;
   row.extraGrowthSeconds+=Math.max(0,extra-entry.extra);entry.extra=extra;
   if(extra>0)this.credit(row,entry);
   if(remaining===0){if(entry.spell.kind==='growth'&&!entry.credited)row.nonproductiveGrowthApplications++;this.active.delete(id);}
  }
  // Finished days retain aggregates, not every benefited plant identity.
  if(this.day!==null&&this.day!==state.day){
   const previous=this.days.get(this.day);
   if(previous&&![...this.active.values()].some(entry=>entry.day===this.day))previous.ids=null;
  }
  this.day=state.day;
 }
 report(state){
  if(state)this.update(state);
  return {scope:'Measured pointer contact and native effect execution; not total human engagement or an inactivity estimate.',
   humanManualActivitySeconds:null,selectedModeActivityCreditSeconds:0,effectDurationActivityCreditSeconds:0,
   days:[...this.days.values()].map(({ids,...row})=>({...row}))};
 }
}

// Retains a single pointer's button contact until its click; keyboard/programmatic
// selection has unknown contact duration rather than an invented nominal time.
export function bindMagicSelectionContact(element){
 let down=null,seconds=null;
 element.addEventListener('pointerdown',event=>{down={id:event.pointerId,time:event.timeStamp};seconds=null;});
 element.addEventListener('pointerup',event=>{seconds=down?.id===event.pointerId?Math.max(0,(event.timeStamp-down.time)/1000):null;down=null;});
 element.addEventListener('pointercancel',()=>{down=null;seconds=null;});
 return ()=>{const result=seconds;seconds=null;return result;};
}
