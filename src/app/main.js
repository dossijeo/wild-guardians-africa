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

const app=document.querySelector('#app'),saves=new SaveRepository(localStorage);
let selector,thumbnails,state=null,nav=null,world=null,tool=null,selection=null,screen='menu',lastFrame=0,starting=false,lastUI=0;
const settings=(()=>{try{return {...{sfx:.7,music:.4,quality:'media'},...JSON.parse(localStorage.getItem('wild-guardians:settings')??'{}')};}catch{return {sfx:.7,music:.4,quality:'media'};}})();
const audio=new AudioSystem(settings);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const commandId=()=>crypto.randomUUID();
const button=(id,text,cls='')=>`<button id="${id}" class="${cls}">${text}</button>`;
function error(message){document.querySelector('.error-banner')?.remove();const el=document.createElement('div');el.className='error-banner';el.role='alert';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),6000);}
function safe(action){try{const result=action();if(result?.catch)result.catch(e=>error(e.message));}catch(e){error(e.message);}updateUI(true);}
function save(){if(!state)return;state.savedAt=Date.now();try{saves.save(state);}catch(e){error('No se pudo guardar la partida: '+e.message);}}
function bind(id,fn){document.getElementById(id)?.addEventListener('click',()=>safe(fn));}
function clearWorld(){world?.dispose();world=null;nav=null;audio.stop();tool=null;selection=null;}
function menu() {
  if(state){save();state=null;}clearWorld();screen='menu';
  app.innerHTML=`<main class="screen menu" style="background-image:url('${selector.biomes[0].src}')"><div class="brand">Wild Guardians <span class="muted">/ Africa</span></div><section class="menu-content"><div class="eyebrow">Cultivar · Proteger · Sobrevivir</div><h1>Un poblado.<br>Cien noches.<br>Tu legado.</h1><p>La tierra guarda una promesa. Cultiva bajo el sol, protege a tu comunidad y escucha al Espíritu cuando cae la noche.</p><div class="menu-actions">${button('new','Nueva partida')}${button('load','Continuar','secondary')}${button('library','Biblioteca','ghost')}${button('settings','Ajustes','ghost')}</div></section><footer class="menu-footer"><span>LA SABANA TE ESPERA</span><span>Diseño de Gabriel · Plan Maestro 2.0</span></footer></main>`;
  bind('new',()=>newGameScreen());bind('load',loadScreen);bind('library',libraryScreen);bind('settings',()=>settingsDialog());
}
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
    const payload=villages.find(v=>v.id===(next.culture==='saheliana'?'saheliano':next.culture));nav=new Navigation(next.seed,next.biome,pack.profile);
    if(!loaded) {const start=findInitialLocation(nav,payload);Object.assign(next.villages[0],start);}
    nav.setState(next);state=next;
    state.pauses=state.pauses.filter(reason=>!['menu','hidden','context-lost'].includes(reason));
    app.innerHTML=`<main class="game"><canvas id="world" aria-label="Mundo de Wild Guardians Africa"></canvas><header class="hud"><div class="hud-pill" id="clock"></div><div class="hud-pill" id="money"></div><div class="hud-pill" id="survival"></div>${button('pause','☰ Menú','hud-menu secondary')}</header><nav class="toolbar" id="toolbar"></nav><aside id="panel"></aside><aside id="context"></aside><div id="narrator"></div><div class="notices" id="notices"></div><div id="modal"></div><small class="world-stats" id="stats"></small></main>`;
    world=new WorldScene(document.querySelector('#world'),onPick);world.onError=e=>error(e.message);world.qualitySetting(settings.quality);world.onContextLost=()=>{Game.pause(state,'context-lost');error('Se ha perdido el contexto gráfico. La partida está pausada.');};world.onContextRestored=()=>Game.resume(state,'context-lost');
    await world.load(state,nav,payload);screen='game';bind('pause',pauseDialog);lastFrame=performance.now();updateUI(true);save();audio.gameplay(state.day).catch(()=>{});
  } catch(e){state=null;clearWorld();menu();error(e.message);}finally{starting=false;}
}
function onPick({entityId,point}) {
  if(!state||screen!=='game')return;
  safe(()=>{
    if(tool&&point) {
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
  document.querySelector('#clock').innerHTML=`${state.time>=300?'☾':'☀'} <strong>${Game.clockLabel(state)}</strong> ${state.time>=300&&!state.raid?'×5':'×1'}`;
  document.querySelector('#money').innerHTML=`◈ <strong>${formatMoney(state.ledger.balance)}</strong>`;
  document.querySelector('#survival').innerHTML=`Día <strong>${state.day}</strong> · ${state.completedNights}/100 noches`;
  const toolbar=document.querySelector('#toolbar');
  if(!toolbar.children.length||force) {
    toolbar.innerHTML=`${button('center-action','⌂ Centro · 800')}${button('plant-action','✿ Cultivos')}${button('wall-action','▥ Defensas')}${button('spell-action','✧ Magias')}${button('hire-action','♙ Contratar')}${button('focus-action','◎ Poblado')}`;
    bind('center-action',()=>{tool={kind:'center'};document.querySelector('#panel').innerHTML='';});bind('plant-action',()=>toolPanel('plant'));bind('wall-action',()=>toolPanel('wall'));bind('spell-action',()=>toolPanel('spell'));bind('hire-action',()=>Game.openInitialHiring(state));bind('focus-action',()=>world.focus(state.villages[0]));
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
  const step=state.tutorial.step;el.innerHTML=`<section class="narrator"><div class="spirit" aria-hidden="true">✧</div><div><small>El Espíritu</small><p>${esc(tutorialText[step]??'Cuida la tierra y escucha al poblado.')}</p></div>${step==='intro'?button('intro-next','Comenzar'):''}</section>`;
  bind('intro-next',()=>{Game.resume(state,'intro');state.tutorial.step=state.structures.length?'plant':'center';});
}
function hiringDialog() {
  const selection={...state.hiringSelection},modal=document.querySelector('#modal');
  modal.innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="hiring-title" id="hiring-dialog"><div class="eyebrow">Amanecer · Día ${state.day}</div><h2 id="hiring-title">El equipo de hoy</h2><p>El salario se paga por esta jornada. Los centros conservan su plantilla hasta el siguiente amanecer.</p><div class="hire-grid">${PROFILES.map(p=>`<div class="hire-card"><strong>${p.name}</strong><small>${p.wage} monedas · ${p.male?'07:05–17:05 · +20% cosecha':'07:05–19:05'}${p.speed>1?' · trabajo ×1,5':''}</small><div class="counter"><button data-minus="${p.id}" aria-label="Reducir ${p.name}">−</button><input id="count-${p.id}" type="number" min="0" step="1" value="${selection[p.id]??0}" aria-label="Cantidad ${p.name}"><button data-plus="${p.id}" aria-label="Añadir ${p.name}">+</button></div></div>`).join('')}</div><p id="hire-cost"></p><p class="feedback" id="hire-error" role="alert"></p><div class="dialog-actions">${button('confirm-hire','Confirmar jornada')}</div></section></div>`;
  const refresh=()=>{for(const p of PROFILES)selection[p.id]=Number(document.querySelector(`#count-${p.id}`).value);try{const cost=hiringCost(selection);document.querySelector('#hire-cost').textContent=`Total: ${cost} monedas · Disponible: ${formatMoney(state.ledger.balance)}`;document.querySelector('#confirm-hire').disabled=cost>numberOf(state.ledger.balance);document.querySelector('#hire-error').textContent=cost>numberOf(state.ledger.balance)?'Reduce la plantilla para ajustarla al saldo.':'';}catch(e){document.querySelector('#confirm-hire').disabled=true;document.querySelector('#hire-error').textContent=e.message;}};
  document.querySelectorAll('[data-minus],[data-plus]').forEach(el=>el.onclick=()=>{const id=el.dataset.minus??el.dataset.plus,input=document.querySelector(`#count-${id}`);input.value=Math.max(0,Number(input.value)+(el.dataset.plus?1:-1));refresh();});document.querySelectorAll('.counter input').forEach(el=>el.oninput=refresh);
  bind('confirm-hire',()=>{Game.hire(state,commandId(),selection);modal.innerHTML='';save();audio.gameplay(state.day).catch(()=>{});});refresh();
}
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
