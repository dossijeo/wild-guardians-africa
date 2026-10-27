import {EVENTS} from './definitions.js';
// DEV-only integrated pointer replay: uses real projection, occlusion, ownership and RAF.
// Never changes particle progress, economy or completion outcomes directly.
// The catalogue uses the existing DEV day/night selector and economy-disabled forcing.
export function attachGestureQa(c){
 const button=document.createElement('button');button.textContent='QA Primary interaction';
 const result=document.createElement('output');result.setAttribute('aria-label','QA Gesture result');result.style.cssText='position:absolute;bottom:12px;left:12px;z-index:52;background:#10251bdd;color:#e5f5cf;padding:7px;pointer-events:none;font:12px monospace';result.textContent='QA primary: idle';c.qaControls.append(button);c.stage.append(result);
 c.abort.signal.addEventListener('abort',()=>result.remove(),{once:true});
 async function run(){
  const active=c.active;if(!active||active.outcome||button.disabled)return null;
  button.disabled=true;c.qaPrimaryOnly=true;c.qaFrozen=false;c.qaControls.style.visibility='hidden';let claimed=false,elapsed=0,last=performance.now(),start=null,target=-1;
  const rect=c.world.canvas.getBoundingClientRect(),mode=active.def.primary.mode,id=991;
  const send=(type,point)=>{c.input(type,{target:c.world.canvas,pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:point.x,clientY:point.y,preventDefault(){},stopImmediatePropagation(){}});claimed=c.owned.has(id);};
  const screen=(x,y)=>c.space.project({x,y,phase:0,progress:0},c.world.camera,rect);
  const visible=()=>{for(let i=0;i<c.particles.count;i++){const p=c.particles.pool[i];if(p.progress>=.95||p.reveal<=.2)continue;const s=c.space.project(p,c.world.camera,rect);if(document.elementFromPoint(s.x,s.y)===c.world.canvas&&c.space.hit(c.particles,s.x,s.y,c.world.camera,rect,c.world)>=0)return i;}return -1;};
  result.textContent='QA primary: running '+active.def.id;
  try{
   while(c.active===active&&!active.outcome&&elapsed<active.def.lifetime-.3&&!c.disposed){
    await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();elapsed+=(now-last)/1000;last=now;
    if(!claimed){target=visible();if(target<0)continue;const p=c.particles.pool[target];start={x:p.x,y:p.y,at:elapsed};send('pointerdown',c.space.project(p,c.world.camera,rect));if(!claimed){send('pointerup',c.space.project(p,c.world.camera,rect));continue;}}
    if(target<0){send('pointerup',screen(c.pointer.x,c.pointer.y));continue;}
    const p=c.particles.pool[target],age=elapsed-start.at;let point;
    if(mode==='catch'){send('pointerup',c.space.project(p,c.world.camera,rect));continue;}
    if(mode==='gather'){const t=Math.min(1,age/1.5);point=screen(start.x*(1-t),start.y*(1-t));send('pointermove',point);if(t===1){send('pointerup',point);continue;}}
    else if(mode==='pull'){const t=Math.min(1,age/.35);point=screen(start.x,start.y-65*t);send('pointermove',point);if(t===1){send('pointerup',point);continue;}}
    else if(mode==='swirl'){const a=age*6;point=screen(Math.cos(a)*65,Math.sin(a)*65);send('pointermove',point);}
    else if(mode==='guide'){const head=c.particles.pool[0];point=screen(head.x-35,head.y);send('pointermove',point);}
    else if(mode==='hold'){} // Deliberate primary hold for flowers, not a fallback.
    else {if(p.progress>=.95){target=visible();if(target<0){send('pointerup',screen(c.pointer.x,c.pointer.y));continue;}}const next=c.particles.pool[target],a=age*14;point=screen(next.x+Math.cos(a)*18,next.y+Math.sin(a)*18);send('pointermove',point);}
   }
  }finally{
   send('pointerup',screen(c.pointer.x,c.pointer.y));
   await new Promise(resolve=>requestAnimationFrame(resolve));await new Promise(resolve=>requestAnimationFrame(resolve));
   c.qaPrimaryOnly=false;const report={event:active.def.id,mode,completed:active.outcome==='completed',usedFallback:c.particles.usedFallback,duration:elapsed};result.dataset.report=JSON.stringify(report);result.textContent='QA primary: '+JSON.stringify(report);c.qaControls.style.visibility='';button.disabled=false;c.qaControls.querySelector('[aria-pressed]')?.setAttribute('aria-pressed','false');
  }
  return JSON.parse(result.dataset.report);
 }
 button.onclick=run;
 const tour=document.createElement('button');tour.textContent='QA Catalogue gestures';c.qaControls.append(tour);
 tour.onclick=async()=>{
  if(tour.disabled)return;tour.disabled=true;const reports=[];
  try{for(const def of Object.values(EVENTS)){if(c.disposed||c.blocked().length)break;c.cancel('qa-catalogue');c.state.time=def.night?310:100;c.world.focusFarm();if(!await c.force(def.id)){reports.push({event:def.id,skipped:'incompatible-context-or-anchor',blocked:c.blocked(),anchors:c.anchors.length,cameraContacts:c.cameraPointers.size,pointerOwners:c.owned.size,pending:c.pending,ticketOpen:!!c.state.microevents.ticket});continue;}const report=await run();if(report)reports.push(report);result.dataset.catalogue=JSON.stringify(reports);}}
  finally{tour.disabled=false;result.dataset.catalogue=JSON.stringify(reports);result.textContent='QA catalogue finished: '+reports.length+' checked, '+reports.filter(r=>r.completed).length+' primary completions';}
 };
}
