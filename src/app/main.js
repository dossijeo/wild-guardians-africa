import {NoticeLifetime,tutorialCoversNotice} from './notices.js';
const noticeLifetime=new NoticeLifetime();
import {syncTutorialActionPause} from '../tutorial/action-pause.js';
import {TutorialHudHand,tutorialHudHandTarget} from '../ui/tutorial-hud-hand.js';
import {GameScreenWakeLock} from '../ui/screen-wake-lock.js';
import {spellCardsMarkup,refreshSpellCards} from '../ui/spell-cards.js';
import {castPickedSpell} from './spell-placement.js';
import {UiAudio} from '../audio/ui-audio.js';
import {ToolSession} from '../ui/tool-session.js';
import {RESERVE_MESSAGE,HIRING_RESERVE,BUDGET_WARNING_THRESHOLD} from '../simulation/budget.js';
import {GameSurfaces} from '../ui/game-surfaces.js';
import {resumeLoadedWorld} from './resume-loaded-world.js';
import '../ui/styles.css';
import {autosaveEventAfter} from './autosave-events.js';
import {saveGame} from './save-game.js';
import {agriculturalDawnMessage} from '../ui/agricultural-notice.js';
import {WORLD_RESOLUTIONS,worldResolution,applyWorldResolution} from './world-resolution.js';
import {renderCommandFeedback} from '../ui/command-feedback.js';
import {BALANCE as B} from '../simulation/balance.js';
import * as Game from '../simulation/game.js';
import {PROFILES,hiringCost} from '../simulation/workforce.js';
import {formatMoney,numberOf} from '../simulation/money.js';
import {isMature} from '../simulation/crops.js';
import {cropSpec,permission,operational,attraction} from '../simulation/rules.js';
import {BrowserSaveRepository} from '../persistence/browser-saves.js';
import {Navigation,BIOME_IDS} from '../world/navigation.js';
import {findInitialLocationAsync,villageLayout,findVillageEntry} from '../world/villages.js';
import {WorldScene} from '../rendering/scene.js';
import {json} from '../rendering/assets.js';
import {assetUrl} from '../rendering/asset-url.js';
import {AudioSystem} from '../audio/audio.js';
import {ASSETS,hudMarkup,layoutHud,hiringMarkup,NPC_TYPES,framePaint,spellSVG} from '../ui/native-hud.js';
import {NativeGuardian} from '../ui/guardian.js';
import {hudShortcut} from '../ui/hud-shortcuts.js';
import {refreshBuildPermissions} from '../ui/build-permissions.js';
import {TutorialController} from '../tutorial/controller.js';
import {TutorialProfile} from '../tutorial/profile.js';
import '../ui/tutorial.css';

const app=document.querySelector('#app'),saves=new BrowserSaveRepository(localStorage);
for(const item of Object.values(ASSETS))item.src=assetUrl(item.src);
const screenWakeLock=new GameScreenWakeLock();screenWakeLock.setActive(true);
let selector,thumbnails,state=null,nav=null,world=null,tool=null,selection=null,screen='menu',lastFrame=0,starting=false,raidLoading=null,lastUI=0,villageCatalog=null,pendingVillage=null;
const fontStyles=document.createElement('link');fontStyles.rel='stylesheet';fontStyles.href=assetUrl('/content/fonts.css');document.head.append(fontStyles);
const settings=(()=>{try{return {...{sfx:.7,music:.4,quality:'media'},...JSON.parse(localStorage.getItem('wild-guardians:settings')??'{}')};}catch{return {sfx:.7,music:.4,quality:'media'};}})();
settings.resolution=worldResolution(settings.resolution);
const audio=new AudioSystem(settings);const uiAudio=new UiAudio((id,options)=>audio.sound(id,options));
let commandFeedback='',hudSize='',frameImages=null,guardian=null,hudHand=null,tutorial=null,tutorialInert=null,tutorialFocus=null;
const surfaces=new GameSurfaces(),toolSession=new ToolSession();
let budgetWarningUntil=0,lastBudgetBalance=Infinity,reserveWarningShown=false;
const tutorialProfile=new TutorialProfile(localStorage);
const moneyLocale=()=>window.WildGuardiansLanguage?.locale()??'en-US';
const localMoney=value=>formatMoney(value,moneyLocale());
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commandId=()=>crypto.randomUUID();
const button=(id,text,cls='primary')=>`<button id="${id}" class="${cls}">${text}</button>`;
function error(message,{silent=false}={}){if(String(message)===RESERVE_MESSAGE){if(reserveWarningShown)return;reserveWarningShown=true;budgetWarningUntil=performance.now()+18000;}if(!silent)uiAudio.error();if(state&&screen==='game'){commandFeedback=String(message);refreshCommandFeedback();return;}document.querySelector('.error-banner')?.remove();const el=document.createElement('div');el.className='error-banner';el.role='alert';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000);}
function safe(action){if(leaving)return;commandFeedback='';try{const result=action();if(result?.catch)result.catch(e=>error(e.message));}catch(e){error(e.message);}updateUI(true);}
function save({confirm=false}={}){return saveGame(state,saves,{confirm,onError:error});}
function bind(id,fn){document.getElementById(id)?.addEventListener('click',()=>safe(fn));}
function clearWorld(){raidLoading?.remove();raidLoading=null;noticeLifetime.reset();surfaces.reset();uiAudio.reset();toolSession.clear();budgetWarningUntil=0;lastBudgetBalance=Infinity;reserveWarningShown=false;pendingVillage=null;commandFeedback='';setTutorialInteraction(false);tutorial=null;hudHand?.dispose();hudHand=null;guardian?.dispose();guardian=null;world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}
let leaving=false;
async function menu() {
  if(leaving)return;leaving=true;
  try {
  if(state){if(!await save())return;state=null;}clearWorld();screen='menu';
  app.innerHTML=`<iframe id="native-menu" title="Santuario · Menú principal de Wild Guardians Africa" src="${assetUrl('/menu/index.html')}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`;
  }finally{leaving=false;}
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==document.querySelector('#native-menu')?.contentWindow||event.data?.type!=='wild-guardians:menu')return;
  safe(async()=>{
   const data=event.data,respond=detail=>event.source.postMessage({type:'wild-guardians:menu-data',...detail},location.origin);
   if(data.action==='request-saves')respond({slots:(await saves.list()).map(slot=>({...slot,cultureName:selector.cultures.find(c=>c.id===slot.culture)?.name??slot.culture,biomeName:selector.biomes.find(b=>b.id===slot.biome)?.name??slot.biome,money:localMoney(slot.money)}))});
   if(data.action==='delete-slot'){await saves.delete(data.slotId);respond({slots:(await saves.list()).map(slot=>({...slot,cultureName:selector.cultures.find(c=>c.id===slot.culture)?.name??slot.culture,biomeName:selector.biomes.find(b=>b.id===slot.biome)?.name??slot.biome,money:localMoney(slot.money)}))});return;}
   if(data.action==='load-slot')return startGame(await saves.load(data.slotId));
   if(data.action==='start'&&Game.BIOMES.includes(data.biome)&&Game.CULTURES.includes(data.culture)){selectedBiome=data.biome;selectedCulture=data.culture;return startGame();}
   if(data.action==='request-settings')respond({settings});
   if(data.action==='settings-change'&&['muy_baja','baja','media','alta'].includes(data.settings?.quality)&&[data.settings.sfx,data.settings.music].every(value=>Number.isFinite(value)&&value>=0&&value<=1)){Object.assign(settings,data.settings);settings.resolution=worldResolution(settings.resolution);localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();}
  });
});
let selectedBiome='sabana',selectedCulture='mapungubwe';
function newGameScreen() {
  screen='new';app.innerHTML=`<iframe id="native-selector" title="Nueva partida · Bioma y cultura" src="${assetUrl('/selector/index.html')}" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>`;
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==document.querySelector('#native-selector')?.contentWindow||event.data?.type!=='wild-guardians:selector')return;
 if(event.data.action==='back'){menu();return;}
 if(event.data.action==='start'&&Game.BIOMES.includes(event.data.biome)&&Game.CULTURES.includes(event.data.culture)){selectedBiome=event.data.biome;selectedCulture=event.data.culture;safe(()=>startGame());}
});
async function loadScreen() {
  screen='load';const slots=await saves.list();if(screen!=='load')return;app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Tus poblados</div>${button('back','← Volver','ghost')}</header><h2>Retoma tu historia</h2><p class="muted">Cada partida conserva su propio mundo.</p><div class="slots">${slots.length?slots.map(s=>`<div class="slot"><div><h3>${esc(selector.cultures.find(c=>c.id===s.culture)?.name??s.culture)}</h3><p class="muted">Día ${s.day} · ${esc(selector.biomes.find(b=>b.id===s.biome)?.name??s.biome)} · ${localMoney(s.money)} monedas</p></div><button data-slot="${s.slotId}">Continuar →</button><button class="ghost" data-delete-slot="${s.slotId}">Eliminar partida</button></div>`).join(''):'<p class="muted">Todavía no hay partidas guardadas.</p>'}</div></main>`;bind('back',menu);
  document.querySelectorAll('[data-slot]').forEach(el=>el.onclick=()=>safe(async()=>startGame(await saves.load(el.dataset.slot))));
  document.querySelectorAll('[data-delete-slot]').forEach(el=>el.onclick=()=>safe(async()=>{await saves.delete(el.dataset.deleteSlot);await loadScreen();}));
}
async function startGame(loaded=null) {
  if(starting)return;starting=true;screen='loading';clearWorld();screenWakeLock.setActive(true);
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
    resumeLoadedWorld(state,{hidden:document.hidden});
    if(document.hidden)audio.suspend();
    const nativeStyle=document.createElement('link');nativeStyle.id='native-hud-style';nativeStyle.rel='stylesheet';nativeStyle.href=assetUrl('/content/hud.css');document.head.append(nativeStyle);
    app.innerHTML=`<main class="game world-loading" id="stage" aria-busy="true"><div id="world-loading" class="loading" role="status"><div class="eyebrow">Wild Guardians / Africa</div><h2>La tierra despierta</h2><p>Preparando terreno, poblado y cultivos originales…</p><p id="loading-progress"></p></div><canvas id="world" aria-label="Mundo de Wild Guardians Africa"></canvas>${hudMarkup}<nav id="toolbar" hidden></nav><aside id="panel"></aside><aside id="context"></aside><div id="narrator"></div><div class="notices" id="notices"></div><div id="events" hidden></div><div id="placementBanner" hidden></div><div id="modal"></div><small class="world-stats" id="stats"></small></main>`;
    document.querySelectorAll('[data-sprite]').forEach(img=>img.src=ASSETS[img.dataset.sprite].src);layoutHud(document.querySelector('#stage'));
    bind('menuButton',pauseDialog);
    document.querySelector('[data-menu="home"]').onclick=()=>world.focusFarm();
    document.querySelector('[data-menu="grow"]').onclick=()=>safe(()=>toolPanel('plant'));
    document.querySelector('[data-menu="magic"]').onclick=()=>safe(()=>toolPanel('spell'));
    document.querySelector('[data-menu="build"]').onclick=()=>safe(buildPanel);
    world=new WorldScene(document.querySelector('#world'),onPick);world.onError=e=>error(e.message);world.onChunkProgress=progress=>{if(starting){const stats=document.querySelector('#loading-progress');if(stats)stats.textContent='Preparando el paisaje · '+Math.floor(progress.loaded/Math.max(1,progress.desired)*100)+' %';}};world.onWallStroke=points=>safe(()=>buildWallStroke(points));world.qualitySetting(settings.quality);applyWorldResolution(world,settings.resolution);world.onContextLost=()=>{Game.pause(state,'context-lost');error('Se ha perdido el contexto gráfico. La partida está pausada.');};world.onContextRestored=()=>Game.resume(state,'context-lost');
    await world.load(state,nav,payload);
    for(const village of state.villages.slice(1)){const data=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));await world.ensureVillage(village.culture,data);world.objects.delete(village.id);}
    world.render(0);document.querySelector('#world-loading').remove();document.querySelector('#stage').classList.remove('world-loading');document.querySelector('#stage').setAttribute('aria-busy','false');tutorial=new TutorialController(state,tutorialProfile,{onError:e=>error('No se ha podido guardar la memoria del tutorial: '+e.message)});screen='game';screenWakeLock.setActive(true);bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});
  } catch(e){state=null;clearWorld();menu();error(e.message);}finally{starting=false;const stats=document.querySelector('#stats');if(stats)stats.textContent='';}
}
function onPick({entityId,point}) {
  if(!state||screen!=='game')return;
  safe(()=>{
    if(state.pauses.includes('hiring')){if(surfaces.active!=='hiring')hiringDialog();return;}
    const pickedPlant=state.plants.find(p=>p.id===entityId&&p.alive);
    if(tool?.kind==='spell'){
      if(castPickedSpell(state,commandId(),tool.spell,{entityId,point},nav))save();return;
    }
    if(pickedPlant&&tool?.kind!=='spell'){cancelTool();closeSurface();selection=null;return;}
    const pickedCenter=state.structures.find(s=>s.id===entityId&&s.kind==='center'&&operational(s));
    if(pickedCenter&&!state.raid&&state.time<300&&state.hiringPaidDay===state.day){cancelTool();hiringDialog(pickedCenter.id);return;}
    if(tool&&point) {
      if(tool.kind==='wall'&&entityId){selection=entityId;tool=null;return;}
      if(tool.kind==='village') {const payload=villageCatalog.find(v=>v.id===(tool.culture==='saheliana'?'saheliano':tool.culture));pendingVillage=Game.previewVillage(state,tool.culture,point.x,point.z,payload,nav);world.showVillagePreview(pendingVillage);villageConfirmPanel();return;}
      if(tool.kind==='center'||tool.kind==='wall'){if(Game.placeStructure(state,commandId(),{...tool,x:point.x,z:point.z},nav)===false)return;}
      else if(tool.kind==='plant')Game.plant(state,commandId(),tool.species,Math.round(point.x/1.5)*1.5,Math.round(point.z/1.5)*1.5,nav);

      toolSession.used(performance.now()/1000);save();world.syncResidentProps();
    } else {closeSurface();selection=entityId;}
  });
}
function hideHudPanel(){document.querySelector('#panel').replaceChildren();if(surfaces.active==='panel'){surfaces.close();uiAudio.close();}}
function buildWallStroke(points){
  if(state.pauses.includes('hiring')||tool?.kind!=='wall'||tool.gate)return;
  const maxPieces=Game.wallCapacity(state,tool.material);if(!maxPieces){uiAudio.error({force:true});error(RESERVE_MESSAGE,{silent:true});return;}
  if(Game.buildWallChain(state,commandId(),tool.material,points,nav,{maxPieces})===false){uiAudio.error({force:true});return;}
  toolSession.used(performance.now()/1000);world.clearWallPreview();world.syncResidentProps();save();
}
function toolPanel(type) {
  if(state.pauses.includes('hiring'))return;
  cancelTool();
  world.clearWallPreview();
  let content='';
  const price=value=>`<span class="price"><img src="${ASSETS.coin.src}" alt="">${value}</span>`;
  if(type==='plant')content=`<div class="card-grid crop-grid">${B.crops.slice().sort((a,b)=>a.plant_cost-b.plant_cost).map(c=>`<button class="choice-card" data-crop="${c.id}" ${!permission(state,'plant')||numberOf(state.ledger.balance)<c.plant_cost?'disabled':''}><img class="card-image" src="${thumbnails[c.id]}" alt=""><strong>${c.name}</strong>${price(c.plant_cost)}</button>`).join('')}</div><p class="panel-note">Elige una semilla y toca un espacio libre.</p>`;
  if(type==='wall')content=`<div class="card-grid">${B.walls.map(w=>`<button class="choice-card" data-wall="${w.id}" ${!permission(state,'wall')||numberOf(state.ledger.balance)<w.cost+HIRING_RESERVE?'disabled':''}><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>${w.name}</strong><span class="detail">${w.hp} PV</span>${price(w.cost)}</button>`).join('')}</div><label class="panel-note"><input id="gate" type="checkbox"> Colocar una puerta individual</label><p class="panel-note">Arrastra sobre el suelo para trazar una muralla. Se construye al soltar, reservando 30 monedas para contratar. Un recinto cerrado incluye su puerta sin recargo.</p>`;
  if(type==='spell')content=spellCardsMarkup(state,spellSVG);
  showHudPanel({plant:'Cultivar',wall:'Defensas',spell:'Magias del Espíritu'}[type],content);
  document.querySelectorAll('[data-crop]').forEach(el=>el.onclick=()=>{armTool({kind:'plant',species:el.dataset.crop});hideHudPanel();updateUI(true);});
  document.querySelectorAll('[data-wall]').forEach(el=>el.onclick=()=>{armTool({kind:'wall',material:el.dataset.wall,gate:document.querySelector('#gate').checked});hideHudPanel();updateUI(true);});
  document.querySelectorAll('[data-spell]').forEach(el=>el.onclick=()=>{if(el.disabled)return;armTool({kind:'spell',spell:el.dataset.spell});hideHudPanel();updateUI(true);});
}
function showHudPanel(title,body){
 if(!openSurface('panel',title))return false;
 const host=document.querySelector('#panel');host.className='native-panel-host';host.innerHTML=`<section class="panel" role="dialog" aria-label="${esc(title)}"><canvas class="frame-canvas" aria-hidden="true"></canvas><header class="panel-head"><h2 class="panel-title">${esc(title)}</h2><button class="close-panel" id="close-hud-panel" aria-label="Cerrar">×</button></header><div class="panel-body">${body}</div></section>`;
 bind('close-hud-panel',()=>{closeSurface();});
 Promise.all(Object.entries(ASSETS).filter(([key])=>key.startsWith('frame_')).map(([key,value])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=value.src;}))).then(entries=>{frameImages=Object.fromEntries(entries);if(host.firstElementChild)framePaint(host,layoutHud(document.querySelector('#stage')),frameImages);}).catch(()=>error('No se ha podido cargar el marco del menú.'));
}
function openSurface(kind,key=kind){
  if(state.pauses.includes('hiring')&&!['hiring','result'].includes(kind))return false;
  if(!surfaces.open(kind,{mandatory:kind==='hiring',force:kind==='result'}))return false;
  const beforePause=state.pauses.slice();
  setTutorialInteraction(false);guardian?.hide({immediate:true});
  if(kind!=='context'){selection=null;document.querySelector('#context').replaceChildren();}
  if(kind!=='panel')document.querySelector('#panel').replaceChildren();
  if(kind!=='modal'&&kind!=='hiring'&&kind!=='result')document.querySelector('#modal').replaceChildren();
  document.querySelector('#stage').classList.remove('hiring-open');
  if(kind!=='modal')Game.resume(state,'menu');
  uiAudio.surface(kind,key);uiAudio.pause(beforePause,state.pauses);return true;
}
function closeSurface(){
  if(surfaces.mandatory&&state.pauses.includes('hiring'))return;
  const beforePause=state.pauses.slice(),kind=surfaces.close({resolved:!state.pauses.includes('hiring')});uiAudio.close();
  document.querySelector('#panel').replaceChildren();document.querySelector('#context').replaceChildren();document.querySelector('#modal').replaceChildren();
  document.querySelector('#stage').classList.remove('hiring-open');selection=null;
  if(kind==='modal')Game.resume(state,'menu');uiAudio.pause(beforePause,state.pauses);
  if(pendingVillage)cancelVillagePreview();
}
function armTool(value){tool=toolSession.select(value,performance.now()/1000);world?.focusTutorialPlacement(value.kind);}
function cancelTool(){if(pendingVillage)cancelVillagePreview();tool=null;toolSession.clear();commandFeedback='';}
function updateUI(force=false) {
  if(screen!=='game'||!state)return;
  const now=performance.now();if(!force&&now-lastUI<200)return;lastUI=now;
  if(tool&&['plant','center','wall'].includes(tool.kind)&&toolSession.expired(now/1000,tool.kind==='wall'&&world.wallDrawing.active))cancelTool();
  if(state.day===1&&state.initialPreparation&&!tool&&!surfaces.active&&state.plants.some(p=>p.alive)&&state.structures.some(operational))Game.openInitialHiring(state);
  const balance=numberOf(state.ledger.balance);if(balance>lastBudgetBalance&&balance>BUDGET_WARNING_THRESHOLD)reserveWarningShown=false;if(balance<=BUDGET_WARNING_THRESHOLD&&lastBudgetBalance>BUDGET_WARNING_THRESHOLD&&!reserveWarningShown){reserveWarningShown=true;budgetWarningUntil=now+18000;}lastBudgetBalance=balance;
  world.wallDrawing.setEnabled(tool?.kind==='wall'&&!tool.gate&&permission(state,'wall'));
  refreshBuildPermissions(document,state);refreshSpellCards(document,state);
  const stage=document.querySelector('#stage'),size=`${stage.clientWidth}:${stage.clientHeight}`;
  if(size!==hudSize){hudSize=size;const dims=layoutHud(stage);if(frameImages&&document.querySelector('#hiring-dialog'))framePaint(document.querySelector('#modal'),dims,frameImages);}
  document.querySelector('#clockValue').textContent=Game.clockLabel(state);
  document.querySelector('#moneyValue').textContent=localMoney(state.ledger.balance);
  document.querySelector('#dayValue').textContent=`Día ${state.day}`;
  document.querySelector('#days').title=`${state.completedNights}/100 noches superadas`;
  const toolbar=document.querySelector('#toolbar');
  if(!toolbar.children.length||force) {
    toolbar.innerHTML=`${button('center-action','⌂ Centro · 800')}${button('plant-action','✿ Cultivos')}${button('wall-action','▥ Defensas')}${button('spell-action','✧ Magias')}${button('focus-action','◎ Centro de trabajo')}${state.postgame?button('village-action','⌂ Nuevo poblado'):''}`;
    bind('center-action',()=>{armTool({kind:'center'});hideHudPanel();});bind('plant-action',()=>toolPanel('plant'));bind('wall-action',()=>toolPanel('wall'));bind('spell-action',()=>toolPanel('spell'));bind('focus-action',()=>world.focusFarm());
    bind('village-action',villageCulturePanel);
  }
  document.querySelector('#center-action').disabled=!permission(state,'center');document.querySelector('#plant-action').disabled=!permission(state,'plant');document.querySelector('#wall-action').disabled=!permission(state,'wall');document.querySelector('#spell-action').disabled=!permission(state,'shield');
  if(surfaces.active==='panel'&&!document.querySelector('#panel').children.length)surfaces.active=null;
  contextPanel();const activeTutorial=narrator();
  if(commandFeedback&&tutorialCoversNotice(state,{text:commandFeedback},activeTutorial))commandFeedback='';
  document.querySelector('#notices').innerHTML=noticeLifetime.visible(state,now/1000,activeTutorial,{tutorialVisible:guardian.lifecycle.phase!=='closed'}).map(m=>`<div class="notice-card"><button data-notice="${m.id}">${esc(m.text)}</button><button data-dismiss-notice="${m.id}" aria-label="Cerrar">×</button></div>`).join('');
  document.querySelectorAll('[data-dismiss-notice]').forEach(el=>el.onclick=()=>{noticeLifetime.dismiss(el.dataset.dismissNotice);updateUI(true);});
  document.querySelectorAll('[data-notice]').forEach(el=>el.onclick=()=>{const message=state.messages.find(m=>m.id===el.dataset.notice),target=[...state.plants,...state.structures,...state.workers,...(state.raid?.animals??[])].find(e=>e.id===message.target);if(target)world.focus(target);});
  if(!state.pauses.includes('hiring'))surfaces.deferred.delete('hiring');
  if(state.pauses.includes('hiring')&&surfaces.shouldOpen('hiring',{mandatory:true}))hiringDialog();
  if(state.result&&!state.tutorial.reading&&surfaces.shouldOpen('result'))resultDialog();
  const pending=state.pauses.includes('hiring')?'hiring':state.result?'result':null;
  let reopen=document.querySelector('#reopen-dialog');
  if(pending&&surfaces.deferred.has(pending)&&!surfaces.active){
    if(!reopen){reopen=document.createElement(pending==='hiring'?'span':'button');reopen.id='reopen-dialog';stage.append(reopen);}
    reopen.textContent=pending==='hiring'?'Toca el terreno para continuar la contratación.':'Resultado · Abrir';
    reopen.onclick=pending==='hiring'?null:()=>safe(resultDialog);
  }else reopen?.remove();
  refreshCommandFeedback();
}
function refreshCommandFeedback(){
  const label=null;
  renderCommandFeedback(document,{label,message:commandFeedback,onCancel:()=>{if(tool?.kind==='village')cancelVillagePreview();tool=null;commandFeedback='';updateUI(true);},onDismiss:()=>{commandFeedback='';updateUI(true);}});
}

function buildPanel(){
  if(state.pauses.includes('hiring'))return;
 cancelTool();
 showHudPanel('Construir',`<div class="card-grid two"><button class="choice-card" id="native-center"><img class="card-image" src="${ASSETS.home_icon.src}" alt=""><strong>Centro de trabajo</strong><span class="price">800 monedas</span></button><button class="choice-card" id="native-wall"><img class="card-image" src="${ASSETS.event8.src}" alt=""><strong>Murallas</strong></button></div><div class="menu-list">${state.postgame?button('native-village','Fundar poblado','wood-button'):''}</div>`);
 bind('native-center',()=>{armTool({kind:'center'});hideHudPanel();});bind('native-wall',()=>toolPanel('wall'));bind('native-village',villageCulturePanel);bind('native-close',()=>document.querySelector('#panel').innerHTML='');
 document.querySelector('#native-center').disabled=!permission(state,'center');document.querySelector('#native-wall').disabled=!permission(state,'wall');
}
function cancelVillagePreview(){world?.clearVillagePreview();pendingVillage=null;if(tool?.kind==='village')tool=null;hideHudPanel();}
function villageCulturePanel() {
  if(state.pauses.includes('hiring'))return;
  showHudPanel('Un nuevo poblado',`<div><p>Coste: ${localMoney({n:String(50000+25000*(state.villages.length-1)),d:'1'})} monedas</p><div class="action-grid">${selector.cultures.map(c=>`<button data-village-culture="${c.id}">${c.name}</button>`).join('')}</div></div>`);
  document.querySelectorAll('[data-village-culture]').forEach(el=>el.onclick=()=>safe(async()=>{const culture=el.dataset.villageCulture,payload=villageCatalog.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));await world.ensureVillage(culture,payload);armTool({kind:'village',culture});if(pendingVillage){pendingVillage=Game.previewVillage(state,culture,pendingVillage.x,pendingVillage.z,payload,nav);world.showVillagePreview(pendingVillage);villageConfirmPanel();}else hideHudPanel();}));
}
function villageConfirmPanel() {
  if(state.pauses.includes('hiring'))return;
  const p=pendingVillage;showHudPanel('Fundar poblado',`<div><p>${p.valid?'Ubicación válida':'Ubicación inválida: '+esc(p.reason)}</p><p>${localMoney({n:String(p.cost),d:'1'})} monedas. Toca otra posición para recolocar.</p>${button('found-village','Confirmar poblado')}${button('change-village-culture','Cambiar cultura')}${button('cancel-village','Cancelar')}</div>`);document.querySelector('#found-village').disabled=!p.valid||!permission(state,'village');
  bind('change-village-culture',villageCulturePanel);bind('found-village',()=>{const payload=villageCatalog.find(v=>v.id===(p.culture==='saheliana'?'saheliano':p.culture));Game.foundVillage(state,commandId(),p.culture,p.x,p.z,payload,nav);world.clearVillagePreview();pendingVillage=null;tool=null;hideHudPanel();save();world.syncResidentProps();});bind('cancel-village',cancelVillagePreview);
}
function contextPanel() {
  const el=document.querySelector('#context');if(!state.structures.some(s=>s.id===selection)){selection=null;el.replaceChildren();if(surfaces.active==='context'){surfaces.active=null;uiAudio.close({silent:true});}return;}if(surfaces.active!=='context')openSurface('context');const scroll=el.querySelector('.context')?.scrollTop??0;const p=state.plants.find(p=>p.id===selection&&p.alive),structure=state.structures.find(s=>s.id===selection);
  const key=JSON.stringify(p?[p.id,Math.floor(p.growth/cropSpec(p.species).growth_seconds*100),p.water.map(w=>w.status),p.harvestRequested,p.centerId,permission(state,'harvest')]:structure?[structure.id,structure.hp,structure.status,permission(state,'wall')]:null);if(el.dataset.key===key&&el.children.length)return;el.dataset.key=key;
  if(p) {selection=null;el.replaceChildren();return;  } else if(structure) {
    el.innerHTML=`<div class="context"><h3>${structure.kind==='center'?'Centro de trabajo':structure.gate?'Puerta':'Defensa'}</h3><p>${structure.status==='ruined'?'Ruinas':`${structure.hp}/${structure.maxHp} PV`}</p>${structure.hp<structure.maxHp?button('repair-action','Solicitar reparación'):''}${structure.kind==='wall'?button('remove-wall',structure.status==='ruined'?'Retirar escombros':'Eliminar muralla · +'+localMoney(Game.wallRefund(structure))+' monedas'):''}${button('close-context','Cerrar','ghost')}</div>`;bind('repair-action',()=>Game.requestRepair(state,commandId(),structure.id));
    bind('remove-wall',()=>{Game.removeWall(state,commandId(),structure.id,nav);selection=null;save();});if(document.querySelector('#remove-wall'))document.querySelector('#remove-wall').disabled=!permission(state,'wall');
  } else el.innerHTML='';if(el.querySelector('.context'))el.querySelector('.context').scrollTop=scroll;bind('close-context',closeSurface);
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
function refreshTutorialGuidance(){
  const warning=performance.now()<budgetWarningUntil,message=tutorial?.presentation();
  const guideAllowed=!surfaces.active&&!warning&&!state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p));
  hudHand??=new TutorialHudHand(document.querySelector('#stage'));hudHand.show(guideAllowed?tutorialHudHandTarget(state,message,tool?.kind):null);
  const guidedStep=message?.id==='basic.'+state.tutorial.step||state.tutorial.guideAfterAuto?.includes('basic.'+state.tutorial.step);
  world.tutorialToolKind=tool?.kind??null;world.tutorialHandsEnabled=guideAllowed&&guidedStep;
  syncTutorialActionPause(state,{hudTarget:!hudHand.image.hidden,worldTarget:guideAllowed?world.tutorialGuideTarget():null,selectionOpen:surfaces.active==='panel'&&guidedStep});
}
function narrator() {
  const el=document.querySelector('#narrator');guardian??=new NativeGuardian(el,e=>error(e.message),phase=>audio.guardianPhase(phase));
  tutorial?.update();const warning=performance.now()<budgetWarningUntil;const message=surfaces.active?null:warning?{id:'budget.reserve',gesture:'warning',text:RESERVE_MESSAGE,blocking:false}:tutorial?.presentation();setTutorialInteraction(false);
  refreshTutorialGuidance();
  if(!message){guardian.hide({immediate:state.pauses.some(p=>['menu','hiring','hidden','context-lost'].includes(p))});return null;}
  const advance=message.reading?()=>safe(()=>{tutorial.acknowledge();save();}):null;
  guardian.show({key:message.id+':'+(message.reading?'reading':'action')+':'+(message.variant??''),text:message.text,gesture:message.gesture,blocking:message.blocking,result:message.result,advance,dismiss:()=>safe(()=>{if(warning)budgetWarningUntil=0;else tutorial.dismiss();save();}),
    skip:message.canSkip?()=>safe(()=>{tutorial.skipBasic();save();}):null});
  return message;
}
function hiringDialog(centerId=null) {
  const additional=centerId!==null;
  if(!openSurface(additional?'modal':'hiring',additional?'additional-hiring':undefined))return;
  if(additional)Game.pause(state,'menu');
  const selection=additional?{}:{...state.hiringSelection},modal=document.querySelector('#modal');
  modal.innerHTML=`<div class="overlay native-hiring" id="hiring-dialog">${hiringMarkup({day:state.day,clock:Game.clockLabel(state),hiring:{hasPrevious:state.day>1,draft:NPC_TYPES.map(p=>selection[p.id]??0)}})}</div>`;
  const agricultural=agriculturalDawnMessage(state);
  if(agricultural&&!additional){const announcement=document.createElement('p');announcement.className='hiring-intro';announcement.id='hiringAgriculturalNotice';announcement.role='status';announcement.textContent=agricultural;document.querySelector('#hiringIntro').before(announcement);}
  const stage=document.querySelector('#stage');stage.classList.add('hiring-open');
  if(additional){
    document.querySelector('#hiringTitle').textContent='Ampliar el equipo';
    document.querySelector('.panel-subtitle').textContent='Jornada en curso';
    document.querySelector('#hiringIntro').textContent='Contrata más personas para este centro. Pagas solo la parte de su jornada que queda, redondeada hacia arriba.';
    const close=document.createElement('button');close.id='close-additional-hiring';close.textContent='Cerrar';document.querySelector('.hiring-footer').append(close);close.onclick=closeSurface;
    const center=state.structures.find(s=>s.id===centerId);if(center.hp<center.maxHp){const repair=document.createElement('button');repair.textContent='Solicitar reparación';document.querySelector('.hiring-footer').append(repair);repair.onclick=()=>safe(()=>{closeSurface();Game.requestRepair(state,commandId(),centerId);save();});}
    for(const [i,p] of NPC_TYPES.entries()){
      const card=document.querySelector(`[data-crew-card="${i}"]`),shift=card.querySelector('.hire-shift span');shift.textContent=Game.clockLabel(state)+'–'+shift.textContent.split('–')[1];
      if(state.time>=PROFILES.find(profile=>profile.id===p.id).end){const input=document.querySelector(`#crewCount${i}`);input.disabled=true;document.querySelectorAll(`[data-crew-step="${i}"]`).forEach(button=>button.disabled=true);}
    }
  }
  const refresh=()=>{
    for(const [i,p] of NPC_TYPES.entries())selection[p.id]=Number(document.querySelector(`#crewCount${i}`).value);
    if(!additional)state.hiringSelection={...selection};
    try {const cost=hiringCost(selection,additional?{time:state.time}:{}),available=numberOf(state.ledger.balance);document.querySelector('#hireAvailable').textContent=localMoney(state.ledger.balance);document.querySelector('#hireCost').textContent=cost.toLocaleString(window.WildGuardiansLanguage?.locale()??'en-US');document.querySelector('#hireBalance').textContent=(available-cost).toLocaleString(window.WildGuardiansLanguage?.locale()??'en-US');document.querySelector('#hireConfirm').disabled=cost>available;document.querySelector('#hireBudgetMessage').textContent=cost>available?'Reduce la plantilla para ajustarla al saldo.':'El salario se cobra una sola vez al confirmar.';}
    catch(e){document.querySelector('#hireConfirm').disabled=true;document.querySelector('#hireBudgetMessage').textContent=e.message;}
  };
  document.querySelectorAll('[data-crew-step]').forEach(el=>el.onclick=()=>{const input=document.querySelector(`#crewCount${el.dataset.crewStep}`);input.value=Math.max(0,Number(input.value)+Number(el.dataset.delta));refresh();});document.querySelectorAll('[data-crew-count]').forEach(el=>el.oninput=refresh);
  document.querySelector('[data-hire="clear"]').onclick=()=>{document.querySelectorAll('[data-crew-count]').forEach(el=>el.value=0);refresh();};
  bind('hireConfirm',()=>{if(additional)Game.hireAdditional(state,commandId(),selection,centerId);else Game.hire(state,commandId(),selection);closeSurface();save();audio.gameplay(state.day).catch(()=>{});});refresh();
  Promise.all(Object.entries(ASSETS).filter(([key])=>key.startsWith('frame_')).map(([key,value])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=value.src;}))).then(entries=>{frameImages=Object.fromEntries(entries);if(document.querySelector('#hiring-dialog'))framePaint(modal,layoutHud(stage),frameImages);}).catch(()=>error('No se ha podido cargar el marco de contratación.'));
}
window.addEventListener('resize',()=>{if(screen==='game')layoutHud(document.querySelector('#stage'));});
function pauseDialog() {
  if(!openSurface('modal','pause'))return;
  const beforePause=state.pauses.slice();Game.pause(state,'menu');uiAudio.pause(beforePause,state.pauses);document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>Un respiro</h2><p>El tiempo se detiene mientras escuchas al poblado.</p><div class="menu-actions">${button('resume','Volver a la finca')}${button('save','Guardar partida')}${button('game-settings','Ajustes')}${button('exit','Guardar y volver al menú')}</div></section></div>`;
  bind('resume',closeSurface);bind('save',()=>save({confirm:true}));bind('game-settings',()=>settingsDialog(true));bind('exit',menu);
}
function settingsDialog(inGame=false) {
  const html=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true"><h2>A tu ritmo</h2><label class="settings-row">Idioma<select data-language-select id="game-language"><option value="en">English</option><option value="es">Español</option></select></label><label class="settings-row">Sonidos<input id="sfx-volume" type="range" min="0" max="1" step=".05" value="${settings.sfx}"></label><label class="settings-row">Música<input id="music-volume" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label class="settings-row">Calidad<select id="quality">${[['muy_baja','Muy baja'],['baja','Baja'],['media','Media'],['alta','Alta']].map(([id,label])=>`<option value="${id}" ${settings.quality===id?'selected':''}>${label}</option>`).join('')}</select></label><label class="settings-row">Resolución del mundo<select id="world-resolution">${WORLD_RESOLUTIONS.map(([id,label])=>`<option value="${id}" ${settings.resolution===id?'selected':''}>${label}</option>`).join('')}</select></label><p>Reduce la nitidez del mundo 3D; el HUD conserva su resolución.</p><div class="dialog-actions">${button('close-settings','Volver')}</div></section></div>`;
  if(inGame){if(!openSurface('modal','settings'))return;document.querySelector('#modal').innerHTML=html;}else {const el=document.createElement('div');el.id='settings-overlay';el.innerHTML=html;app.append(el);}
  document.querySelector('#game-language').value=window.WildGuardiansLanguage.getLanguage();
  for(const id of ['sfx-volume','music-volume','quality','world-resolution'])document.getElementById(id).oninput=()=>{settings.sfx=Number(document.querySelector('#sfx-volume').value);settings.music=Number(document.querySelector('#music-volume').value);const previous=settings.quality;settings.quality=document.querySelector('#quality').value;settings.resolution=worldResolution(document.querySelector('#world-resolution').value);if(world)applyWorldResolution(world,settings.resolution);localStorage.setItem('wild-guardians:settings',JSON.stringify(settings));audio.volume();if(world&&previous!==settings.quality){world.qualitySetting(settings.quality);world.syncChunks();}};
  bind('close-settings',()=>inGame?pauseDialog():document.querySelector('#settings-overlay').remove());
}
function resultDialog() {
  openSurface('result');
  const won=state.result==='victory';Game.pause(state,'result');document.querySelector('#modal').innerHTML=`<div class="overlay"><section class="dialog" id="result-dialog" role="dialog" aria-modal="true"><div class="eyebrow">El Espíritu</div><h2>${won?'La maldición ha terminado':'El poblado necesita un nuevo comienzo'}</h2><p>${won?'Has sobrevivido a cien noches. La tierra queda libre: puedes seguir cultivando y fundar nuevos poblados en paz.':esc(state.messages.at(-1)?.text??'No quedan recursos suficientes para continuar.')}</p><div class="dialog-actions">${button('close-result','Cerrar','ghost')}${button('result-menu','Volver al menú')}${won?button('continue','Seguir en este mundo'):button('retry','Nueva partida')}</div></section></div>`;
  bind('close-result',closeSurface);bind('result-menu',menu);bind('retry',async()=>{if(!await save())return;state=null;clearWorld();newGameScreen();});bind('continue',()=>{Game.resume(state,'result');Game.continuePostgame(state);closeSurface();save();});
}
function libraryScreen() {
  clearWorld();screen='library';app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Biblioteca</div>${button('back','← Volver','ghost')}</header><h2>Los archivos del poblado</h2><p class="muted">Laboratorios originales aislados de tus partidas. Los recursos se cargan al abrir cada demostración.</p><div class="library-grid">${[['crops','Cultivos','Ocho especies, cinco etapas y transiciones locales.'],['walls','Bastión','Materiales, puertas reforzadas y estados de daño.'],['destruction','Destrucción','Daño normalizado y colapso de los edificios.'],['sfx','Sonidos','126 sonidos originales, con usos y reservas documentados.']].map(([id,title,description])=>`<article class="library-card"><h3>${title}</h3><p class="muted">${description}</p><button data-demo="${id}">Abrir demostración →</button></article>`).join('')}</div><p class="muted">Modelos originales Meshy · Audio original ElevenLabs y paquetes musicales suministrados · Ga Maamli y Banga bajo SIL OFL.</p></main>`;
  bind('back',menu);document.querySelectorAll('[data-demo]').forEach(el=>el.onclick=()=>{const iframe=document.createElement('iframe');iframe.src=assetUrl(`/library.html?lab=${el.dataset.demo}`);iframe.title='Laboratorio '+el.dataset.demo;iframe.style='position:fixed;inset:60px 0 0;width:100%;height:calc(100dvh - 60px);border:0;background:#eee';app.querySelector('.library-grid').replaceWith(iframe);});
}
document.addEventListener('visibilitychange',()=>{if(state){if(document.hidden){Game.pause(state,'hidden');audio.suspend();}else {Game.resume(state,'hidden');lastFrame=performance.now();audio.resume();}}});
document.addEventListener('keydown',e=>hudShortcut(e,document,{enabled:screen==='game'&&!!state&&!starting&&!tutorial?.presentation()?.blocking&&!document.querySelector('#modal')?.children.length}));
document.addEventListener('keydown',e=>{if(leaving)return;if(e.key==='Escape'&&state&&screen==='game'&&!starting){if(tutorial?.presentation()?.blocking){tutorial.acknowledge();save();}else if(surfaces.active){closeSurface();}else if(tool){tool=null;commandFeedback='';hideHudPanel();}else if(state.pauses.includes('menu')){Game.resume(state,'menu');document.querySelector('#modal').innerHTML='';}else pauseDialog();updateUI(true);}});
document.addEventListener('pointerdown',()=>{audio.unlock().then(()=>screen==='menu'?audio.menu():state?audio.gameplay(state.day):null).catch(()=>{});});
window.addEventListener('wild-guardians:language-change',()=>{if(state){if(guardian)guardian.key=null;updateUI(true);}const draft=document.querySelector('#hireConfirm');if(draft){document.querySelector('#crewCount0').dispatchEvent(new Event('input'));for(const [i,profile] of NPC_TYPES.entries()){const pace=document.querySelector(`[data-crew-card="${i}"] .hire-stats b`);if(pace)pace.textContent='×'+profile.speed.toLocaleString(moneyLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});}}});
window.addEventListener('beforeunload',()=>{screenWakeLock.dispose();if(state)save();});
function updateRaidLoading(){
  if(world.actorsReady()){raidLoading?.remove();raidLoading=null;return;}
  if(raidLoading)return;
  raidLoading=document.createElement('div');raidLoading.id='raid-loading';raidLoading.setAttribute('role','status');raidLoading.textContent='Cargando…';
  raidLoading.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:25;background:#17261eee;color:white;padding:16px;border-radius:12px;pointer-events:none';
  document.querySelector('#stage').append(raidLoading);
}
function frame(now) {
  requestAnimationFrame(frame);const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
  if(screen==='game'&&world&&state&&!state.pauses.includes('runtime-error')) {
    const eventIndex=state.events.at(-1)?.id;
    try {tutorial?.update();if(tutorial?.advance(dt,{visible:!surfaces.active&&!document.hidden&&!state.pauses.includes('menu')&&now>=budgetWarningUntil}))save();refreshTutorialGuidance();if(world.actorsReady())Game.advanceReal(state,dt,nav);tutorial?.update();world.render(dt);updateRaidLoading();audio.process(state.events,{state,listener:world.controls.target});audio.updateMusic(state);audio.updateUnlocks(state);audio.updateAmbient(state,{listener:world.controls.target,waterRevision:nav.version,waterAt:(x,z)=>({...nav.field.waterInfo(x,z),active:!!(nav.field.wetland||nav.field.riverActive)})});audio.updateWorkers(state,{listener:world.controls.target});audio.updateWork(state,{listener:world.controls.target});audio.updateFarm(state,{listener:world.controls.target});audio.updateAnimals(state,{listener:world.controls.target});audio.updateMovement(state,{listener:world.controls.target,surfaceAt:world.movementSurfaceAt});updateUI();guardian?.update();}
    catch(e){Game.pause(state,'runtime-error');error(e.message);console.error(e);}
    if(autosaveEventAfter(state.events,eventIndex))save();
  }
}
async function boot() {try {await window.WildGuardiansLanguageReady;[selector,thumbnails]=await Promise.all([json('/content/selector.json'),json('/content/crop-thumbnails.json')]);menu();requestAnimationFrame(frame);}catch(e){app.textContent='No se pudo iniciar Wild Guardians: '+e.message;}}
boot();
