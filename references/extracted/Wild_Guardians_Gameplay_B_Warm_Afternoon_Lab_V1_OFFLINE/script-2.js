
'use strict';
(()=>{
const $=id=>document.getElementById(id);
const BANK=JSON.parse($('bank').textContent);
const embedded=JSON.parse($('settings').textContent||'{}');
const tracks=BANK.tracks, ids=tracks.map(t=>t.id), byId=new Map(tracks.map(t=>[t.id,t]));
const PRESETS={
 full:{name:'Mezcla completa',text:'Warm Afternoon: suma de los diez stems, sin cambiar sus balances relativos.',levels:[1,1,1,1,1,1,1,1,1,1]},
 day:{name:'Día',text:'Acompañamiento abierto, viento moderado y un pulso relajado.',levels:[0,.52,.54,.74,.66,.5,0,.42,.28,.62]},
 activity:{name:'Actividad',text:'Más percusión y graves, conservando los acompañamientos del tema B.',levels:[0,.8,.76,.8,.75,.84,0,.52,.4,.54]},
 night:{name:'Noche',text:'Menos ritmo, vientos presentes y acompañamiento suave.',levels:[0,.06,.27,.6,.48,.12,0,.6,.12,.82]},
 danger:{name:'Peligro',text:'Pulso y graves en primer plano; el viento se retira.',levels:[0,.78,.74,.44,.55,.78,0,.32,.18,.15]},
 attack:{name:'Ataque',text:'La versión más rítmica del mismo tema; no acelera la canción.',levels:[0,1,.9,.6,.7,1,0,.5,.38,.3]},
 spirit:{name:'Espiritual',text:'Vientos y resonancias con apenas percusión.',levels:[0,0,.22,.45,.55,.10,0,.66,.18,.88]},
 minimal:{name:'Mínima',text:'Solo bajo, Guitar y Keyboard a niveles contenidos.',levels:[0,0,.2,.50,.4,0,0,0,0,0]}
};
let custom=embedded.customScenes||{};
let levels=Object.fromEntries(ids.map((id,i)=>[id,Number(embedded.levels?.[id]??1)]));
let selected=PRESETS[embedded.scene]?embedded.scene:'full';
let solos=new Set(),mutes=new Set();
let ctx=null,bus=null,master=null,analyser=null,loadPromise=null;
let buffers=new Map(),errors=new Map(),decks=[],primary=null,nextDeck=null;
let running=false,paused=false,starting=false,version=0,parked=0,loopCount=0;
let duration=BANK.duration,scheduled=[],returnEvent=null,nextAuto=Infinity,autoOn=false,lastAutoId=null;
let curves=new Map(ids.map(id=>[id,{from:levels[id],to:levels[id],start:0,end:0}]));
let tickTimer=null,lastPaint=0,raf=0,uid=0;
const limits={max:1,min:0};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
const fmt=x=>`${Math.floor(Math.max(0,x)/60).toString().padStart(2,'0')}:${Math.floor(Math.max(0,x)%60).toString().padStart(2,'0')}`;
const bar=()=>240/clamp($('bpm').value,45,220);
const desiredMap=scene=>Object.fromEntries(ids.map((id,i)=>[id,clamp((custom[scene]||PRESETS[scene].levels)[i])]));
// Horizontal navigation: all ten stems travel together. Adjacent source sections do NOT create a new deck.
const NAV=BANK.navigation;
let sections=structuredClone(embedded.navigation?.sections||NAV.sections);
let routeEdges=structuredClone(NAV.edges).map(e=>({...e,enabled:embedded.navigation?.edges?.[e.id]??e.enabled}));
let currentSection=null,routePlan=null,forcedNext=null,routeHistory=[],lastJumpAt=-Infinity,lastJumpEdge=null;
let navBusyUntil=0,sessionOrigin=0,jumpCount=0,previewStopAt=null,previewRestoreMode=null;
let lastNavLabel='',navVisitSerial=0;
const sectionById=id=>sections.find(s=>s.id===id);
const sectionFor=pos=>sections.find(s=>pos>=s.start-.001&&pos<s.end-.001)||sections[sections.length-1];
const naturalAfter=s=>sections[sections.indexOf(s)+1]||null;
const secondsText=x=>Math.max(0,x).toFixed(2).replace('.',',')+' s';
function navReset(pos,clearHistory=false){
 if(previewRestoreMode!==null){$('navMode').value=previewRestoreMode;previewRestoreMode=null;}
 currentSection=sectionFor(pos);routePlan=null;forcedNext=null;previewStopAt=null;navBusyUntil=0;
 if(clearHistory){routeHistory=[];lastJumpAt=-Infinity;lastJumpEdge=null;jumpCount=0;sessionOrigin=ctx?.currentTime||0;}
 if(currentSection)recordVisit(currentSection,'inicio');
}
function recordVisit(s,kind){
 routeHistory.push({id:s.id,title:s.title,at:ctx?.currentTime||0,kind,n:++navVisitSerial});
 if(routeHistory.length>24)routeHistory.shift();renderPath();renderMap();
}
function jumpChoices(s,now){
 if($('navMode').value!=='graph'||now-lastJumpAt<NAV.minSecondsBetweenJumps)return [];
 return routeEdges.filter(e=>e.enabled&&e.source===s.id&&e.id!==lastJumpEdge&&e.target!==s.id).map(e=>({edge:e,section:sectionById(e.target)})).filter(x=>x.section);
}
function chooseDestination(s,now){
 const natural=naturalAfter(s);
 if(forcedNext){const target=sectionById(forcedNext);forcedNext=null;if(target)return {target,kind:target===natural?'natural':'manual',edge:null};}
 if($('navMode').value==='hold')return {target:s,kind:'hold',edge:null};
 if(!natural)return {target:$('repeat').value==='blend'?sections[0]:null,kind:$('repeat').value==='blend'?'wrap':'stop',edge:null};
 let choices=jumpChoices(s,now);
 if(choices.length&&Math.random()<Number($('branchChance').value)){
  // Only choose among explicitly registered edges; context cannot invent a connection.
  const targetDensity={full:.85,day:.75,activity:1,night:.5,danger:.9,attack:1,spirit:.55,minimal:.5}[selected]??.8;
  const weights=choices.map(x=>{
   const visited=routeHistory.slice(-3).some(h=>h.id===x.section.id)?0.5:1;
   return visited*(.5+Math.max(0,1-Math.abs(x.section.density-targetDensity)));
  });
  let r=Math.random()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<weights.length-1&&r>weights[index];index++)r-=weights[index];
  return {target:choices[index].section,kind:'jump',edge:choices[index].edge.id};
 }
 return {target:natural,kind:'natural',edge:null};
}
function planRoute(){
 if(!running||!primary||!currentSection||routePlan)return;
 const at=primary.start+(currentSection.end-primary.offset);
 const pick=chooseDestination(currentSection,Math.max(ctx.currentTime,at));
 routePlan={from:currentSection,target:pick.target,kind:pick.kind,edge:pick.edge,at,committed:false,deck:null,fade:0};
 // Prepare well before a splice. Random layer automation rests around it.
 // Gain evolution is held only while a splice approaches or settles.
 renderMap();
}
function replanRoute(){
 if(!routePlan?.committed){routePlan=null;navBusyUntil=0;if(running)planRoute();}
 renderMap();saveLight();
}
function prepareSplice(plan){
 if(!plan.target||plan.kind==='natural'||plan.kind==='stop')return;
 const start=plan.target.start;
 // A short preroll crossfade ends ON the destination downbeat: no restart of separate instruments.
 const isIntro=start<.01;
 const fade=isIntro?Math.min(Number($('loopFade').value),Math.max(.25,plan.from.end-plan.from.start-.2)):Math.min(Number($('spliceFade').value),start,.45);
 const at=plan.at,when=at-fade;
 if(when<=ctx.currentTime+.015)return false;
 const offset=isIntro?0:start-fade;
 const deck=createDeck(when,offset,fade);
 primary.gain.gain.cancelScheduledValues(when);
 primary.gain.gain.setValueAtTime(1,when);
 primary.gain.gain.linearRampToValueAtTime(0,at);
 for(const v of primary.voices.values()){try{v.source.stop(at+.012);}catch{}}
 primary.stopAt=at+.015;deck.navTarget=plan.target.id;
 plan.deck=deck;plan.fade=fade;plan.committed=true;navBusyUntil=at+bar()*NAV.protectAfterJumpBars;
 for(const task of scheduled)if(task.when>=at-bar()*2&&task.when<navBusyUntil)task.when=navBusyUntil;scheduled.sort((a,b)=>a.when-b.when);
 // Do not let random automation coincide with the splice. Explicit player controls still work.
 nextAuto=Math.max(nextAuto,at+bar()*2);
 return true;
}
function runNavigation(){
 if(!running||!primary||paused)return;
 const now=ctx.currentTime;
 if(previewStopAt&&now>=previewStopAt){
  const restore=previewRestoreMode;previewStopAt=null;previewRestoreMode=null;stop();
  if(restore)$('navMode').value=restore;info('Audición del empalme terminada. Puedes repetirla o desactivar ese enlace.');return;
 }
 planRoute();const p=routePlan;if(!p)return;
 if(!['natural','stop'].includes(p.kind)&&!p.committed){
  const lead=p.target?.start<.01?Math.min(Number($('loopFade').value),Math.max(.25,p.from.end-p.from.start-.2)):Number($('spliceFade').value);
  if(now>=p.at-lead-2.2){
   if(now<p.at-lead-.02)prepareSplice(p);
   else if(now>=p.at-.02){
    // Missed scheduling deadline: keep playing the original recording instead of making a late cut.
    log('Temporizador retrasado: se conserva el recorrido original, sin salto tardío.');
    if(position()<duration-.06){currentSection=sectionFor(position()+.02);routePlan=null;forcedNext=null;return;}
    const loop=$('repeat').value==='blend';stop();if(loop)play().catch(report);return;
   }
  }
 }
 if(now>=p.at){
  if(p.kind==='stop'){
   running=false;paused=false;parked=duration;scheduled=[];returnEvent=null;clearInterval(tickTimer);disposeAll();routePlan=null;
   info('Fin de la canción');refreshControls();return;
  }
  if(p.kind==='natural'){
   currentSection=p.target;recordVisit(currentSection,'continuidad');
   log('Continuidad · '+p.from.id+' → '+currentSection.id+' · no se corta ni reinicia el audio.');
  }else if(p.deck){
   primary=p.deck;nextDeck=null;currentSection=p.target;jumpCount++;lastJumpAt=p.at;
   if(p.edge)lastJumpEdge=p.edge;
   if(p.kind==='wrap')loopCount++;
   recordVisit(currentSection,p.kind==='wrap'?'retorno':'salto');
   log((p.kind==='wrap'?'Retorno global':'Salto sincronizado')+' · '+p.from.id+' → '+currentSection.id+' · diez stems juntos'+(p.kind==='wrap'?' · fundido fin/inicio.':' · preroll '+Math.round(p.fade*1000)+' ms.'));
   if(previewRestoreMode!==null)previewStopAt=p.at+6;
  }
  routePlan=null;planRoute();renderMap();
 }
 for(const d of [...decks])if(d!==primary&&d!==routePlan?.deck&&now>(d.stopAt??d.end)+.025)disposeDeck(d);
}
function queueSection(id){
 if(!sectionById(id))return;
 if(!running){parked=sectionById(id).start;currentSection=sectionById(id);paint(true);renderMap();info('Seleccionada '+id+' · pulsa Reproducir.');return;}
 forcedNext=id;
 if(!routePlan?.committed)routePlan=null;
 planRoute();log('Destino manual '+id+' · entra al terminar la sección, no inmediatamente.');
}
async function playSection(id){
 const s=sectionById(id);if(!s)return;
 if(paused)await togglePause();
 await seek(s.start);if(!running)await play();
}
async function auditionEdge(edgeId){
 const e=routeEdges.find(e=>e.id===edgeId);if(!e)return;
 if(buffers.size!==tracks.length){info('Termina la carga local antes de probar un empalme.');return;}
 const mode=$('navMode').value;stop();autoOn=false;$('navMode').value='graph';
 parked=Math.max(sectionById(e.source).start,sectionById(e.source).end-4);
 await play();forcedNext=e.target;routePlan=null;previewRestoreMode=mode;planRoute();
 log('Audición de '+e.source+' → '+e.target+' · 4 s antes y 6 s después, con la mezcla actual.');
}
function renderPath(){
 const root=$('routePath');if(!root)return;root.replaceChildren();
 for(const h of routeHistory.slice(-12)){
  const item=document.createElement('span');item.className='pathchip '+(h.kind==='salto'?'jump':'');item.textContent=h.id;item.title=h.title+' · '+h.kind;root.append(item);
 }
 if(!routeHistory.length)root.textContent='El recorrido aparecerá aquí.';
}
function renderMap(){
 if(!$('sections'))return;
 for(const el of $('sections').children){
  const id=el.dataset.section;el.classList.toggle('current',id===currentSection?.id);el.classList.toggle('planned',id===routePlan?.target?.id);
  const s=sectionById(id);if(!s)continue;
  el.querySelector('.section-time').textContent=fmt(s.start)+' – '+fmt(s.end);
  el.querySelector('.section-duration').textContent=(s.end-s.start).toFixed(1).replace('.',',')+' s';
 }
 const current=currentSection?currentSection.id+' · '+currentSection.title:'Entrada';
 $('sectionNow').textContent=current;
 const p=routePlan;
 $('routeNext').textContent=p?(p.target?p.from.id+' → '+p.target.id+(p.kind==='natural'?' · continuidad':p.kind==='wrap'?' · retorno global':' · salto conjunto'):'Termina la canción'):'Elige cómo recorrer la canción.';
 const label=$('navMode').value==='source'?'Orden original':$('navMode').value==='hold'?'Sección fija · prueba':'Grafo prudente';
 $('navLabel').textContent=label;
}
function renderSectionCards(){
 const root=$('sections');root.replaceChildren();
 for(const s of sections){
  const el=document.createElement('article');el.className='section-card';el.dataset.section=s.id;
  el.innerHTML='<div class="section-head"><b class="section-letter"></b><span class="section-duration"></span></div><h3></h3><div class="section-time"></div><div class="section-energy"><i></i></div><p></p><div class="section-actions"><button data-listen-section="'+s.id+'">Escuchar</button><button data-queue-section="'+s.id+'">Después</button></div>';
  el.querySelector('.section-letter').textContent=s.id;el.querySelector('h3').textContent=s.title;el.querySelector('p').textContent=s.description;
  el.querySelector('.section-energy i').style.width=(s.density*100)+'%';root.append(el);
 }
 renderMap();
}
function renderEdges(){
 $('edges').replaceChildren();
 for(const e of routeEdges){
  const row=document.createElement('div');row.className='edge-row';
  row.innerHTML='<label><input type="checkbox" data-edge="'+e.id+'"><strong>'+e.source+' → '+e.target+'</strong></label><div><span class="edge-why"></span><small>Enlace candidato · ajuste por oído pendiente</small></div><button data-preview-edge="'+e.id+'">Probar empalme</button>';
  row.querySelector('input').checked=e.enabled;row.querySelector('.edge-why').textContent=e.reason;$('edges').append(row);
 }
}
function renderCuts(){
 $('cuts').replaceChildren();
 for(let i=1;i<sections.length;i++){
  const row=document.createElement('label');row.className='cut-item';
  const text=document.createElement('span');text.textContent=sections[i-1].id+' / '+sections[i].id;
  const input=document.createElement('input');input.type='number';input.min='0';input.max=String(duration);input.step='.01';input.value=String(sections[i].start);input.dataset.cut=String(i);input.setAttribute('aria-label','Corte '+text.textContent+' en segundos');row.append(text,input);$('cuts').append(row);
 }
}
function applyCuts(){
 const bounds=[0,...[...$('cuts').querySelectorAll('input')].map(x=>Number(x.value)),duration];
 if(bounds.some(x=>!Number.isFinite(x))||bounds.some((x,i)=>i>0&&x-bounds[i-1]<2)){info('Los cortes deben ser crecientes y dejar al menos dos segundos por zona.',true);return;}
 for(let i=0;i<sections.length;i++){sections[i].start=bounds[i];sections[i].end=bounds[i+1];sections[i].bars=(bounds[i+1]-bounds[i])/bar();}
 renderSectionCards();renderCuts();if(running)seek(position()).catch(report);else currentSection=sectionFor(parked);
 saveLight();log('Cortes ajustados manualmente. Reescucha los empalmes: la puntuación original ya no valida estos nuevos puntos.');
}
function resetCuts(){sections=structuredClone(NAV.sections);renderSectionCards();renderCuts();if(running)seek(position()).catch(report);saveLight();}
function navPaint(){
 const p=routePlan,now=ctx?.currentTime||0;
 $('routeCountdown').textContent=running&&p?Math.max(0,p.at-now).toFixed(1).replace('.',',')+' s para el límite':'Sin corte programado';
 $('listenClock').textContent=running?fmt(Math.max(0,now-sessionOrigin)):'00:00';$('jumpCount').textContent=String(jumpCount);
 const n=currentSection||sections[0];const x=clamp((position()-n.start)/(n.end-n.start));$('sectionProgress').style.width=(x*100)+'%';
 if(currentSection?.id!==lastNavLabel){lastNavLabel=currentSection?.id;renderMap();}
}
function navWire(){
 renderSectionCards();renderEdges();renderCuts();renderPath();
 $('routePlay').onclick=()=>play().catch(report);
 $('loadSaved').onclick=()=>restoreLocalB1().catch(report);
 $('navMode').onchange=()=>{replanRoute();renderMap();};
 $('branchChance').onchange=replanRoute;$('spliceFade').onchange=replanRoute;
 $('applyCuts').onclick=applyCuts;$('resetCuts').onclick=resetCuts;
 $('originalOrder').onclick=async()=>{stop();$('navMode').value='source';autoOn=false;chooseScene('full');await play();};
 document.addEventListener('click',e=>{
  const l=e.target.closest('[data-listen-section]');if(l)playSection(l.dataset.listenSection).catch(report);
  const q=e.target.closest('[data-queue-section]');if(q)queueSection(q.dataset.queueSection);
  const p=e.target.closest('[data-preview-edge]');if(p)auditionEdge(p.dataset.previewEdge).catch(report);
 });
 document.addEventListener('change',e=>{if(e.target.dataset.edge){const a=routeEdges.find(x=>x.id===e.target.dataset.edge);if(a)a.enabled=e.target.checked;replanRoute();log((a.enabled?'Activado':'Desactivado')+' el enlace '+a.source+' → '+a.target);}});
}

async function restoreLocalB1(){
 let obj;try{obj=JSON.parse(localStorage.getItem('wg-gameplay-b-warm-afternoon-v1-settings'));}catch{}
 if(!obj){info('No hay ajustes de Gameplay B guardados en este navegador.',true);return;}
 const pos=position(),wasRunning=running;
 custom=obj.customScenes||{};selected=PRESETS[obj.scene]?obj.scene:'full';
 levels=Object.fromEntries(ids.map(id=>[id,clamp(obj.levels?.[id]??1)]));solos.clear();mutes.clear();
 if(obj.navigation?.sections?.length===NAV.sections.length){
  const s=obj.navigation.sections;
  const valid=s.every((v,i)=>v.id===NAV.sections[i].id&&Number.isFinite(v.start)&&Number.isFinite(v.end)&&v.end-v.start>=2&&v.start>=0&&v.end<=duration+.01&&(i===0?v.start===0:Math.abs(v.start-s[i-1].end)<.002));
  if(valid)sections=structuredClone(s);
 }
 for(const e of routeEdges)e.enabled=obj.navigation?.edges?.[e.id]??true;
 for(const [id,value] of Object.entries(obj.controls||{})){
  if(id==='quality')continue;const e=$(id);if(!e||!['bpm','gridOffset','volume','cadence','density','quantize','fade','repeat','loopFade','navMode','branchChance','spliceFade'].includes(id))continue;
  if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===String(value)))continue;e.value=value;
 }
 $('volumeLabel').textContent=$('volume').value+'%';if(master)master.gain.setTargetAtTime(clamp(Number($('volume').value)/100),ctx.currentTime,.05);
 renderSectionCards();renderCuts();renderEdges();
 if(wasRunning)await seek(pos);else{currentSection=sectionFor(pos);buildTransition(levels,false);}
 renderValues();refreshControls();renderMap();log('Mezcla, rutas y cortes locales recuperados. Se conserva la calidad de decodificación actual.');
}

function info(message,bad=false){$('status').textContent=message;$('status').classList.toggle('error',bad);}
function log(message){const row=document.createElement('div');row.textContent=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})+' · '+message;$('history').prepend(row);while($('history').children.length>25)$('history').lastChild.remove();}
function report(e){const msg=e?.message||String(e);info(msg,true);log('Error · '+msg);console.error(e);}
function bytes(t){const s=atob(t.data),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
function effective(id){return mutes.has(id)||(solos.size&&!solos.has(id))?0:levels[id];}
function valueAt(id,time){const p=curves.get(id);if(!p)return 0;if(time<=p.start)return p.from;if(time>=p.end)return p.to;return p.from+(p.to-p.from)*(time-p.start)/(p.end-p.start);}
function makeContext(){
 if(ctx)return ctx;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Este navegador no admite Web Audio. Abre el archivo en Chrome, Edge, Firefox o Safari.');
 ctx=new AC({sampleRate:Number($('quality').value),latencyHint:'interactive'});
 bus=ctx.createGain();bus.gain.value=BANK.safetyGain;
 master=ctx.createGain();master.gain.value=Number($('volume').value)/100;
 analyser=ctx.createAnalyser();analyser.fftSize=512;
 bus.connect(master);master.connect(analyser);analyser.connect(ctx.destination);
 return ctx;
}
async function loadBank(){
 if(loadPromise)return loadPromise;
 if(buffers.size===tracks.length)return;
 loadPromise=(async()=>{
  makeContext();$('quality').disabled=true;info('Decodificando audios locales…');
  for(const t of tracks){
   if(buffers.has(t.id))continue;
   try{
    const array=bytes(t);
    const b=await ctx.decodeAudioData(array.buffer);
    if(!Number.isFinite(b.duration)||b.duration<1)throw Error('Audio vacío o no válido');
    if(Math.abs(b.duration-BANK.duration)>.08)throw Error('Duración inesperada; no se forzará la velocidad para encajarla.');
    buffers.set(t.id,b);errors.delete(t.id);
   }catch(e){errors.set(t.id,e.message);log(t.title+' · '+e.message);}
   $('loadCount').textContent=`${buffers.size}/${tracks.length}`;
   $('loadBar').style.width=`${buffers.size/tracks.length*100}%`;
   $('status').textContent=`Preparando ${t.title} · ${buffers.size}/${tracks.length}`;
   renderStripsStatus();await new Promise(r=>setTimeout(r,0));
  }
  if(errors.size)throw Error('No se han podido decodificar todas las pistas. Revisa las fichas marcadas.');
  const lengths=[...buffers.values()].map(b=>b.duration);
  if(Math.max(...lengths)-Math.min(...lengths)>.02)throw Error('Los stems no comparten duración; se ha detenido la sincronización.');
  duration=Math.max(...lengths);$('seek').max=String(duration);$('duration').textContent=fmt(duration);
  $('memory').textContent=`${ctx.sampleRate/1000} kHz · estéreo · ${Math.round([...buffers.values()].reduce((a,b)=>a+b.length*b.numberOfChannels*4,0)/1048576)} MB decodificados`;
  info('10/10 pistas listas · sin conexión');$('loadPanel').classList.add('done');
  log('Banco listo: diez audios completos de '+duration.toFixed(2)+' s. Ningún stem recortado o acelerado.');
  refreshControls();renderStripsStatus();
 })();
 try{return await loadPromise;}finally{loadPromise=null;$('quality').disabled=false;refreshControls();}
}
function refreshControls(){
 $('play').disabled=starting||(!running&&buffers.size!==tracks.length);
 $('play').textContent=starting?'Preparando…':running?(paused?'Continuar':'Pausar'):'Reproducir';
 $('stop').disabled=!running&&parked===0;
 $('seek').disabled=buffers.size!==tracks.length; $('routePlay').disabled=$('play').disabled; $('routePlay').textContent=$('play').textContent;
 $('export').disabled=starting;
 $('auto').classList.toggle('on',autoOn);$('auto').setAttribute('aria-pressed',String(autoOn));$('auto').textContent=autoOn?'Evolución: ON':'Evolución: OFF';
 $('evolve').disabled=buffers.size!==tracks.length||paused;
 $('clearSolo').disabled=solos.size===0;
 $('quality').disabled=!!loadPromise||starting;
 $('repeat').disabled=starting;
 $('sceneName').textContent=returnEvent?(returnEvent.name+' · temporal'):PRESETS[selected].name;
 $('sceneText').textContent=returnEvent?'Cambio temporal de mezcla; no es una melodía de evento nueva.':PRESETS[selected].text;
 document.querySelectorAll('[data-scene]').forEach(b=>{const v=b.dataset.scene===selected&&!returnEvent;b.classList.toggle('selected',v);b.setAttribute('aria-pressed',String(v));});
}
function setCurve(id,target,at,seconds=2){
 at=Math.max(at,ctx?.currentTime||0);target=clamp(target);
 const prev=curves.get(id);if(prev&&Math.abs(prev.to-target)<1e-6)return;
 const from=valueAt(id,at),end=at+Math.max(.015,seconds);
 for(const d of decks){
  const g=d.voices.get(id)?.gain;if(!g)continue;
  g.gain.cancelScheduledValues(at);g.gain.setValueAtTime(from,at);g.gain.linearRampToValueAtTime(target,end);
 }
 curves.set(id,{from,to:target,start:at,end});
}
function initialiseGain(g,id,when){
 const c=curves.get(id);g.gain.setValueAtTime(valueAt(id,when),when);
 if(c&&c.end>when){if(c.start>when)g.gain.setValueAtTime(c.from,c.start);g.gain.linearRampToValueAtTime(c.to,c.end);}
}
function createDeck(when,offset,fadeIn=.06){
 const deck={id:++uid,start:when,offset,end:when+duration-offset,voices:new Map(),gain:ctx.createGain(),disposed:false};
 deck.gain.gain.setValueAtTime(0,when);deck.gain.gain.linearRampToValueAtTime(1,when+fadeIn);deck.gain.connect(bus);
 for(const t of tracks){
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffers.get(t.id);
  source.playbackRate.value=1;source.loop=false;
  initialiseGain(gain,t.id,when);source.connect(gain);gain.connect(deck.gain);
  source.start(when,offset);source.stop(deck.end+.01);
  deck.voices.set(t.id,{source,gain});
 }
 decks.push(deck);return deck;
}
function disposeDeck(d){
 if(!d||d.disposed)return;d.disposed=true;
 for(const v of d.voices.values()){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}
 d.gain.disconnect();decks=decks.filter(x=>x!==d);
}
function disposeAll(){for(const d of [...decks])disposeDeck(d);primary=null;nextDeck=null;}
function position(){if(!running||!primary)return parked;return clamp(primary.offset+Math.max(0,ctx.currentTime-primary.start),0,duration);}
function actualLevels(){return Object.fromEntries(ids.map(id=>[id,valueAt(id,ctx?.currentTime||0)]));}
async function play(){
 if(starting)return;
 if(running){await togglePause();return;}
 const v=++version;starting=true;refreshControls();
 try{
  makeContext();await ctx.resume();await loadBank();if(v!==version)return;
  if(parked>=duration-.05)parked=0;
  for(const id of ids)curves.set(id,{from:effective(id),to:effective(id),start:0,end:0});
  running=true;paused=false;loopCount=0;scheduled=[];returnEvent=null;
  primary=createDeck(ctx.currentTime+.1,parked);navReset(parked,true);nextAuto=ctx.currentTime+autoInterval();
  tickTimer=setInterval(schedule,50);schedule();info('Reproduciendo · diez stems sincronizados · velocidad original');log('Reproducción desde '+fmt(parked));
 }catch(e){running=false;disposeAll();report(e);}finally{starting=false;refreshControls();}
}
async function togglePause(){
 if(!running)return;
 if(paused){await ctx.resume();paused=false;info('Reproduciendo · stems sincronizados');}
 else{await ctx.suspend();paused=true;info('En pausa · todas las pistas detenidas juntas');}
 refreshControls();
}
function stop(){
 ++version;starting=false;running=false;paused=false;parked=0;scheduled=[];returnEvent=null;
 clearInterval(tickTimer);disposeAll();routePlan=null;forcedNext=null;previewStopAt=null;if(previewRestoreMode!==null){$('navMode').value=previewRestoreMode;previewRestoreMode=null;}currentSection=sections[0];renderMap();if(ctx?.state==='suspended')ctx.resume().catch(report);
 info(buffers.size===tracks.length?'Detenido · diez pistas locales listas':'Preparando el banco…');refreshControls();paint(true);
}
async function seek(sec){
 parked=clamp(sec,0,Math.max(0,duration-.05));scheduled=[];returnEvent=null;
 if(running){
  const snapshot=actualLevels();disposeAll();
  for(const id of ids)curves.set(id,{from:snapshot[id],to:snapshot[id],start:0,end:0});
  primary=createDeck(ctx.currentTime+.06,parked);navReset(parked,false);nextAuto=ctx.currentTime+autoInterval();
  // Resume a partly applied scene at the new song position without changing source speed.
  buildTransition(Object.fromEntries(ids.map(id=>[id,effective(id)])),false);
 }
 if(!running){currentSection=sectionFor(parked);routePlan=null;}log('Todas las pistas → '+fmt(parked));renderMap();paint(true);refreshControls();
}
function nextBoundary(){
 const now=ctx?.currentTime||0;if(!running||!primary)return now+.04;
 const n=Number($('quantize').value);if(!n)return now+.08;
 const origin=primary.start-primary.offset+Number($('gridOffset').value||0),step=bar()*n;
 return origin+Math.ceil((now+.2-origin)/step)*step;
}
function clearPending(){scheduled=[];returnEvent=null;}
function buildTransition(target,quantized=true){
 scheduled=[];
 if(!running){for(const id of ids)curves.set(id,{from:target[id],to:target[id],start:0,end:0});return;}
 const now=ctx.currentTime,fade=Number($('fade').value);
 const diff=ids.filter(id=>Math.abs(valueAt(id,now)-target[id])>.015);
 // Bring new support in before taking existing layers out. Keep strong rhythmic anchors until late.
 diff.sort((a,b)=>{
  const aOn=valueAt(a,now)<.12&&target[a]>.12,bOn=valueAt(b,now)<.12&&target[b]>.12;
  if(aOn!==bOn)return aOn?-1:1;
  const anchor=id=>BANK.anchorIds.includes(id)?1:0;
  return anchor(a)-anchor(b);
 });
 let at=quantized?nextBoundary():now+.04;
 for(const id of diff){scheduled.push({id,target:target[id],when:at,fade});at+=Math.max(bar(),fade+.15);}
 if(diff.length)log('Transición progresiva · '+diff.length+' capas; las demás siguen sin reiniciarse.');
 nextAuto=at+autoInterval();
}
function chooseScene(name){
 if(!PRESETS[name])return;
 clearPending();solos.clear();mutes.clear();selected=name;levels=desiredMap(name);
 buildTransition(levels);renderValues();refreshControls();log('Escena · '+PRESETS[name].name);replanRoute();saveLight();
}
function manualChanged(){clearPending();autoOn=false;nextAuto=Infinity;}
function applyMasks(){
 scheduled=[];
 const at=ctx?.currentTime||0;
 for(const id of ids){if(running)setCurve(id,effective(id),at+.02,.12);else curves.set(id,{from:effective(id),to:effective(id),start:0,end:0});}
 renderValues();refreshControls();
}
async function solo(id){
 manualChanged();
 if(solos.has(id))solos.delete(id);else solos.add(id);
 applyMasks();log(solos.size?'Solo · '+[...solos].map(id=>byId.get(id).title).join(' + '):'Solo desactivado');
 if(!running&&solos.size)await play();
}
function mute(id){manualChanged();if(mutes.has(id))mutes.delete(id);else mutes.add(id);applyMasks();}
function gainChanged(id,value){manualChanged();levels[id]=clamp(value);applyMasks();saveLight();}
function autoInterval(){return bar()*Number($('cadence').value);}
function toggleAuto(){
 autoOn=!autoOn;
 if(autoOn&&selected==='full')chooseScene('day');
 nextAuto=(ctx?.currentTime||0)+autoInterval();refreshControls();log('Evolución '+(autoOn?'activada':'desactivada'));
}
function evolve(){
 if(solos.size||returnEvent||scheduled.length)return false;
 const base=desiredMap(selected==='full'?'day':selected);
 const candidates=tracks.filter(t=>!t.nearSilent&&base[t.id]>.14&&t.id!==lastAutoId);
 const active=ids.filter(id=>effective(id)>.13&&!byId.get(id).nearSilent);
 const density=Number($('density').value),cap=density+1;
 let choices=[];
 for(const t of candidates){
  const id=t.id,cur=levels[id],normal=base[id];
  if(cur>.13&&active.length>Math.max(2,density-1)&&!BANK.anchorIds.includes(id))choices.push({id,target:0});
  if(cur<.13&&active.length<cap)choices.push({id,target:normal});
  if(cur>.13)choices.push({id,target:Math.abs(cur-normal)<.08?normal*.48:normal});
 }
 if(!choices.length){nextAuto=(ctx?.currentTime||0)+autoInterval();return false;}
 const action=choices[Math.floor(Math.random()*choices.length)];lastAutoId=action.id;levels[action.id]=action.target;
 if(running)scheduled=[{id:action.id,target:action.target,when:nextBoundary(),fade:Number($('fade').value)}];
 else curves.set(action.id,{from:action.target,to:action.target,start:0,end:0});
 nextAuto=(ctx?.currentTime||0)+autoInterval();renderValues();
 log('Evolución · solo cambia '+byId.get(action.id).title+'; continúan las demás capas.');return true;
}
function triggerEvent(kind){
 if(!running){info('Inicia la canción para probar un evento temporal.');return;}
 // These are temporary arrangements of this song, not separately generated event melodies.
 const snapshot=returnEvent?.snapshot||{...levels};const savedScene=returnEvent?.scene||selected;
 const target=kind==='success'?{...desiredMap('activity'),s9:.9,s8:.45,s4:.8}: {...desiredMap('night'),s1:.04,s2:.18,s5:.08,s9:.55};
 solos.clear();mutes.clear();levels=target;
 const now=ctx.currentTime;scheduled=[];
 for(const id of ids)setCurve(id,target[id],now+.04,2.4);
 returnEvent={name:kind==='success'?'Éxito':'Fracaso',snapshot,scene:savedScene,at:now+bar()*8};
 renderValues();refreshControls();log('Evento '+returnEvent.name+' · mezcla temporal de 8 compases; después vuelve el ambiente.');
}
function schedule(){
 if(!running||paused||!ctx||!primary)return;
 const now=ctx.currentTime;
 while(scheduled.length&&scheduled[0].when<=now+.18){const item=scheduled.shift();setCurve(item.id,item.target,Math.max(now+.01,item.when),item.fade);}
 if(returnEvent&&now>=returnEvent.at){const ev=returnEvent;returnEvent=null;levels=ev.snapshot;selected=ev.scene;buildTransition(levels,false);renderValues();refreshControls();log('Regreso a '+PRESETS[selected].name);}
 const nearSplice=routePlan&&!['natural','stop'].includes(routePlan.kind)&&routePlan.at-now<bar()*2;
 if(autoOn&&!scheduled.length&&!returnEvent&&!nearSplice&&now>=navBusyUntil&&now>=nextAuto)evolve();
 runNavigation();
}

function renderStrips(){
 const root=$('strips');root.replaceChildren();
 for(const t of tracks){
  const el=document.createElement('article');el.className='strip';el.dataset.id=t.id;
  el.innerHTML=`<div class="striphead"><span class="tracknum">${Number(t.id.slice(1))+1<10?'0':''}${Number(t.id.slice(1))+1}</span><div><h3></h3><div class="trackrole"></div></div><span class="trackstate">En espera</span></div><canvas class="mini" height="34" aria-label="Actividad de la pista"></canvas><div class="stripcontrol"><button class="solo" data-solo="${t.id}" aria-pressed="false">Solo</button><button class="mute" data-mute="${t.id}" aria-pressed="false">Mute</button><input type="range" data-volume="${t.id}" min="0" max="100" step="1" aria-label="Volumen de ${t.title}"><output class="volumeLabel">100%</output><button class="download" data-download="${t.id}" aria-label="Descargar ${t.title}">MP3 ↓</button></div><div class="stripfoot"><span class="stripnote"></span><span class="activity"><i></i></span></div>`;
  el.querySelector('h3').textContent=t.title;
  el.querySelector('.trackrole').textContent=t.label;
  el.querySelector('.stripnote').textContent=t.nearSilent?'Señal casi ausente · no se amplifica automáticamente':'Audio íntegro · estéreo';
  if(t.nearSilent)el.classList.add('quiet');root.append(el);
 }
 renderValues();drawWaves();
}
function renderValues(){
 for(const t of tracks){const el=document.querySelector(`.strip[data-id="${t.id}"]`);if(!el)continue;
  el.querySelector('[data-volume]').value=String(Math.round(levels[t.id]*100));el.querySelector('.volumeLabel').textContent=Math.round(levels[t.id]*100)+'%';
  const s=solos.has(t.id),m=mutes.has(t.id);el.querySelector('.solo').classList.toggle('on',s);el.querySelector('.solo').setAttribute('aria-pressed',String(s));
  el.querySelector('.mute').classList.toggle('on',m);el.querySelector('.mute').setAttribute('aria-pressed',String(m));
  el.classList.toggle('masked',m||(solos.size&&!s));
 }
}
function renderStripsStatus(){
 for(const t of tracks){const el=document.querySelector(`.strip[data-id="${t.id}"]`),label=el?.querySelector('.trackstate');if(!label)continue;
  label.textContent=errors.has(t.id)?'Error':buffers.has(t.id)?(t.nearSilent?'Residual':'Lista'):'En espera';
  label.classList.toggle('ready',buffers.has(t.id));label.title=errors.get(t.id)||'';
 }
}
function drawCanvas(canvas,values,color,progress=null){
 if(!canvas||!values?.length)return;const ratio=Math.min(2,window.devicePixelRatio||1),width=Math.max(80,canvas.clientWidth);
 const height=Number(canvas.getAttribute('height'))||44;
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.dataset.cssHeight=height;
 canvas.style.height=height+'px';const g=canvas.getContext('2d');g.scale(ratio,ratio);g.clearRect(0,0,width,height);
 const peak=Math.max(...values,.001);g.fillStyle=color;
 const n=Math.min(values.length,Math.floor(width/3));for(let i=0;i<n;i++){const v=values[Math.floor(i*values.length/n)]/peak;const h=Math.max(1,v*(height-4));g.fillRect(i*width/n,(height-h)/2,Math.max(1,width/n-1.2),h);}
}
function drawWaves(){
 // Heights are supplied explicitly so resizing/exporting does not compound the pixel ratio.
 const wave=$('wave');wave.setAttribute('height','60');drawCanvas(wave,BANK.wave,'#95775c');
 for(const t of tracks){const c=document.querySelector(`.strip[data-id="${t.id}"] .mini`);c.setAttribute('height','34');drawCanvas(c,t.wave,t.nearSilent?'#6b6454':'#876e57');}
}
function paint(force=false){
 const now=performance.now();if(!force&&now-lastPaint<90)return;lastPaint=now;
 navPaint();const pos=position();$('position').textContent=fmt(pos);if(document.activeElement!==$('seek'))$('seek').value=String(pos);
 const percent=clamp(pos/duration)*100;$('playhead').style.left=percent+'%';$('waveCover').style.width=percent+'%';
 const beat=Math.max(0,(pos-Number($('gridOffset').value||0))/(60/Number($('bpm').value)));
 $('measure').textContent=`Compás ${Math.floor(beat/4)+1} · pulso ${Math.floor(beat%4)+1} · vuelta ${loopCount+1}`;
 $('activeCount').textContent=String(ids.filter(id=>valueAt(id,ctx?.currentTime||0)>.08&&!byId.get(id).nearSilent).length);
 if(scheduled.length)$('pending').textContent='Próximo cambio: '+byId.get(scheduled[0].id).title+' · '+Math.max(0,scheduled[0].when-(ctx?.currentTime||0)).toFixed(1)+' s';
 else if(returnEvent)$('pending').textContent='Regreso al ambiente en '+Math.max(0,returnEvent.at-ctx.currentTime).toFixed(0)+' s';
 else if(autoOn)$('pending').textContent='Evolución suave: una capa cada '+$('cadence').value+' compases';
 else $('pending').textContent=solos.size?'Solo activo. Las otras pistas siguen en su posición.':'Mezcla estable. El mapa decide la siguiente sección.';
 for(const t of tracks){const el=document.querySelector(`.strip[data-id="${t.id}"]`);if(!el)continue;
  const rms=t.energy[Math.min(t.energy.length-1,Math.floor(pos*2))]||0;
  const level=running&&!paused?rms*valueAt(t.id,ctx.currentTime):0;
  el.querySelector('.activity i').style.width=Math.min(100,Math.sqrt(level)*260)+'%';
  el.classList.toggle('audible',level>.0005);
 }
 if(analyser&&running&&!paused){const a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);let p=0;for(const v of a)p=Math.max(p,Math.abs(v));$('outputMeter').style.width=Math.min(100,p*100)+'%';}
 else $('outputMeter').style.width='0%';
}
function animate(){paint();raf=requestAnimationFrame(animate);}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function settings(){return {scene:selected,levels:{...levels},customScenes:custom,controls:Object.fromEntries(['bpm','gridOffset','quality','volume','cadence','density','quantize','fade','repeat','loopFade','navMode','branchChance','spliceFade'].map(id=>[id,$(id).value])),navigation:{sections:structuredClone(sections),edges:Object.fromEntries(routeEdges.map(e=>[e.id,e.enabled]))}};}

function saveLight(){try{localStorage.setItem('wg-gameplay-b-warm-afternoon-v1-settings',JSON.stringify(settings()));}catch{}}
function buildOfflineHTML(){
 const doc=document.documentElement.cloneNode(true);
 doc.querySelector('#settings').textContent=JSON.stringify(settings()).replace(/</g,'\\u003c');
 doc.querySelector('#strips').replaceChildren();doc.querySelector('#history').replaceChildren();doc.querySelector('#sections').replaceChildren();doc.querySelector('#edges').replaceChildren();doc.querySelector('#cuts').replaceChildren();doc.querySelector('#routePath').replaceChildren();doc.querySelector('#sectionNow').textContent='I · Entrada';doc.querySelector('#routeNext').textContent='Listo';doc.querySelector('#jumpCount').textContent='0';doc.querySelector('#listenClock').textContent='00:00';doc.querySelector('#sectionProgress').style.width='0%';
 doc.querySelector('#status').textContent='Preparando audio incrustado…';doc.querySelector('#play').disabled=true;doc.querySelector('#play').textContent='Preparando…';
 doc.querySelector('#loadCount').textContent='0/10';doc.querySelector('#loadBar').style.width='0%';doc.querySelector('#loadPanel').classList.remove('done');
 doc.querySelector('#position').textContent='00:00';doc.querySelector('#seek').value='0';
 doc.querySelector('#wave').setAttribute('height','60');
 return '<!doctype html>\n'+doc.outerHTML;
}
async function qualityChanged(){
 stop();buffers.clear();errors.clear();if(ctx){await ctx.close();ctx=null;bus=master=analyser=null;}
 $('loadPanel').classList.remove('done');$('loadCount').textContent='0/10';$('loadBar').style.width='0%';refreshControls();await loadBank();saveLight();
}
function resetScenes(){custom={};chooseScene('full');autoOn=false;solos.clear();mutes.clear();refreshControls();saveLight();log('Mezcla completa y escenas de fábrica restauradas.');}
function restoreSaved(){
 const saved=embedded;
 if(saved.controls)for(const [id,val] of Object.entries(saved.controls)){const e=$(id);if(!e)continue;if(e.tagName==='SELECT'&&![...e.options].some(o=>o.value===String(val)))continue;e.value=val;}
 for(const id of ids)levels[id]=clamp(levels[id]);
 $('volumeLabel').textContent=$('volume').value+'%';
}
$('play').onclick=()=>play().catch(report);$('stop').onclick=stop;$('seek').onchange=e=>seek(e.target.value).catch(report);
$('seek').oninput=e=>{$('position').textContent=fmt(e.target.value);};
$('auto').onclick=toggleAuto;$('evolve').onclick=()=>{if(!running)info('Pulsa Reproducir para escuchar la evolución.');evolve();refreshControls();};
$('clearSolo').onclick=()=>{manualChanged();solos.clear();applyMasks();};
$('volume').oninput=e=>{const v=clamp(Number(e.target.value)/100);$('volumeLabel').textContent=Math.round(v*100)+'%';if(master)master.gain.setTargetAtTime(v,ctx.currentTime,.03);};
$('export').onclick=()=>download(new Blob([buildOfflineHTML()],{type:'text/html;charset=utf-8'}),'Wild_Guardians_Gameplay_B_Warm_Afternoon_AJUSTADO.html');
$('manifest').onclick=()=>{const meta={...BANK,tracks:BANK.tracks.map(({data,energy,wave,...x})=>x),settings:settings()};delete meta.wave;download(new Blob([JSON.stringify(meta,null,2)],{type:'application/json'}),'Wild_Guardians_Gameplay_B_Warm_Afternoon_Manifest.json');};
$('saveScene').onclick=()=>{custom[selected]=ids.map(id=>effective(id));log('Mezcla guardada en escena '+PRESETS[selected].name+'. Exporta una copia para conservarla en otro dispositivo.');saveLight();};
$('reset').onclick=resetScenes;
$('loadSaved').onclick=()=>{try{const obj=JSON.parse(localStorage.getItem('wg-gameplay-b-warm-afternoon-v1-settings'));if(!obj)throw Error('No hay ajustes guardados en este navegador.');custom=obj.customScenes||{};selected=PRESETS[obj.scene]?obj.scene:'full';levels=Object.fromEntries(ids.map(id=>[id,clamp(obj.levels?.[id]??1)]));solos.clear();mutes.clear();buildTransition(levels);renderValues();refreshControls();log('Ajustes locales recuperados.');}catch(e){info(e.message,true);}};
$('quality').onchange=()=>qualityChanged().catch(report);
$('repeat').onchange=()=>{if(running){const pos=position();seek(pos).catch(report);}saveLight();};
$('loopFade').onchange=()=>{if(running)seek(position()).catch(report);saveLight();};
for(const id of ['cadence','density','quantize','fade','bpm','gridOffset'])$(id).onchange=()=>{nextAuto=(ctx?.currentTime||0)+autoInterval();for(const o of $('cadence').options)o.textContent='Cada '+o.value+' compases · '+Math.round(bar()*Number(o.value))+' s';saveLight();};
document.addEventListener('click',e=>{
 const p=e.target.closest('[data-scene]');if(p)chooseScene(p.dataset.scene);
 const s=e.target.closest('[data-solo]');if(s)solo(s.dataset.solo).catch(report);
 const m=e.target.closest('[data-mute]');if(m)mute(m.dataset.mute);
 const d=e.target.closest('[data-download]');if(d){const t=byId.get(d.dataset.download);download(new Blob([bytes(t)],{type:'audio/mpeg'}),t.filename);}
 const event=e.target.closest('[data-event]');if(event)triggerEvent(event.dataset.event);
});
document.addEventListener('input',e=>{if(e.target.dataset.volume)gainChanged(e.target.dataset.volume,Number(e.target.value)/100);});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawWaves,100);});
window.addEventListener('unhandledrejection',e=>report(e.reason));
restoreSaved();navWire();renderStrips();refreshControls();drawWaves();
$('duration').textContent=fmt(duration);$('seek').max=duration;
loadBank().catch(report);animate();
window.WGSunoLab={bank:BANK,buffers,play,stop,pause:togglePause,seek,scene:chooseScene,solo,mute,evolve,event:triggerEvent,buildOfflineHTML,settings,position,
 queueSection,playSection,auditionEdge,replanRoute,sections:()=>structuredClone(sections),
 getState:()=>({navigation:{mode:$('navMode').value,current:currentSection?.id,next:routePlan?.target?.id,kind:routePlan?.kind,at:routePlan?.at,committed:routePlan?.committed,fade:routePlan?.fade,jumps:jumpCount,lastJumpAt,history:routeHistory.map(x=>({...x})),edges:routeEdges.map(x=>({...x}))},running,paused,ready:buffers.size,duration,position:position(),scene:selected,auto:autoOn,loopCount,scheduled:scheduled.map(s=>({...s})),event:returnEvent?{name:returnEvent.name,at:returnEvent.at}:null,solos:[...solos],muted:[...mutes],levels:{...levels},actual:actualLevels(),sampleRate:ctx?.sampleRate,contextTime:ctx?.currentTime,decks:decks.map(d=>({id:d.id,start:d.start,offset:d.offset,end:d.end,voices:[...d.voices].map(([id,v])=>({id,rate:v.source.playbackRate.value,loop:v.source.loop}))}))}),
 signal:()=>{if(!analyser)return null;const x=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(x);return {peak:Math.max(...x.map(Math.abs)),rms:Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length)}}
};
})();

