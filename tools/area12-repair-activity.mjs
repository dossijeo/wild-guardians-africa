// Attribute useful repair order to its original decision only after paid restore.
export function repairActivity(decisions,requests,receipts){
 const completed=new Map();
 for(const receipt of receipts)if(receipt.paidCoins>0&&receipt.restoredHp>receipt.previousHp){
  const request=requests.find(r=>r.taskId===receipt.taskId);
  if(request)completed.set(request.decisionIndex,(completed.get(request.decisionIndex)??0)+1);
 }
 const rows=decisions.map((d,i)=>({...d,meaningfulActions:d.actions-(d.centerRepairRequests??0)+(completed.get(i)??0)}));
 const daylight=rows.reduce((n,r)=>n+r.daylightSeconds,0),idle=rows.reduce((n,r)=>n+(!r.meaningfulActions&&['budget','space','shift-end','active'].includes(r.reason)?r.daylightSeconds:0),0);
 return {daylightSeconds:daylight,unoccupiedSeconds:idle,unoccupiedFraction:daylight?idle/daylight:null,creditedPaidRestoringRequests:[...completed].reduce((n,[,v])=>n+v,0),requests,scope:'Raw metric retained separately; completed paid HP-restoring repairs credited to request decision only, never autonomous travel/action duration. Paid walls still require interception evidence to qualify as useful defense.'};
}
