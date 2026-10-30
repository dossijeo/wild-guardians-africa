// Release packs the offline per-record JSONs together to stay within itch's file cap.
export function createGuardianCueLoader({packed=false,fetchJson=url=>fetch(url).then(r=>{if(!r.ok)throw Error(`Lip sync ${r.status}`);return r.json();})}={}){
 const banks=new Map();
 return async url=>{
  if(!packed)return fetchJson(url);
  const slash=url.lastIndexOf('/'),bankUrl=url.slice(0,slash+1)+'bank.json',id=url.slice(slash+1).replace(/\.json$/,'');
  let pending=banks.get(bankUrl);
  if(!pending){pending=fetchJson(bankUrl).catch(error=>{banks.delete(bankUrl);throw error;});banks.set(bankUrl,pending);}
  const bank=await pending,data=bank.records?.[id];
  if(bank.version!==1||!data||data.id!==id)throw Error('Missing packaged lip sync '+id);
  return data;
 };
}
export const loadGuardianCue=createGuardianCueLoader({packed:import.meta.env?.PROD===true});
