import '../ui/styles.css';
import {BALANCE as B} from '../simulation/balance.js';
import * as Game from '../simulation/game.js';
import {PROFILES,hiringCost} from '../simulation/workforce.js';
import {formatMoney,numberOf} from '../simulation/money.js';
import {isMature} from '../simulation/crops.js';
import {cropSpec,permission,operational,attraction} from '../simulation/rules.js';
import {SaveRepository} from '../persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../world/navigation.js';
import {findInitialLocation} from '../world/villages.js';
import {WorldScene} from '../rendering/scene.js';
import {json} from '../rendering/assets.js';
import {AudioSystem} from '../audio/audio.js';
import {ASSETS,hudMarkup,layoutHud,hiringMarkup,NPC_TYPES,framePaint} from '../ui/native-hud.js';

const app=document.querySelector('#app'),saves=new SaveRepository(localStorage);
let selector,thumbnails,state=null,nav=null,world=null,tool=null,selection=null,screen='menu',lastFrame=0,starting=false,lastUI=0,villageCatalog=null,pendingVillage=null;
const settings=(()=>{try{return {...{sfx:.7,music:.4,quality:'media'},...JSON.parse(localStorage.getItem('wild-guardians:settings')??'{}')};}catch{return {sfx:.7,music:.4,quality:'media'};}})();
const audio=new AudioSystem(settings);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commandId=()=>crypto.randomUUID();
const button=(id,text,cls='')=>`<button id="${id}" class="${cls}">${text}</button>`;
function error(message){document.querySelector('.error-banner')?.remove();const el=document.createElement('div');el.className='error-banner';el.role='alert';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000);}
function safe(action){try{const result=action();if(result?.catch)result.catch(e=>error(e.message));}catch(e){error(e.message);}updateUI(true);}
function save(){if(!state)return;state.savedAt=Date.now();try{saves.save(state);}catch(e){error('No se pudo guardar la partida: '+e.message);}}
function bind(id,fn){document.getElementById(id)?.addEventListener('click',()=>safe(fn));}
function clearWorld(){world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;document.querySelector('#native-hud-style')?.remove();}
function menu() {
  if(state){save();state=null;}clearWorld();screen='menu';
  app.innerHTML='<iframe id="native-menu" title="Santuario · Menú principal de Wild Guardians Africa" src="/menu/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>';
}
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==document.querySelector('#native-menu')?.contentWindow||event.data?.type!=='wild-guardians:menu')return;
  safe(()=>({new:()=>newGameScreen(),load:loadScreen,library:libraryScreen,settings:()=>settingsDialog()})[event.data.action]?.());
});
let selectedBiome='sabana',selectedCulture='mapungubwe';
function newGameScreen(step='biome') {
  screen='new';const list=step==='biome'?selector.biomes:selector.cultures,selected=step==='biome'?selectedBiome:selectedCulture;
  app.innerHTML=`<main class="screen"><header class="topbar"><div class="brand">Wild Guardians / Africa</div>${button('back','← Volver','ghost')}</header><section class="selection-head"><div><div class="eyebrow">${step==='biome'?'01 / El mundo':'02 / Tu comunidad'}</div><h2>${step==='biome'?'Elige un bioma':'Elige una cultura'}</h2></div><p class="muted">${step==='biome'?'Seis paisajes. Una tierra por cuidar.':'Cinco arquitecturas. El mismo destino compartido.'}</p></section><section class="cards">${list.map(item=>`<button class="card ${item.id===selected?'selected':''}" data-choice="${item.id}" aria-pressed="${item.id===selected}"><img src="${item.src}" alt="${esc(item.alt)}"><div class="card-body"><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p></div></button>`).join('')}</section><footer class="selection-footer"><span class="muted">${esc(list.find(i=>i.id===selected)?.name??'')}</span>${button('next',step==='biome'?'Elegir cultura →':'Comenzar partida →')}</footer></main>`;
  document.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>{if(step==='biome')selectedBiome=el.dataset.choice;else selectedCulture=el.dataset.choice;newGameScreen(step);});
  bind('back',()=>step==='biome'?menu():newGameScreen('biome'));bind('next',()=>step==='biome'?newGameScreen('culture'):startGame());
}
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
    if(!loaded) {const start=findInitialLocation(nav,payload);Object.assign(next.villages[0],start);}
    nav.setState(next);state=next;
    state.pauses=state.pauses.filter(reason=>!['menu','hidden','context-lost'].includes(reason));
    const nativeStyle=document.createElement('link');nativeStyle.id='native-hud-style';nativeStyle.rel='stylesheet';nativeStyle.href='/content/hud.css';document.head.append(nativeStyle);
    app.innerHTML=`<main class="game" id="stage"><canvas id="world" aria-label="Mundo de Wild Guardians Africa"></canvas>${hudMarkup}<nav id="toolbar" hidden></nav><aside id="panel"></aside><aside id="context"></aside><div id="narrator"></div><div class="notices" id="notices"></div><div id="events" hidden></div><div id="placementBanner" hidden></div><div id="modal"></div><small class="world-stats" id="stats"></small></main>`;
    document.querySelectorAll('[data-sprite]').forEach(img=>img.src=ASSETS[img.dataset.sprite].src);layoutHud(document.querySelector('#stage'));
    bind('menuButton',pauseDialog);
    document.querySelector('[data-menu="home"]').onclick=()=>world.focus(state.villages[0]);
    document.querySelector('[data-menu="grow"]').onclick=()=>safe(()=>toolPanel('plant'));
    document.querySelector('[data-menu="magic"]').onclick=()=>safe(()=>toolPanel('spell'));
    document.querySelector('[data-menu="build"]').onclick=()=>safe(buildPanel);
    world=new WorldScene(document.querySelector('#world'),onPick);world.onError=e=>error(e.message);world.qualitySetting(settings.quality);world.onContextLost=()=>{Game.pause(state,'context-lost');error('Se ha perdido el contexto gráfico. La partida está pausada.');};world.onContextRestored=()=>Game.resume(state,'context-lost');
    await world.load(state,nav,payload);screen='game';bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});
    for(const village of state.villages.slice(1)){const data=villages.find(v=>v.id===(village.culture==='saheliana'?'saheliano':village.culture));await world.ensureVillage(village.culture,data);world.objects.delete(village.id);}
  } catch(e){state=null;clearWorld();menu();error(e.message);}finally{starting=false;}
}
function onPick({entityId,point}) {
  if(!state||screen!=='game')return;
  safe(()=>{
    if(tool&&point) {
      if(tool.kind==='village') {const payload=villageCatalog.find(v=>v.id===(tool.culture==='saheliana'?'saheliano':tool.culture));pendingVillage=Game.previewVillage(state,tool.culture,point.x,point.z,payload,nav);world.showVillagePreview(pendingVillage);villageConfirmPanel();return;}
      if(tool.kind==='center'||tool.kind==='wall')Game.placeStructure(state,commandId(),{...tool,x:point.x,z:point.z},nav);
      else if(tool.kind==='plant')Game.plant(state,commandId(),tool.species,Math.round(point.x/1.5)*1.5,Math.round(point.z/1.5)*1.5,nav);
      else if(tool.kind==='spell')Game.cast(state,commandId(),tool.spell,point.x,point.z,nav);
      if(tool.kind!=='plant'){save();tool=null;}world.syncChunks(true);
    } else selection=entityId;
  });
}
function toolPanel(type) {
  let content='';
  if(type==='plant')content=`<h3>Qué sembramos</h3><div class="action-grid">${B.crops.map(c=>`<button data-crop="${c.id}"><img src="${thumbnails[c.id]}" alt=""><strong>${c.name}</strong><small>${c.plant_cost} monedas · ${c.total_waters} riegos</small></button>`).join('')}</div>`;
  if(type==='wall')content=`<h3>Protege la finca</h3><div class="action-grid">${B.walls.map(w=>`<button data-wall="${w.id}"><strong>${w.name}</strong><small>${w.cost} monedas · ${w.hp} PV</small></button>`).join('')}</div><p>Coloca módulos de 2,18 m. Selecciona una puerta para dejar acceso a tus trabajadores.</p><label><input id="gate" type="checkbox"> Colocar puerta</label>`;
  if(type==='spell')content=`<h3>Magias del Espíritu</h3><div class="action-grid">${B.spells.map(m=>`<button data-spell="${m.id}"><strong>${m.name}</strong><small>${m.duration_seconds} s · recarga ${m.cooldown_seconds} s</small></button>`).join('')}</div>`;
  document.querySelector('#panel').innerHTML=content?`<div class="action-panel">${content}<p class="muted">Elige y toca una posición del mundo.</p>${button('cancel-tool','Cancelar')}</div>`:'';
  document.querySelectorAll('[data-crop]').forEach(el=>el.onclick=()=>{tool={kind:'plant',species:el.dataset.crop};document.querySelector('#panel').innerHTML='';updateUI(true);});
  document.querySelectorAll('[data-wall]').forEach(el=>el.onclick=()=>{tool={kind:'wall',material:el.dataset.wall,gate:document.querySelector('#gate').checked};updateUI(true);});
  document.querySelectorAll('[data-spell]').forEach(el=>el.onclick=()=>{tool={kind:'spell',spell:el.dataset.spell};updateUI(true);});bind('cancel-tool',()=>{tool=null;document.querySelector('#panel').innerHTML='';});
}
function updateUI(force=false) {
  if(screen!=='game'||!state)return;
  const now=performance.now();if(!force&&now-lastUI<200)return;lastUI=now;
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
  if(state.result&&!document.querySelector('#result-dialog'))resultDialog();
  if(tool){const text=tool.kind==='center'?'Coloca el centro de trabajo':tool.kind==='plant'?`Plantar ${cropSpec(tool.species).name} · ${cropSpec(tool.species).plant_cost} monedas`:tool.kind==='wall'?`Colocar ${tool.gate?'puerta':'módulo'} de ${B.walls.find(w=>w.id===tool.material).name}`:`Colocar ${B.spells.find(s=>s.id===tool.spell).name}`;
    if(!document.querySelector('.hint')){const el=document.createElement('div');el.className='hint';document.querySelector('.game').append(el);}document.querySelector('.hint').textContent=text+' · Escape para cancelar';
  }else document.querySelector('.hint')?.remove();
}
function buildPanel(){
 document.querySelector('#panel').innerHTML=`<div class="action-panel"><h3>Construir</h3>${button('native-center','Centro de trabajo · 800')}${button('native-wall','Defensas')}${button('native-hire','Contratar equipo')}${state.postgame?button('native-village','Fundar poblado'):''}${button('native-close','Cerrar')}</div>`;
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
    el.innerHTML=`<div class="context"><h3>${structure.kind==='center'?'Centro de trabajo':structure.gate?'Puerta':'Defensa'}</h3><p>${structure.status==='ruined'?'Ruinas':`${structure.hp}/${structure.maxHp} PV`}</p>${structure.hp<structure.maxHp?button('repair-action','Solicitar reparación'):''}${button('close-context','Cerrar','ghost')}</div>`;bind('repair-action',()=>Game.requestRepair(state,commandId(),structure.id));
  } else el.innerHTML='';bind('close-context',()=>{selection=null;});
}
const tutorialText={intro:'Soy el Espíritu que cuida esta tierra. La maldición despierta al caer el sol. Construye un centro, siembra y deja que tu comunidad trabaje contigo.',center:'Coloca tu primer centro de trabajo. Cuesta 800 monedas. Busca un terreno libre junto al poblado.',plant:'Siembra los cultivos que puedas cuidar. Cada planta tiene un coste, un tiempo y sus propios riegos.',hire:'Cuando estés listo, contrata al equipo de hoy. La jornada se paga una sola vez; elige cantidades según tu presupuesto.',observe:'Los trabajadores siembran y riegan. El brote empezará a crecer cuando completen su primer cuidado.',harvest:'Toca una planta madura y solicita recoger su grupo. Ganarás las monedas cuando cada caja llegue al centro.',done:'Tu primera cosecha ha llegado. Sigue cultivando y conserva monedas para la próxima jornada.'};
function narrator() {
  const el=document.querySelector('#narrator');if(state.tutorial.step==='done'){el.innerHTML='';return;}
  const step=state.tutorial.step;el.innerHTML=`<section class="narrator"><img class="spirit" src="/assets/5170de5cc32e7da971a861db79d090b4bdc2c6cece5b22e4b1c06fe3de59e464.webp" alt="El Espíritu"><div><small>El Espíritu</small><p>${esc(tutorialText[step]??'Cuida la tierra y escucha al poblado.')}</p></div>${step==='intro'?button('intro-next','Comenzar'):''}</section>`;
  bind('intro-next',()=>{Game.resume(state,'intro');state.tutorial.step=state.structures.length?'plant':'center';});
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
  Promise.all(Object.entries(ASSETS).filter(([key])=>key.startsWith('frame_')).map(([key,value])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([key,image]);image.onerror=reject;image.src=value.src;}))).then(entries=>{if(document.querySelector('#hiring-dialog'))framePaint(modal,layoutHud(stage),Object.fromEntries(entries));}).catch(()=>error('No se ha podido cargar el marco de contratación.'));
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state){if(tool){tool=null;document.querySelector('#panel').innerHTML='';}else if(state.pauses.includes('menu')){Game.resume(state,'menu');document.querySelector('#modal').innerHTML='';}else pauseDialog();updateUI(true);}});
document.addEventListener('pointerdown',()=>{audio.unlock().then(()=>screen==='menu'?audio.menu():state?audio.gameplay(state.day):null).catch(()=>{});},{once:true});
window.addEventListener('beforeunload',()=>{if(state)save();});
function frame(now) {
  requestAnimationFrame(frame);const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
  if(screen==='game'&&world&&state) {
    const eventIndex=state.events.at(-1)?.id;
    try {Game.advanceReal(state,dt,nav);world.render(dt);audio.process(state.events);updateUI();}
    catch(e){Game.pause(state,'runtime-error');error(e.message);console.error(e);}
    const newEvents=state.events.filter(e=>e.id!==eventIndex&&['Dawn','RaidEnded','CampaignWon'].includes(e.type));
    if(newEvents.length&&newEvents.at(-1).id!==frame.lastSaveEvent){frame.lastSaveEvent=newEvents.at(-1).id;save();}
  }
}
async function boot() {try {[selector,thumbnails]=await Promise.all([json('/content/selector.json'),json('/content/crop-thumbnails.json')]);menu();requestAnimationFrame(frame);}catch(e){app.textContent='No se pudo iniciar Wild Guardians: '+e.message;}}
boot();
