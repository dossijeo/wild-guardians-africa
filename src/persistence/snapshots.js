import {BASIC_STEPS,TUTORIAL_IDS} from '../tutorial/messages.js';
export const SAVE_VERSION=1;
function wholeMoney(value){
  return value&&typeof value.n==='string'&&typeof value.d==='string'&&/^-?\d+$/.test(value.n)&&/^[1-9]\d*$/.test(value.d)&&BigInt(value.n)%BigInt(value.d)===0n;
}
export function validateSnapshot(state) {
  if(!state || state.saveVersion!==SAVE_VERSION || typeof state.slotId!=='string')throw new Error('Guardado incompatible');
  if(!Number.isFinite(state.time)||state.time<0||state.time>600 || !Number.isSafeInteger(state.day)||state.day<1)throw new Error('Reloj inválido');
  if(!state.ledger||!wholeMoney(state.ledger.balance)||BigInt(state.ledger.balance.n)<0n)throw new Error('Saldo inválido');
  if(!state.ledger.entries||typeof state.ledger.entries!=='object'||Array.isArray(state.ledger.entries)||!Object.values(state.ledger.entries).every(wholeMoney))throw new Error('Libro monetario inválido');
  const tutorial=state.tutorial,validIds=ids=>Array.isArray(ids)&&ids.every(id=>TUTORIAL_IDS.includes(id))&&new Set(ids).size===ids.length;
  if(!tutorial||!BASIC_STEPS.includes(tutorial.step)||!validIds(tutorial.seen)||tutorial.pending!==undefined&&!validIds(tutorial.pending)||tutorial.reading!==undefined&&tutorial.reading!==null&&!TUTORIAL_IDS.includes(tutorial.reading)||tutorial.basicSkipped!==undefined&&typeof tutorial.basicSkipped!=='boolean')throw new Error('Tutorial inválido');
  if(tutorial.reading&&!state.pauses?.includes('tutorial-reading')||state.pauses?.includes('tutorial-reading')&&!tutorial.reading)throw new Error('Lectura tutorial incoherente');
  const ids=new Set();
  for(const name of ['plants','structures','workers','crates','villages','spells','tasks']) {
    if(!Array.isArray(state[name]))throw new Error('Entidades inválidas');
    for(const e of state[name]) {
      if(typeof e.id!=='string'||ids.has(e.id))throw new Error('Identidad duplicada');ids.add(e.id);
      if(['plants','structures','workers','crates','villages','spells'].includes(name) && (!Number.isFinite(e.x)||!Number.isFinite(e.z)))throw new Error('Posición inválida');
    }
  }
  const workers=new Map(state.workers.map(w=>[w.id,w])),crates=new Map(state.crates.map(c=>[c.id,c])),plants=new Map(state.plants.map(p=>[p.id,p]));
  for(const structure of state.structures)if(structure.kind==='wall'&&(structure.baseScaleX!==undefined&&(!Number.isFinite(structure.baseScaleX)||structure.baseScaleX<=0)||structure.autoGate!==undefined&&typeof structure.autoGate!=='boolean'))throw new Error('Módulo de defensa inválido');
  for(const structure of state.structures)if(structure.gateOpen!==undefined&&(!structure.gate||!Number.isFinite(structure.gateOpen)||structure.gateOpen<0||structure.gateOpen>1))throw new Error('Apertura de puerta inválida');
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
    if(worker.crateId){
      const crate=crates.get(worker.crateId);
      if(!crate||crate.delivered||crate.carrierId!==worker.id||worker.status!=='carrying')throw new Error('Carga de trabajador inválida');
    }else if(worker.status==='carrying')throw new Error('Trabajador sin carga');
  }
  return state;
}
export function serialize(state) { validateSnapshot(state);return JSON.stringify(state); }
export function deserialize(text) { return validateSnapshot(JSON.parse(text)); }
export class SaveRepository {
  constructor(storage) {this.storage=storage;}
  key(slotId) {return `wild-guardians:slot:${slotId}`;}
  save(state) {
    const text=serialize(state),key=this.key(state.slotId);
    // Verify staging before replacing the last known valid snapshot.
    this.storage.setItem(key+':pending',text);
    deserialize(this.storage.getItem(key+':pending'));
    const previous=this.storage.getItem(key);
    if(previous) {try {deserialize(previous);this.storage.setItem(key+':backup',previous);}catch { /* Keep existing backup. */ }}
    this.storage.setItem(key,text);
    this.storage.removeItem(key+':pending');
  }
  load(slotId) {
    const key=this.key(slotId);
    try {return deserialize(this.storage.getItem(key));}
    catch {return deserialize(this.storage.getItem(key+':backup'));}
  }
  list() {
    const result=[];
    for(let i=0;i<this.storage.length;i++) {
      const key=this.storage.key(i);
      if(!key.startsWith('wild-guardians:slot:')||key.endsWith(':backup')||key.endsWith(':pending'))continue;
      try {const s=this.load(key.slice('wild-guardians:slot:'.length)); result.push({slotId:s.slotId,day:s.day,biome:s.biome,culture:s.culture,money:s.ledger.balance,updated:s.savedAt});}catch { /* Surface only valid recoverable slots. */ }
    }
    return result.sort((a,b)=>(b.updated??0)-(a.updated??0));
  }
}
