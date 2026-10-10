import {readFileSync} from 'node:fs';
import * as Game from '../src/simulation/game.js';
import {permission,operational} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
// At most one native geometry/path preview per scheduled attempt. No credited
// action unless a real purchase is accepted. Villages respect postgame gating.
export function createNativeCampaignExpansion({interval=30}={}){
 const payloads=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url)));
 let next=0,centerIndex=0,villageIndex=0;const receipts=[],attempts=[];
 const directions=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
 function act(s,nav,{command,reserve}){
  if(s.elapsed<next||s.raid||!permission(s,'center'))return 0;next=s.elapsed+interval;
  const cash=numberOf(s.ledger.balance),first=s.villages[0],culture=s.culture;
  // Native postgame is peaceful. Never pretend these purchases occurred in
  // the hundred combat nights when the production permission forbids them.
  if(permission(s,'village')&&cash>=reserve+2800){
   const i=villageIndex++,[dx,dz]=directions[i%directions.length],r=96*(1+Math.floor(i/directions.length));
   const payload=payloads.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
   const p=Game.previewVillage(s,culture,first.x+dx*r,first.z+dz*r,payload,nav);
   attempts.push({day:s.day,kind:'village',x:p.x,z:p.z,valid:p.valid,reason:p.reason});
   if(p.valid){const id=command('village');if(Game.foundVillage(s,id,culture,p.x,p.z,payload,nav)){receipts.push({day:s.day,kind:'village',id,targetId:s.villages.at(-1).id,paidCoins:-numberOf(s.ledger.entries[id])});return 1;}}
   return 0;
  }
  if(cash<reserve+800)return 0;
  const villages=s.villages,slot=centerIndex++,v=villages[Math.floor(slot/8)%villages.length],[dx,dz]=directions[slot%8];
  const p=Game.previewCenter(s,{x:v.x+dx*30,z:v.z+dz*30},nav);
  attempts.push({day:s.day,kind:'center',x:p.x,z:p.z,valid:p.valid,reason:p.reason});
  if(!p.valid)return 0;
  const id=command('center');if(!Game.placeStructure(s,id,p,nav))return 0;
  const target=s.structures.filter(operational).at(-1);receipts.push({day:s.day,kind:'center',id,targetId:target.id,paidCoins:-numberOf(s.ledger.entries[id])});return 1;
 }
 return {act,report:()=>structuredClone({receipts,attempts,scope:'Only accepted native purchases; village permission respected. Bounds and paths can reject a site; no manual entities or free workers.'})};
}
