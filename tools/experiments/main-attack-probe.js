import {Box3,Vector3} from 'three';
// DEV-only, opt-in UI integration probe. Never modifies simulation state,
// health, cooldowns, camera or target picking. One user-armed attempt only.
export function installMainAttackProbe(getContext){
 const panel=document.createElement('aside');panel.id='main-attack-probe';panel.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;background:#122d;color:white;padding:8px;max-width:430px;font:12px monospace';
 const arm=document.createElement('button');arm.textContent='QA: attack next visible beast';const output=document.createElement('pre');output.style.cssText='max-height:160px;overflow:auto;margin:4px 0';panel.append(arm,output);document.body.append(panel);
 let armed=false,receipt=null,targetId=null,started=0,lastPhase='',raf=0,pointerId=1;
 const box=new Box3(),point=new Vector3();
 const describe=a=>a?{id:a.id,species:a.species,status:a.status,phase:a.magicDown?.phase??null,x:a.x,z:a.z,health:a.magicHealth??null}:null;
 const show=()=>{output.textContent=JSON.stringify(receipt??{status:armed?'waiting for an unpaused, visible, pickable animal':'idle'},null,2);};
 arm.onclick=e=>{pointerId=e.pointerId>0?e.pointerId:1;armed=true;receipt=null;targetId=null;lastPhase='';arm.disabled=true;show();};show();
 function frame(){
  raf=requestAnimationFrame(frame);const {state,world}=getContext();if(!world||!state)return;
  if(targetId){
   const animal=state.raid?.animals.find(a=>a.id===targetId),phase=animal?`${animal.status}/${animal.magicDown?.phase??'normal'}`:'absent';
   if(phase!==lastPhase){receipt.transitions.push({elapsed:state.elapsed-started,...describe(animal),phase});lastPhase=phase;show();}
   receipt.maxGuardian=Math.max(receipt.maxGuardian,world.guardianSummons?.stats.active??0);
   if(state.elapsed-started>15){receipt.final=describe(animal);receipt.finalCooldown=state.cooldowns.attack;receipt.status='finished';targetId=null;arm.disabled=false;show();}return;
  }
  if(!armed||state.pauses?.length||!world.actorsReady()||(state.cooldowns.attack??0)>0)return;
  const canvas=world.canvas,rect=canvas.getBoundingClientRect();
  for(const animal of state.raid?.animals??[]){
   if(animal.status==='gone')continue;const object=world.objects.get(animal.id);if(!object)continue;box.setFromObject(object);
   for(const height of [.5,.35,.7]){
    point.set((box.min.x+box.max.x)/2,box.min.y+(box.max.y-box.min.y)*height,(box.min.z+box.max.z)/2).project(world.camera);
    if(Math.abs(point.x)>.9||Math.abs(point.y)>.8||point.z< -1||point.z>1)continue;
    const clientX=rect.left+(point.x+1)*rect.width/2,clientY=rect.top+(1-point.y)*rect.height/2;
    if(document.elementFromPoint(clientX,clientY)!==canvas||world.pick({clientX,clientY}).entityId!==animal.id)continue;
    document.querySelector('[data-menu="magic"]')?.click();const button=document.querySelector('[data-spell="attack"]');
    if(!button||button.disabled){document.querySelector('#close-hud-panel')?.click();return;}
    receipt={status:'attempt',syntheticPointer:true,target:describe(animal),beforeCooldown:state.cooldowns.attack,clientX,clientY,transitions:[],maxGuardian:0};button.click();
    const event={clientX,clientY,pointerId,button:0,pointerType:'mouse',isPrimary:true,bubbles:true};
    canvas.dispatchEvent(new PointerEvent('pointerdown',{...event,buttons:1}));canvas.dispatchEvent(new PointerEvent('pointerup',{...event,buttons:0}));
    receipt.afterCooldown=state.cooldowns.attack;receipt.accepted=receipt.afterCooldown>receipt.beforeCooldown;receipt.status=receipt.accepted?'observing':'not accepted';
    armed=false;started=state.elapsed;targetId=receipt.accepted?animal.id:null;arm.disabled=receipt.accepted;show();return;
   }
  }
 }
 raf=requestAnimationFrame(frame);addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
}
