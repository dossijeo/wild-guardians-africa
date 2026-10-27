import {validDamageProfile} from '../simulation/raid-agricultural-impact.js';
import {validateMicroState} from '../microevents/economy.js';
import {validRaidContention} from './raid-contention-snapshot.js';
import {validatePressureSnapshot} from './raid-pressure-snapshot.js';
import {validateAgriculturalPower} from '../simulation/agricultural-power.js';
import {BASIC_STEPS,TUTORIAL_IDS} from '../tutorial/messages.js';
import {validExitFrontier} from './exit-connector-snapshot.js';
export const SAVE_VERSION=1;
function wholeMoney(value){
  return value&&typeof value.n==='string'&&typeof value.d==='string'&&/^-?\d+$/.test(value.n)&&/^[1-9]\d*$/.test(value.d)&&BigInt(value.n)%BigInt(value.d)===0n;
}
export function validateSnapshot(state) {
  if(!state || state.saveVersion!==SAVE_VERSION || typeof state.slotId!=='string')throw new Error('Guardado incompatible');
  if(state.mangroveSettlementVersion!==undefined&&(![1,2].includes(state.mangroveSettlementVersion)||state.biome!=='manglares'||!state.mangroveNetwork))throw new Error('Reserva de Manglares incompatible');
  if(state.mangroveNetwork!==undefined&&(typeof state.mangroveNetwork!=='boolean'||state.biome!=='manglares'))throw new Error('Variante de Manglares inválida');
  if(state.mangroveChannels!==undefined&&(typeof state.mangroveChannels!=='boolean'||state.biome!=='manglares'))throw new Error('Variante de Manglares inválida');
  validateMicroState(state);
  validatePressureSnapshot(state);
  if(!Number.isFinite(state.time)||state.time<0||state.time>600 || !Number.isSafeInteger(state.day)||state.day<1)throw new Error('Reloj inválido');
  if(state.cinematicSeenAct!==undefined&&(!Number.isSafeInteger(state.cinematicSeenAct)||state.cinematicSeenAct<0||state.cinematicSeenAct>10||state.cinematicSeenAct>Math.floor((state.completedNights??0)/10)))throw new Error('Progreso de cinemáticas inválido');
  if(!state.ledger||!wholeMoney(state.ledger.balance)||BigInt(state.ledger.balance.n)<0n)throw new Error('Saldo inválido');
  if(!state.ledger.entries||typeof state.ledger.entries!=='object'||Array.isArray(state.ledger.entries)||!Object.values(state.ledger.entries).every(wholeMoney))throw new Error('Libro monetario inválido');
  const tutorial=state.tutorial,validIds=ids=>Array.isArray(ids)&&ids.every(id=>TUTORIAL_IDS.includes(id))&&new Set(ids).size===ids.length;
  if(!tutorial||!BASIC_STEPS.includes(tutorial.step)||!validIds(tutorial.seen)||tutorial.pending!==undefined&&!validIds(tutorial.pending)||tutorial.reading!==undefined&&tutorial.reading!==null&&!TUTORIAL_IDS.includes(tutorial.reading)||tutorial.basicSkipped!==undefined&&typeof tutorial.basicSkipped!=='boolean')throw new Error('Tutorial inválido');
  if(tutorial.guideAfterAuto!==undefined&&(!validIds(tutorial.guideAfterAuto)||tutorial.guideAfterAuto.some(id=>!['basic.center','basic.plant'].includes(id))))throw new Error('Guía tutorial inválida');
  if(tutorial.shownToday!==undefined){
    const shown=tutorial.shownToday;
    if(!shown||!Number.isSafeInteger(shown.day)||shown.day<1||shown.day>state.day||!Array.isArray(shown.ids)||new Set(shown.ids).size!==shown.ids.length||shown.ids.some(id=>typeof id!=='string'||!id.length))throw new Error('Registro diario de tutorial inválido');
  }
  if(tutorial.magicReminders!==undefined){
    const m=tutorial.magicReminders;
    if(!m||typeof m!=='object'||Array.isArray(m)||Object.entries(m).some(([key,value])=>key==='shieldRaid'?typeof value!=='string':!['growthAt','multiplyAt','lastAt'].includes(key)||!Number.isFinite(value)||value<0||value>state.elapsed))throw new Error('Recordatorios de magia inválidos');
  }
  if(state.pauses?.includes('tutorial-reading')&&!tutorial.reading)throw new Error('Lectura tutorial incoherente');
  if(state.raid?.cameraFocusedAnimalId!==undefined&&(typeof state.raid.cameraFocusedAnimalId!=='string'||!state.raid.animals.some(a=>a.id===state.raid.cameraFocusedAnimalId)))throw new Error('Foco de incursión inválido');
  if(state.raid?.introCropLimit!==undefined){
    const r=state.raid;
    if(!Number.isSafeInteger(r.introPlantCount)||r.introPlantCount<0||!Number.isSafeInteger(r.introCropLimit)||r.introCropLimit<0||r.introCropLimit>Math.max(0,r.introPlantCount-1)||!Number.isSafeInteger(r.introCropsDestroyed)||r.introCropsDestroyed<0||r.introCropsDestroyed>r.introCropLimit)throw new Error('Límite de incursión inicial inválido');
  }
  if(!validRaidContention(state))throw new Error('Turnos de incursión inválidos');
  const ids=new Set();
  for(const animal of state.raid?.animals??[]){
    if(animal.magicDown!==undefined){const d=animal.magicDown;if(!d||!['falling','recovering'].includes(d.phase)||![d.since,d.until].every(Number.isFinite)||d.since<0||d.since>state.elapsed||d.until<d.since||d.until-d.since>12)throw new Error('Derribo mágico inválido');}
    if(animal.magicHealth!==undefined&&(!Number.isFinite(animal.magicHealth)||animal.magicHealth<0||animal.magicHealth>1000))throw new Error('Resistencia mágica inválida');
    if(animal.magicStunUntil!==undefined&&(!Number.isFinite(animal.magicStunUntil)||animal.magicStunUntil<0))throw new Error('Interrupción mágica inválida');
    if(animal.magicImpact!==undefined){const h=animal.magicImpact;if(!h||!Number.isFinite(h.at)||h.at<0||h.at>state.elapsed||(h.impactAt!==undefined&&(!Number.isFinite(h.impactAt)||h.impactAt<h.at||h.impactAt-h.at>.5))||(h.ground!==undefined&&!Number.isFinite(h.ground))||(h.intensity!==undefined&&(!Number.isFinite(h.intensity)||h.intensity<0||h.intensity>2))||![h.point,h.direction,h.origin].every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)))throw new Error('Impacto mágico inválido');}
    if(animal.damageProfile!==undefined&&!validDamageProfile(animal.damageProfile))throw new Error('Perfil de impacto inválido');
    const ids=animal.agriculturalAttackIds;if(ids!==undefined&&(!Array.isArray(ids)||ids.length>64||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!id.length||id.length>96)))throw new Error('Impactos agrícolas inválidos');
  }
  for(const animal of state.raid?.animals??[])if(animal.exit!==undefined&&(!animal.exit||!Number.isFinite(animal.exit.x)||!Number.isFinite(animal.exit.z)))throw new Error('Salida de animal inválida');
  for(const animal of state.raid?.animals??[])if(animal.exitRouteRecovery!==undefined){
    const recovery=animal.exitRouteRecovery;
    if(!recovery||typeof recovery.destinationId!=='string'||
      recovery.destinationId!==`exit-${animal.id}`||
      !Number.isSafeInteger(recovery.version)||recovery.version<0||
      recovery.startedAt!==undefined&&(!Number.isFinite(recovery.startedAt)||
      recovery.startedAt<0||recovery.startedAt>state.elapsed))
      throw new Error('Recuperación de salida inválida');
  }
  for(const animal of state.raid?.animals??[])if(animal.exitConnectorSearch!==undefined){
    const search=animal.exitConnectorSearch;
    if(!search||typeof search.key!=='string'||search.key.length>256||!Number.isSafeInteger(search.next)||search.next<0||search.next>192)throw new Error('Conector de salida inválido');
    if(search.exhausted!==undefined&&typeof search.exhausted!=='boolean')throw new Error('Agotamiento de salida inválido');
    if(search.fine!==undefined&&!validExitFrontier(search.fine))throw new Error('Conector fraccional inválido');
    if(search.quarter!==undefined&&!validExitFrontier(search.quarter))throw new Error('Conector fraccional fino inválido');
  }
  for(const name of ['plants','structures','workers','crates','villages','spells','tasks']) {
    if(!Array.isArray(state[name]))throw new Error('Entidades inválidas');
    for(const e of state[name]) {
      if(typeof e.id!=='string'||ids.has(e.id))throw new Error('Identidad duplicada');ids.add(e.id);
      if(['plants','structures','workers','crates','villages','spells'].includes(name) && (!Number.isFinite(e.x)||!Number.isFinite(e.z)))throw new Error('Posición inválida');
    }
  }
  for(const p of state.plants)if(p.multiplyHarvest!==undefined&&typeof p.multiplyHarvest!=='boolean')throw new Error('Beneficio de multiplicación inválido');
  for(const a of state.spells)if(a.exposureApplied!==undefined&&(a.kind!=='multiply'||typeof a.exposureApplied!=='boolean'))throw new Error('Exposición mágica inválida');
  for(const a of state.spells)if(a.targetPlantId!==undefined&&(!['growth','multiply'].includes(a.kind)||typeof a.targetPlantId!=='string'||!state.plants.some(p=>p.id===a.targetPlantId)||!Number.isFinite(a.remaining)||a.remaining<0))throw new Error('Objetivo mágico inválido');
  for(const a of state.spells)if(a.growthSecondsAdded!==undefined&&(a.kind!=='growth'||!Number.isFinite(a.growthSecondsAdded)||a.growthSecondsAdded<0||a.growthSecondsAdded>15+1e-6))throw new Error('Progreso mágico inválido');
  for(const p of state.plants){
    const hp=p.attackHitPoints??2;
    if(![1,2].includes(hp)||p.attackHits!==undefined&&(!Number.isFinite(p.attackHits)||!Number.isSafeInteger(p.attackHits*(hp===1?4:2))||p.attackHits<0||p.attackHits>hp||p.alive&&p.attackHits>=hp))throw new Error('Daño de cultivo inválido');
  }
  const workers=new Map(state.workers.map(w=>[w.id,w])),crates=new Map(state.crates.map(c=>[c.id,c])),plants=new Map(state.plants.map(p=>[p.id,p]));
  for(const structure of state.structures)if(structure.kind==='wall'&&(structure.baseScaleX!==undefined&&(!Number.isFinite(structure.baseScaleX)||structure.baseScaleX<=0)||structure.autoGate!==undefined&&typeof structure.autoGate!=='boolean'))throw new Error('Módulo de defensa inválido');
  for(const structure of state.structures)if(structure.gateOpen!==undefined&&(!structure.gate||!Number.isFinite(structure.gateOpen)||structure.gateOpen<0||structure.gateOpen>1))throw new Error('Apertura de puerta inválida');
  for(const structure of state.structures)if(structure.wallPresentation!==undefined){
    const p=structure.wallPresentation,ratio=value=>Number.isFinite(value)&&value>=0&&value<=1;
    if(structure.kind!=='wall'||!p||!ratio(p.from)||!ratio(p.to)||!Number.isFinite(p.at)||p.at<0||!Number.isFinite(state.elapsed)||p.at>state.elapsed||p.collapseFrom!==undefined&&!ratio(p.collapseFrom)||structure.status==='collapsing'&&p.collapseFrom===undefined||structure.status==='intact'&&p.collapseFrom!==undefined)throw new Error('Wall presentation invalid');
  }
  const harvested=new Set();
  for(const crate of state.crates){
    // Older version-1 snapshots lack provenance. Validate it whenever present.
    if(crate.sourcePlantId!==undefined){
      const plant=plants.get(crate.sourcePlantId);
      if(!plant||plant.alive||plant.species!==crate.species||harvested.has(plant.id))throw new Error('Origen de cosecha inválido');
      harvested.add(plant.id);
    }
    if(crate.carrierId){
      const worker=workers.get(crate.carrierId);
      if(crate.delivered||!worker||worker.crateId!==crate.id||worker.status!=='carrying')throw new Error('Portador de caja inválido');
    }
  }
  for(const worker of state.workers){
    if(worker.gateWaiting!==undefined&&typeof worker.gateWaiting!=='boolean')throw new Error('Espera de puerta inválida');
    if(worker.terrainAvoidance!==undefined&&(!Array.isArray(worker.terrainAvoidance)||worker.terrainAvoidance.length>8||worker.terrainAvoidance.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))))throw new Error('Desvío de terreno inválido');
    if(worker.crateId){
      const crate=crates.get(worker.crateId);
      if(!crate||crate.delivered||crate.carrierId!==worker.id||worker.status!=='carrying')throw new Error('Carga de trabajador inválida');
    }else if(worker.status==='carrying')throw new Error('Trabajador sin carga');
  }
  validateAgriculturalPower(state);
  return state;
}
export function serialize(state) { validateSnapshot(state);return JSON.stringify(state); }
export function deserialize(text) { return validateSnapshot(JSON.parse(text)); }
function slotSnapshot(text,slotId) {
  const state=deserialize(text);
  if(state.slotId!==slotId)throw new Error('La partida guardada pertenece a otra ranura.');
  return state;
}
export class SaveRepository {
  constructor(storage) {this.storage=storage;}
  key(slotId) {return `wild-guardians:slot:${slotId}`;}
  save(state) {
    const text=serialize(state),key=this.key(state.slotId);
    try {
      // Verify staging before replacing the last known valid snapshot.
      this.storage.setItem(key+':pending',text);
      slotSnapshot(this.storage.getItem(key+':pending'),state.slotId);
      const previous=this.storage.getItem(key);
      if(previous) {
        let valid=false;
        try {slotSnapshot(previous,state.slotId);valid=true;}catch { /* Keep existing backup. */ }
        if(valid)this.storage.setItem(key+':backup',previous);
      }
      this.storage.setItem(key,text);
    } finally {
      // A failed write is not a recoverable save; load never uses staging.
      // Release its space even when quota prevents backup/primary writes.
      this.storage.removeItem(key+':pending');
    }
  }
  load(slotId) {
    const key=this.key(slotId);
    try {return slotSnapshot(this.storage.getItem(key),slotId);}
    catch {return slotSnapshot(this.storage.getItem(key+':backup'),slotId);}
  }
  delete(slotId) {
    if(typeof slotId!=='string'||!slotId)throw new Error('Ranura inválida');
    const key=this.key(slotId);
    // Remove recovery copies too, so a deleted game cannot reappear on load.
    this.storage.removeItem(key+':backup');
    this.storage.removeItem(key+':pending');
    this.storage.removeItem(key);
  }
  list() {
    const result=[];
    for(let i=0;i<this.storage.length;i++) {
      const key=this.storage.key(i);
      if(!key.startsWith('wild-guardians:slot:')||key.endsWith(':backup')||key.endsWith(':pending'))continue;
      try {const s=this.load(key.slice('wild-guardians:slot:'.length)); result.push({slotId:s.slotId,day:s.day,time:s.time,biome:s.biome,culture:s.culture,money:s.ledger.balance,updated:s.savedAt});}catch { /* Surface only valid recoverable slots. */ }
    }
    return result.sort((a,b)=>(b.updated??0)-(a.updated??0));
  }
}
