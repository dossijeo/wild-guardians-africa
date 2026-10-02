import '../ui/styles.css';
import {BALANCE as B} from '../simulation/balance.js';
import * as Game from '../simulation/game.js';
import {PROFILES,hiringCost} from '../simulation/workforce.js';
import {formatMoney,numberOf} from '../simulation/money.js';
import {isMature} from '../simulation/crops.js';
import {cropSpec,permission,operational,attraction} from '../simulation/rules.js';
import {SaveRepository} from '../persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../world/navigation.js';
import {findInitialLocationAsync,villageLayout,findVillageEntry} from '../world/villages.js';
import {WorldScene} from '../rendering/scene.js';
import {json} from '../rendering/assets.js';
import {AudioSystem} from '../audio/audio.js';
import {ASSETS,hudMarkup,layoutHud,hiringMarkup,NPC_TYPES,framePaint,spellSVG} from '../ui/native-hud.js';
import {NativeGuardian} from '../ui/guardian.js';
import {TutorialController} from '../tutorial/controller.js';
import {TutorialProfile} from '../tutorial/profile.js';
import '../ui/tutorial.css';

const app=document.querySelector('#app'),saves=new SaveRepository(localStorage);
let selector,thumbnails,state=null,nav=null,world=null,tool=null,selection=null,screen='menu',lastFrame=0,starting=false,lastUI=0,villageCatalog=null,pendingVillage=null;
const settings=(()=>{try{return {...{sfx:.7,music:.4,quality:'media'},...JSON.parse(localStorage.getItem('wild-guardians:settings')??'{}')};}catch{return {sfx:.7,music:.4,quality:'media'};}})();
const audio=new AudioSystem(settings);
let hudSize='',frameImages=null,guardian=null,tutorial=null,tutorialInert=null,tutorialFocus=null,pendingWall=null;
const tutorialProfile=new TutorialProfile(localStorage);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commandId=()=>crypto.randomUUID();
const button=(id,text,cls='')=>`<button id="${id}" class="${cls}">${text}</button>`;
function error(message){document.querySelector('.error-banner')?.remove();const el=document.createElement('div');el.className='error-banner';el.role='alert';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000);}
function safe(action){try{const result=action();if(result?.catch)result.catch(e=>error(e.message));}catch(e){error(e.message);}updateUI(true);}
function save(){if(!state)return;state.savedAt=Date.now();try{saves.save(state);}catch(e){error('No se pudo guardar la partida: '+e.message);}}
function bind(id,fn){document.getElementById(id)?.addEventListener('click',()=>safe(fn));}
function clearWorld(){setTutorialInteraction(false);pendingWall=null;tutorial=null;guardian?.dispose();guardian=null;world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}
function menu() {
  if(state){save();state=null;}clearWorld();screen='menu';
  app.innerHTML='<iframe id="native-menu" title="Santuario · Menú principal de Wild Guardians Africa" src="/menu/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==document.querySelector('#native-menu')?.contentWindow||event.data?.type!=='wild-guardians:menu')return;
  safe(()=>{
   const data=event.data,respond=detail=>event.source.postMessage({type:'wild-guardians:menu-data',...detail},location.origin);
   if(data.action==='request-saves')respond({slots:saves.list().map(slot=>({...slot,cultureName:selector.cultures.find(c=>c.id===slot.culture)?.name??slot.culture,biomeName:selector.biomes.find(b=>b.id===slot.biome)?.name??slot.biome,money:formatMoney(slot.money)}))});
   if(data.action==='load-slot')return startGame(saves.load(data.slotId));
   if(data.action==='start'&&Game.BIOMES.includes(data.biome)&&Game.CULTURES.includes(data.culture)){selectedBiome=data.biome;selectedCulture=data.culture;return startGame();}
   if(data.action==='request-settings')respond({settings});
   if(data.action==='settings-change'&&['muy_baja','baja','media','alta'].includes(data.settings?.quality)&&[data.settings.sfx,data.settings.music].every(value=>Number.isFinite(value)&&value>=0&&value<=1)){Object.assign(settings,data.settings);localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();}
  });
});
let selectedBiome='sabana',selectedCulture='mapungubwe';
function newGameScreen() {
  screen='new';app.innerHTML='<iframe id="native-selector" title="Nueva partida · Bioma y cultura" src="/selector/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==document.querySelector('#native-selector')?.contentWindow||event.data?.type!=='wild-guardians:selector')return;
 if(event.data.action==='back'){menu();return;}
 if(event.data.action==='start'&&Game.BIOMES.includes(event.data.biome)&&Game.CULTURES.includes(event.data.culture)){selectedBiome=event.data.biome;selectedCulture=event.data.culture;safe(()=>startGame());}
});
function loadScreen() {
  screen='load';const slots=saves.list();app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Tus poblados</div>${button('back','← Volver','ghost')}</header><h2>Retoma tu historia</h2><p class="muted">Cada partida conserva su propio mundo.</p><div class="slots">${slots.length?slots.map(s=>`<div class="slot"><div><h3>${esc(selector.cultures.find(c=>c.id===s.culture)?.name??s.culture)}</h3><p class="muted">Día ${s.day} · ${esc(selector.biomes.find(b=>b.id===s.biome)?.name??s.biome)} · ${formatMoney(s.money)} monedas</p></div><button data-slot="${s.slotId}">Continuar →</button></div>`).join(''):'<p class="muted">Todavía no hay partidas guardadas.</p>'}</div></main>`;bind('back',menu);
  document.querySelectorAll('[data-slot]').forEach(el=>el.onclick=()=>safe(()=>startGame(saves.load(el.dataset.slot))));
}
async function startGame(loaded=null) {
  if(starting)return;starting=true;screen='loading';clearWorld();
  app.innerHTML='<div class="loading"><div class="eyebrow">Wild Guardians / Africa</div><h2>La tierra despierta</h2><p>Preparando terreno, poblado y cultivos originales…</p></div>';
  try {
    const next=loaded??Game.newGame({biome:selectedBiome,culture:selectedCulture});
    const [pack,villages]=await Promise.all([json('/content/biome-'+BIOME_IDS[next.biome]+'.json'),json('/content/villages.json')]);
    villageCatalog=villages;
    const payload=villages.find(v=>v.id===(next.culture==='saheliana'?'saheliano':next.culture));nav=new Navigation(next.seed,next.biome,pack.profile);
    if(!loaded) {const start=await findInitialLocationAsync(nav,payload);Object.assign(next.villages[0],start);next.suppressed.push(...start.suppress);}
    // Earlier saves predate native collision footprints. Preserve their units
    // and positions while restoring the geometric metadata from the catalog.
    for(const village of next.villages){
      const source=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));
      const shapes=new Map(villageLayout(source,village.x,village.z).map(b=>[b.key,b.footprint]));
      for(const building of village.buildings??[])building.footprint??=shapes.get(building.key);
    }
    nav.setState(next);
    for(const village of next.villages)if(!village.entry)village.entry=findVillageEntry(nav,[],village.x,village.z);
    state=next;audio.remember(state.events);
    state.pauses=state.pauses.filter(reason=>!['menu','hidden','context-lost'].includes(reason));
    const nativeStyle=document.createElement('link');nativeStyle.id='native-hud-style';nativeStyle.rel='stylesheet';nativeStyle.href='/content/hud.css';document.head.append(nativeStyle);
    app.innerHTML=`<main class="game" id="stage"><canvas id="world" aria-label="Mundo de Wild Guardians Africa"></canvas>${hudMarkup}<nav id="toolbar" hidden></nav><aside id="panel"></aside><aside id="context"></aside><div id="narrator"></div><div class="notices" id="notices"></div><div id="events" hidden></div><div id="placementBanner" hidden></div><div id="modal"></div><small class="world-stats" id="stats"></small></main>`;
    document.querySelectorAll('[data-sprite]').forEach(img=>img.src=ASSETS[img.dataset.sprite].src);layoutHud(document.querySelector('#stage'));
    bind('menuButton',pauseDialog);
    document.querySelector('[data-menu="home"]').onclick=()=>world.focus(state.villages[0]);
    document.querySelector('[data-menu="grow"]').onclick=()=>safe(()=>toolPanel('plant'));
    document.querySelector('[data-menu="magic"]').onclick=()=>safe(()=>toolPanel('spell'));
    document.querySelector('[data-menu="build"]').onclick=()=>safe(buildPanel);
    world=new WorldScene(document.querySelector('#world'),onPick);world.onError=e=>error(e.message);world.onWallStroke=points=>safe(()=>wallPreview(points));world.qualitySetting(settings.quality);world.onContextLost=()=>{Game.pause(state,'context-lost');error('Se ha perdido el contexto gráfico. La partida está pausada.');};world.onContextRestored=()=>Game.resume(state,'context-lost');
    await world.load(state,nav,payload);tutorial=new TutorialController(state,tutorialProfile,{onError:e=>error('No se ha podido guardar la memoria del tutorial: '+e.message)});screen='game';bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});
    for(const village of state.villages.slice(1)){const data=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));await world.ensureVillage(village.culture,data);world.objects.delete(village.id);}
  } catch(e){state=null;clearWorld();menu();error(e.message);}finally{starting=false;}
}
function onPick({entityId,point}) {
  if(!state||screen!=='game'||pendingWall)return;
  safe(()=>{
    if(tool&&point) {
      if(tool.kind==='wall'&&entityId){selection=entityId;tool=null;return;}
      if(tool.kind==='village') {const payload=villageCatalog.find(v=>v.id===(tool.culture==='saheliana'?'saheliano':tool.culture));pendingVillage=Game.previewVillage(state,tool.culture,point.x,point.z,payload,nav);world.showVillagePreview(pendingVillage);villageConfirmPanel();return;}
      if(tool.kind==='center'||tool.kind==='wall')Game.placeStructure(state,commandId(),{...tool,x:point.x,z:point.z},nav);
      else if(tool.kind==='plant')Game.plant(state,commandId(),tool.species,Math.round(point.x/1.5)*1.5,Math.round(point.z/1.5)*1.5,nav);
      else if(tool.kind==='spell')Game.cast(state,commandId(),tool.spell,point.x,point.z,nav);
      if(tool.kind!=='plant'){save();tool=null;}world.syncChunks(true);
    } else selection=entityId;
  });
}
function cancelWallPreview(){pendingWall=null;world?.clearWallPreview();document.querySelector('#panel').innerHTML='';}
function wallPreview(points){
  if(tool?.kind!=='wall'||tool.gate)return;
  const plan=Game.previewWallChain(state,tool.material,points,nav);pendingWall={points:points.map(p=>p.slice()),material:tool.material,plan};world.showWallPreview(plan);wallConfirmPanel();
}
function wallConfirmPanel(){
  const {plan}=pendingWall;
  showHudPanel('Construir muralla',`<p class="panel-note">${plan.pieces.length} módulos · ${plan.cost} monedas${plan.gates?` · ${plan.gates} puerta${plan.gates===1?'':'s'} sin recargo`:''}</p><p class="panel-note">El trazado verde aún no está construido. Confirma para pagar y colocarlo.</p><div class="menu-list">${button('confirm-wall','Construir por '+plan.cost+' monedas','wood-button')}${button('cancel-wall','Cancelar trazado','wood-button')}</div>`);
  bind('cancel-wall',cancelWallPreview);
  bind('confirm-wall',()=>{
    const draft=pendingWall;if(!draft)return;
    const fresh=Game.previewWallChain(state,draft.material,draft.points,nav);
    if(fresh.cost!==draft.plan.cost){draft.plan=fresh;world.showWallPreview(fresh);wallConfirmPanel();return;}
    Game.buildWallChain(state,commandId(),draft.material,draft.points,nav);cancelWallPreview();world.syncChunks(true);save();
  });
}
function toolPanel(type) {
  pendingWall=null;world.clearWallPreview();
  let content='';
  const price=value=>`<span class="price"><img src="${ASSETS.coin.src}" alt="">${value}</span>`;
  if(type==='plant')content=`<div class="card-grid crop-grid">${B.crops.map(c=>`<button class="choice-card" data-crop="${c.id}" ${!permission(state,'plant')||numberOf(state.ledger.balance)<c.plant_cost?'disabled':''}><img class="card-image" src="${thumbnails[c.id]}" alt=""><strong>${c.name}</strong>${price(c.plant_cost)}</button>`).join('')}</div><p class="panel-note">Elige una semilla y toca un espacio libre.</p>`;
  if(type==='wall')content=`<div class="card-grid">${B.walls.map(w=>`<button class="choice-card" data-wall="${w.id}" ${!permission(state,'wall')||numberOf(state.ledger.balance)<w.cost?'disabled':''}><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>${w.name}</strong><span class="detail">${w.hp} PV</span>${price(w.cost)}</button>`).join('')}</div><label class="panel-note"><input id="gate" type="checkbox"> Colocar una puerta individual</label><p class="panel-note">Arrastra sobre el suelo para trazar una muralla. Revisa los módulos y su coste antes de construir. Un recinto cerrado incluye su puerta sin recargo.</p>`;
  if(type==='spell')content=`<div class="card-grid three">${B.spells.map((m,i)=>`<button class="choice-card spell-card" data-spell="${m.id}"><span class="spell-symbol ${['blue','green','purple'][i]}">${spellSVG(i)}<span class="spell-cooldown" style="--cd:${state.cooldowns[m.id]/m.cooldown_seconds*100}%"></span><span class="cooldown-number">${state.cooldowns[m.id]>0?Math.ceil(state.cooldowns[m.id]):''}</span></span><strong>${m.name}</strong><span class="detail">${m.duration_seconds} s · recarga ${m.cooldown_seconds} s</span></button>`).join('')}</div><p class="panel-note">Selecciona un poder y toca la zona donde quieres aplicarlo.</p>`;
  showHudPanel({plant:'Cultivar',wall:'Defensas',spell:'Magias del Espíritu'}[type],content);
  document.querySelectorAll('[data-crop]').forEach(el=>el.onclick=()=>{tool={kind:'plant',species:el.dataset.crop};document.querySelector('#panel').innerHTML='';updateUI(true);});
  document.querySelectorAll('[data-wall]').forEach(el=>el.onclick=()=>{tool={kind:'wall',material:el.dataset.wall,gate:document.querySelector('#gate').checked};document.querySelector('#panel').innerHTML='';updateUI(true);});
  document.querySelectorAll('[data-spell]').forEach(el=>el.onclick=()=>{tool={kind:'spell',spell:el.dataset.spell};document.querySelector('#panel').innerHTML='';updateUI(true);});
}
function showHudPanel(title,body){
 const host=document.querySelector('#panel');host.className='native-panel-host';host.innerHTML=`<section class="panel" role="dialog" aria-label="${esc(title)}"><canvas class="frame-canvas" aria-hidden="true"></canvas><header class="panel-head"><h2 class="panel-title">${esc(title)}</h2><button class="close-panel" id="close-hud-panel" aria-label="Cerrar">×</button></header><div class="panel-body">${body}</div></section>`;
 bind('close-hud-panel',()=>{host.innerHTML='';if(pendingWall)cancelWallPreview();});
 Promise.all(Object.entries(ASSETS).filter(([key])=>key.startsWith('frame_')).map(([key,value])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=value.src;}))).then(entries=>{frameImages=Object.fromEntries(entries);if(host.firstElementChild)framePaint(host,layoutHud(document.querySelector('#stage')),frameImages);}).catch(()=>error('No se ha podido cargar el marco del menú.'));
}
function updateUI(force=false) {
  if(screen!=='game'||!state)return;
  const now=performance.now();if(!force&&now-lastUI<200)return;lastUI=now;
  if(pendingWall&&(tool?.kind!=='wall'||tool.material!==pendingWall.material||tool.gate))cancelWallPreview();
  world.wallDrawing.setEnabled(tool?.kind==='wall'&&!tool.gate&&!pendingWall&&permission(state,'wall'));
  const confirmWall=document.querySelector('#confirm-wall');if(confirmWall)confirmWall.disabled=!permission(state,'wall')||!pendingWall||numberOf(state.ledger.balance)<pendingWall.plan.cost;
  const stage=document.querySelector('#stage'),size=`${stage.clientWidth}:${stage.clientHeight}`;
  if(size!==hudSize){hudSize=size;const dims=layoutHud(stage);if(frameImages&&document.querySelector('#hiring-dialog'))framePaint(document.querySelector('#modal'),dims,frameImages);}
  document.querySelector('#clockValue').textContent=Game.clockLabel(state);
  document.querySelector('#moneyValue').textContent=formatMoney(state.ledger.balance);
  document.querySelector('#dayValue').textContent=`Día ${state.day}`;
  document.querySelector('#days').title=`${state.completedNights}/100 noches superadas`;
  const toolbar=document.querySelector('#toolbar');
  if(!toolbar.children.length||force) {
    toolbar.innerHTML=`${button('center-action','⌂ Centro · 800')}${button('plant-action','✿ Cultivos')}${button('wall-action','▥ Defensas')}${button('spell-action','✧ Magias')}${button('hire-action','♙ Contratar')}${button('focus-action','◎ Poblado')}${state.postgame?button('village-action','⌂ Nuevo poblado'):''}`;
    bind('center-action',()=>{tool={kind:'center'};document.querySelector('#panel').innerHTML='';});bind('plant-action',()=>toolPanel('plant'));bind('wall-action',()=>toolPanel('wall'));bind('spell-action',()=>toolPanel('spell'));bind('hire-action',()=>Game.openInitialHiring(state));bind('focus-action',()=>world.focus(state.villages[0]));
    bind('village-action',villageCulturePanel);
  }
  document.querySelector('#center-action').disabled=!permission(state,'center');document.querySelector('#plant-action').disabled=!permission(state,'plant');document.querySelector('#wall-action').disabled=!permission(state,'wall');document.querySelector('#spell-action').disabled=!permission(state,'shield');document.querySelector('#hire-action').disabled=state.hiringPaidDay===state.day||!state.plants.some(p=>p.alive)||!state.structures.some(operational);
  contextPanel();narrator();
  document.querySelector('#notices').innerHTML=state.messages.slice(-3).map(m=>`<button data-notice="${m.id}">${esc(m.text)}</button>`).join('');
  document.querySelectorAll('[data-notice]').forEach(el=>el.onclick=()=>{const message=state.messages.find(m=>m.id===el.dataset.notice),target=[...state.plants,...state.structures,...state.workers,...(state.raid?.animals??[])].find(e=>e.id===message.target);if(target)world.focus(target);});
  if(state.pauses.includes('hiring')&&!document.querySelector('#hiring-dialog'))hiringDialog();
  if(state.result&&!state.tutorial.reading&&!document.querySelector('#result-dialog'))resultDialog();
  if(tool){const text=tool.kind==='center'?'Coloca el centro de trabajo':tool.kind==='plant'?`Plantar ${cropSpec(tool.species).name} · ${cropSpec(tool.species).plant_cost} monedas`:tool.kind==='wall'?`${tool.gate?'Coloca una puerta':'Arrastra para trazar una muralla'} de ${B.walls.find(w=>w.id===tool.material).name}`:`Colocar ${B.spells.find(s=>s.id===tool.spell).name}`;
    if(!document.querySelector('.hint')){const el=document.createElement('div');el.className='hint';document.querySelector('.game').append(el);}document.querySelector('.hint').textContent=text+' · Escape para cancelar';
  }else document.querySelector('.hint')?.remove();
}
function buildPanel(){
 showHudPanel('Construir',`<div class="card-grid two"><button class="choice-card" id="native-center"><img class="card-image" src="${ASSETS.home_icon.src}" alt=""><strong>Centro de trabajo</strong><span class="price">800 monedas</span></button><button class="choice-card" id="native-wall"><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>Murallas</strong></button></div><div class="menu-list">${button('native-hire','Contratar equipo','wood-button')}${state.postgame?button('native-village','Fundar poblado','wood-button'):''}</div>`);
 bind('native-center',()=>{tool={kind:'center'};document.querySelector('#panel').innerHTML='';});bind('native-wall',()=>toolPanel('wall'));bind('native-hire',()=>Game.openInitialHiring(state));bind('native-village',villageCulturePanel);bind('native-close',()=>document.querySelector('#panel').innerHTML='');
 document.querySelector('#native-center').disabled=!permission(state,'center');document.querySelector('#native-wall').disabled=!permission(state,'wall');document.querySelector('#native-hire').disabled=state.hiringPaidDay===state.day||!state.plants.some(p=>p.alive)||!state.structures.some(operational);
}
function villageCulturePanel() {
  document.querySelector('#panel').innerHTML=`<div class="action-panel"><h3>Un nuevo poblado</h3><p>Coste: ${formatMoney({n:String(50000+25000*(state.villages.length-1)),d:'1'})} monedas</p><div class="action-grid">${selector.cultures.map(c=>`<button data-village-culture="${c.id}">${c.name}</button>`).join('')}</div></div>`;
  document.querySelectorAll('[data-village-culture]').forEach(el=>el.onclick=()=>safe(async()=>{const culture=el.dataset.villageCulture,payload=villageCatalog.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));await world.ensureVillage(culture,payload);tool={kind:'village',culture};document.querySelector('#panel').innerHTML='';}));
}
function villageConfirmPanel() {
  const p=pendingVillage;document.querySelector('#panel').innerHTML=`<div class="action-panel"><h3>Fundar poblado</h3><p>${p.valid?'Ubicación válida':'Ubicación inválida: '+esc(p.reason)}</p><p>${formatMoney({n:String(p.cost),d:'1'})} monedas. Toca otra posición para recolocar.</p>${button('found-village','Confirmar poblado')}${button('cancel-village','Cancelar')}</div>`;document.querySelector('#found-village').disabled=!p.valid||!permission(state,'village');
  bind('found-village',()=>{const payload=villageCatalog.find(v=>v.id===(p.culture==='saheliana'?'saheliano':p.culture));Game.foundVillage(state,commandId(),p.culture,p.x,p.z,payload,nav);world.clearVillagePreview();pendingVillage=null;tool=null;document.querySelector('#panel').innerHTML='';save();world.syncChunks(true);});bind('cancel-village',()=>{world.clearVillagePreview();pendingVillage=null;tool=null;document.querySelector('#panel').innerHTML='';});
}
function contextPanel() {
  const el=document.querySelector('#context');const p=state.plants.find(p=>p.id===selection&&p.alive),structure=state.structures.find(s=>s.id===selection);
  if(p) {
    const spec=cropSpec(p.species),percent=Math.floor(p.growth/spec.growth_seconds*100);el.innerHTML=`<div class="context"><h3>${spec.name}</h3><p>${isMature(p)?'Maduro · listo para recoger':p.water[0].status==='due'?'Espera siembra y primer riego':p.water.some(w=>w.status==='due')?'Necesita riego':'Creciendo'} · ${percent}%</p><div class="progressbar"><div style="width:${percent}%"></div></div><p>Valor base de cosecha: ${spec.base_harvest_value} monedas.<br>${p.centerId?'Centro asociado durante esta jornada':'Sin centro asociado'}</p>${isMature(p)?button('harvest-action',p.harvestRequested?'Cosecha solicitada':'Recoger grupo'):''}${button('close-context','Cerrar','ghost')}</div>`;
    bind('harvest-action',()=>Game.harvest(state,commandId(),p.id));if(document.querySelector('#harvest-action'))document.querySelector('#harvest-action').disabled=p.harvestRequested||!permission(state,'harvest');
  } else if(structure) {
    el.innerHTML=`<div class="context"><h3>${structure.kind==='center'?'Centro de trabajo':structure.gate?'Puerta':'Defensa'}</h3><p>${structure.status==='ruined'?'Ruinas':`${structure.hp}/${structure.maxHp} PV`}</p>${structure.hp<structure.maxHp?button('repair-action','Solicitar reparación'):''}${structure.kind==='wall'?button('remove-wall',structure.status==='ruined'?'Retirar escombros':'Retirar defensa sin reembolso'):''}${button('close-context','Cerrar','ghost')}</div>`;bind('repair-action',()=>Game.requestRepair(state,commandId(),structure.id));
    bind('remove-wall',()=>{Game.removeWall(state,commandId(),structure.id,nav);selection=null;save();});if(document.querySelector('#remove-wall'))document.querySelector('#remove-wall').disabled=!permission(state,'wall');
  } else el.innerHTML='';bind('close-context',()=>{selection=null;});
}
function setTutorialInteraction(blocking){
  if(blocking&&!tutorialInert){
    tutorialFocus=document.activeElement;tutorialInert=new Map();
    for(const child of document.querySelector('#stage')?.children??[])if(child.id!=='narrator'){tutorialInert.set(child,child.inert);child.inert=true;}
  }else if(!blocking&&tutorialInert){
    for(const [child,inert] of tutorialInert)child.inert=inert;tutorialInert=null;
    if(tutorialFocus?.isConnected&&!tutorialFocus.closest('#narrator'))tutorialFocus.focus({preventScroll:true});tutorialFocus=null;
  }
}
function narrator() {
  const el=document.querySelector('#narrator');guardian??=new NativeGuardian(el,e=>error(e.message));
  tutorial?.update();const message=tutorial?.presentation();setTutorialInteraction(message?.blocking??false);
  if(!message){guardian.hide({immediate:state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p))});return;}
  const advance=message.blocking?()=>safe(()=>{tutorial.acknowledge();save();}):null;
  guardian.show({key:message.id+':'+(message.blocking?'reading':'action')+':'+(message.variant??''),text:message.text,gesture:message.gesture,blocking:message.blocking,result:message.result,advance,
    skip:message.canSkip?()=>safe(()=>{tutorial.skipBasic();save();}):null});
}
function hiringDialog() {
  const selection={...state.hiringSelection},modal=document.querySelector('#modal');
  modal.innerHTML=`<div class="overlay native-hiring" id="hiring-dialog">${hiringMarkup({day:state.day,hiring:{hasPrevious:state.day>1,draft:NPC_TYPES.map(p=>selection[p.id]??0)}})}</div>`;
  const stage=document.querySelector('#stage');stage.classList.add('hiring-open');
  const refresh=()=>{
    for(const [i,p] of NPC_TYPES.entries())selection[p.id]=Number(document.querySelector(`#crewCount${i}`).value);
    try {const cost=hiringCost(selection),available=numberOf(state.ledger.balance);document.querySelector('#hireAvailable').textContent=formatMoney(state.ledger.balance);document.querySelector('#hireCost').textContent=cost.toLocaleString('es-ES');document.querySelector('#hireBalance').textContent=(available-cost).toLocaleString('es-ES');document.querySelector('#hireConfirm').disabled=cost>available;document.querySelector('#hireBudgetMessage').textContent=cost>available?'Reduce la plantilla para ajustarla al saldo.':'El salario se cobra una sola vez al confirmar.';}
    catch(e){document.querySelector('#hireConfirm').disabled=true;document.querySelector('#hireBudgetMessage').textContent=e.message;}
  };
  document.querySelectorAll('[data-crew-step]').forEach(el=>el.onclick=()=>{const input=document.querySelector(`#crewCount${el.dataset.crewStep}`);input.value=Math.max(0,Number(input.value)+Number(el.dataset.delta));refresh();});document.querySelectorAll('[data-crew-count]').forEach(el=>el.oninput=refresh);
  document.querySelector('[data-hire="clear"]').onclick=()=>{document.querySelectorAll('[data-crew-count]').forEach(el=>el.value=0);refresh();};
  bind('hireConfirm',()=>{Game.hire(state,commandId(),selection);modal.innerHTML='';stage.classList.remove('hiring-open');save();audio.gameplay(state.day).catch(()=>{});});refresh();
  Promise.all(Object.entries(ASSETS).filter(([key])=>key.startsWith('frame_')).map(([key,value])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=value.src;}))).then(entries=>{frameImages=Object.fromEntries(entries);if(document.querySelector('#hiring-dialog'))framePaint(modal,layoutHud(stage),frameImages);}).catch(()=>error('No se ha podido cargar el marco de contratación.'));
}
window.addEventListener('resize',()=>{if(screen==='game')layoutHud(document.querySelector('#stage'));});
function pauseDialog() {
  Game.pause(state,'menu');document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>Un respiro</h2><p>El tiempo se detiene mientras escuchas al poblado.</p><div class="menu-actions">${button('resume','Volver a la finca')}${button('save','Guardar partida')}${button('game-settings','Ajustes')}${button('exit','Guardar y volver al menú')}</div></section></div>`;
  bind('resume',()=>{Game.resume(state,'menu');document.querySelector('#modal').innerHTML='';});bind('save',()=>{save();Game.notice(state,'Partida guardada.');});bind('game-settings',()=>settingsDialog(true));bind('exit',menu);
}
function settingsDialog(inGame=false) {
  const html=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>A tu ritmo</h2><label class="settings-row">Sonidos<input id="sfx-volume" type="range" min="0" max="1" step=".05" value="${settings.sfx}"></label><label class="settings-row">Música<input id="music-volume" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label class="settings-row">Calidad<select id="quality">${[['muy_baja','Muy baja'],['baja','Baja'],['media','Media'],['alta','Alta']].map(([id,label])=>`<option value="${id}" ${settings.quality===id?'selected':''}>${label}</option>`).join('')}</select></label><div class="dialog-actions">${button('close-settings','Volver')}</div></section></div>`;
  if(inGame)document.querySelector('#modal').innerHTML=html;else {const el=document.createElement('div');el.id='settings-overlay';el.innerHTML=html;app.append(el);}
  for(const id of ['sfx-volume','music-volume','quality'])document.getElementById(id).oninput=()=>{settings.sfx=Number(document.querySelector('#sfx-volume').value);settings.music=Number(document.querySelector('#music-volume').value);const previous=settings.quality;settings.quality=document.querySelector('#quality').value;localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();if(world&&previous!==settings.quality){world.qualitySetting(settings.quality);world.syncChunks(true);}};
  bind('close-settings',()=>inGame?pauseDialog():document.querySelector('#settings-overlay').remove());
}
function resultDialog() {
  const won=state.result==='victory';Game.pause(state,'result');document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" id="result-dialog" role="dialog" aria-modal="true"><div class="eyebrow">El Espíritu</div><h2>${won?'La maldición ha terminado':'El poblado necesita un nuevo comienzo'}</h2><p>${won?'Has sobrevivido a cien noches. La tierra queda libre: puedes seguir cultivando y fundar nuevos poblados en paz.':esc(state.messages.at(-1)?.text??'No quedan recursos suficientes para continuar.')}</p><div class="dialog-actions">${button('result-menu','Volver al menú')}${won?button('continue','Seguir en este mundo'):button('retry','Nueva partida')}</div></section></div>`;
  bind('result-menu',menu);bind('retry',()=>{save();state=null;clearWorld();newGameScreen();});bind('continue',()=>{Game.resume(state,'result');Game.continuePostgame(state);document.querySelector('#modal').innerHTML='';save();});
}
function libraryScreen() {
  clearWorld();screen='library';app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Biblioteca</div>${button('back','← Volver','ghost')}</header><h2>Los archivos del poblado</h2><p class="muted">Laboratorios originales aislados de tus partidas. Los recursos se cargan al abrir cada demostración.</p><div class="library-grid">${[['crops','Cultivos','Ocho especies, cinco etapas y transiciones locales.'],['walls','Bastión','Materiales, puertas reforzadas y estados de daño.'],['destruction','Destrucción','Daño normalizado y colapso de los edificios.'],['sfx','Sonidos','126 sonidos originales, con usos y reservas documentados.']].map(([id,title,description])=>`<article class="library-card"><h3>${title}</h3><p class="muted">${description}</p><button data-demo="${id}">Abrir demostración →</button></article>`).join('')}</div><p class="muted">Modelos originales Meshy · Audio original ElevenLabs y paquetes musicales suministrados · Ga Maamli y Banga bajo SIL OFL.</p></main>`;
  bind('back',menu);document.querySelectorAll('[data-demo]').forEach(el=>el.onclick=()=>{const iframe=document.createElement('iframe');iframe.src=`/library.html?lab=${el.dataset.demo}`;iframe.title='Laboratorio '+el.dataset.demo;iframe.style='position:fixed;inset:60px 0 0;width:100%;height:calc(100dvh - 60px);border:0;background:#eee';app.querySelector('.library-grid').replaceWith(iframe);});
}
document.addEventListener('visibilitychange',()=>{if(state){if(document.hidden){Game.pause(state,'hidden');audio.suspend();}else {Game.resume(state,'hidden');lastFrame=performance.now();audio.resume();}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state){if(tutorial?.presentation()?.blocking){tutorial.acknowledge();save();}else if(pendingWall){cancelWallPreview();}else if(tool){tool=null;document.querySelector('#panel').innerHTML='';}else if(state.pauses.includes('menu')){Game.resume(state,'menu');document.querySelector('#modal').innerHTML='';}else pauseDialog();updateUI(true);}});
document.addEventListener('pointerdown',()=>{audio.unlock().then(()=>screen==='menu'?audio.menu():state?audio.gameplay(state.day):null).catch(()=>{});},{once:true});
window.addEventListener('beforeunload',()=>{if(state)save();});
function frame(now) {
  requestAnimationFrame(frame);const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
  if(screen==='game'&&world&&state) {
    const eventIndex=state.events.at(-1)?.id;
    try {tutorial?.update();Game.advanceReal(state,dt,nav);tutorial?.update();world.render(dt);audio.process(state.events);updateUI();guardian?.update();}
    catch(e){Game.pause(state,'runtime-error');error(e.message);console.error(e);}
    const newEvents=state.events.filter(e=>e.id!==eventIndex&&['Dawn','RaidEnded','CampaignWon'].includes(e.type));
    if(newEvents.length&&newEvents.at(-1).id!==frame.lastSaveEvent){frame.lastSaveEvent=newEvents.at(-1).id;save();}
  }
}
async function boot() {try {[selector,thumbnails]=await Promise.all([json('/content/selector.json'),json('/content/crop-thumbnails.json')]);menu();requestAnimationFrame(frame);}catch(e){app.textContent='No se pudo iniciar Wild Guardians: '+e.message;}}
boot();
