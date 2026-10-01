export const SAVE_VERSION=1;
function wholeMoney(value){
  return value&&typeof value.n==='string'&&typeof value.d==='string'&&/^-?\d+$/.test(value.n)&&/^[1-9]\d*$/.test(value.d)&&BigInt(value.n)%BigInt(value.d)===0n;
}
export function validateSnapshot(state) {
  if(!state || state.saveVersion!==SAVE_VERSION || typeof state.slotId!=='string')throw new Error('Guardado incompatible');
  if(!Number.isFinite(state.time)||state.time<0||state.time>600 || !Number.isSafeInteger(state.day)||state.day<1)throw new Error('Reloj inválido');
  if(!state.ledger||!wholeMoney(state.ledger.balance)||BigInt(state.ledger.balance.n)<0n)throw new Error('Saldo inválido');
  if(!state.ledger.entries||typeof state.ledger.entries!=='object'||Array.isArray(state.ledger.entries)||!Object.values(state.ledger.entries).every(wholeMoney))throw new Error('Libro monetario inválido');
  const ids=new Set();
  for(const name of ['plants','structures','workers','crates','villages','spells','tasks']) {
    if(!Array.isArray(state[name]))throw new Error('Entidades inválidas');
    for(const e of state[name]) {
      if(typeof e.id!=='string'||ids.has(e.id))throw new Error('Identidad duplicada');ids.add(e.id);
      if(['plants','structures','workers','crates','villages','spells'].includes(name) && (!Number.isFinite(e.x)||!Number.isFinite(e.z)))throw new Error('Posición inválida');
    }
  }
  const workers=new Map(state.workers.map(w=>[w.id,w])),crates=new Map(state.crates.map(c=>[c.id,c]));
  for(const crate of state.crates){
    if(crate.carrierId){
      const worker=workers.get(crate.carrierId);
      if(crate.delivered||!worker||worker.crateId!==crate.id||worker.status!=='carrying')throw new Error('Portador de caja inválido');
    }
  }
  for(const worker of state.workers){
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
