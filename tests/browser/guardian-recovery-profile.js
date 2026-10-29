import {AuthoredBeastRecovery} from '../../src/rendering/authored-beast-recovery.js';
import {BakedSolidContacts} from '../../src/rendering/baked-solid-contacts.js';
import {SkinContactBounds} from '../../src/rendering/skin-contact-bounds.js';
import {RecoveryClothContacts} from '../../src/rendering/recovery-cloth-contacts.js';

// Opt-in QA only. Inclusive method timings overlap; never sum these rows.
export function profileRecovery(){
 const rows={},restore=[];
 for(const [name,type,method] of [['pose',AuthoredBeastRecovery,'apply'],['solids',BakedSolidContacts,'resolve'],['skin',SkinContactBounds,'expand'],['cloth',RecoveryClothContacts,'resolve']]){
  const original=type.prototype[method],values=[];let calls=0,total=0,max=0;
  const wrapped=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-start;calls++;total+=ms;max=Math.max(max,ms);if(values.length<10000)values.push(ms);}};
  type.prototype[method]=wrapped;restore.push(()=>{if(type.prototype[method]===wrapped)type.prototype[method]=original;});
  rows[name]=()=>{const sorted=[...values].sort((a,b)=>a-b);return {calls,totalMs:total,maxMs:max,sampled:values.length,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]??0};};
 }
 return {snapshot:()=>Object.fromEntries(Object.entries(rows).map(([name,read])=>[name,read()])),dispose:()=>restore.forEach(fn=>fn())};
}
