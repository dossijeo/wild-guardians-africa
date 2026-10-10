import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export function summarizeNativeRaid(r){
 const species=Object.values(r.species??{}),sum=k=>species.reduce((n,s)=>n+(s[k]??0),0);
 const budget=sum('initialHitBudget'),consumed=sum('observedBudgetConsumed');
 assert.ok(consumed<=budget,'Consumed strikes exceed original native budget');
 const exact=r.exposureStatus==='exact-native-spawn'&&Number.isInteger(r.exposedLivingAtSpawn);
 return {id:r.id,day:r.day,daytime:r.daytime,ended:r.ended,animals:r.actors.length,
  exposedLiving:exact?r.exposedLivingAtSpawn:null,exposedWounded:exact?r.exposedWoundedAtSpawn:null,
  hitBudget:budget,consumedStrikes:consumed,remainingOrUnobservedStrikes:budget-consumed,
  potentialStructureDamage:sum('maximumStructureDamage'),structureHpLost:r.structureHpLost??0,wallHpLost:r.wallHpLost??0,
  cropHits:r.cropHits??0,destroyed:r.cropsDestroyed??0,workerHits:r.workerHits??0,misses:r.misses??0,
  shieldContacts:r.shieldContacts??0,wallHits:r.wallHits??0,centerHits:r.centerHits??0,
  replacementCost:r.cropReplacementCost??0,lostBaseHarvestValue:r.lostBaseHarvestValue??0,
  destroyedFraction:exact&&r.ended&&r.exposedLivingAtSpawn>0?r.cropsDestroyed/r.exposedLivingAtSpawn:null,
  // Single-plant legacy bounds do not apply to profiled area attacks. Q is a
  // density-reference potential, not a universal physical upper bound.
  freshCropKillUpperBound:r.pressureFacts?null:Math.floor(budget/2),woundedCropKillUpperBound:r.pressureFacts?null:budget,
  pressure:r.pressureFacts?.pressure??null,referencePotentialAgriculturalHp:r.potentialAgriculturalHp??null,
  effectiveAgriculturalHp:r.effectiveAgriculturalHp??null,agriculturalEfficiency:r.agriculturalEfficiency??null,
  plantsReached:r.plantsReached??null,woundedAfterAttack:r.woundedAfterAttack??null,
  targetUnavailableAttempts:r.targetUnavailableAttempts??0,routeUnavailableAttempts:r.routeUnavailableAttempts??0,
  targetUnprotected:!r.daytime?.2057+.0007*(r.day-1):null,
  targetProtected:!r.daytime?.0351+.0001*(r.day-1):null,
  species:r.species??{},scope:'Per completed raid, exact spawn census only. Targets are reference hypotheses, never deletion rules. Legacy single-plant kill bounds are omitted for area-profiled raids. Q is reference-density potential, not a guaranteed casualty count or universal upper bound. Replacement cost and lost base harvest are diagnostic opportunity losses, never ledger expenses.'};
}

export function summarizeNativeCase({receipt,source,report,partial}){
 assert.notEqual(receipt.status,'running','Only terminal evidence can be summarized');
 const data=report??partial?.receipts;
 assert.ok(data,'Missing native evidence');
 const native=data.nativeEvidence,raids=data.raidEvidence?.raids??[],raidRows=raids.map(summarizeNativeRaid);
 const creditedRepairs=new Set();
 for(const payment of native?.repairSettlements?.receipts??[])if(payment.paidCoins>0&&payment.restoredHp>payment.previousHp){
  const request=native.requests?.find(r=>r.taskId===payment.taskId);if(request)creditedRepairs.add(request.decisionIndex);
 }
 let cumulativeOperatingNet=0;
 const daily=(data.daily??[]).map(d=>{
  const f=d.finance,expenses=['wages','seeds','walls','centers','villages','repairs','otherDebits'].reduce((n,k)=>n+f[k],0),credits=f.income+f.refunds+f.otherCredits;
  assert.equal(f.closing-f.opening,credits-expenses,'Daily journal must reconcile');
  const observed=native?.daily?.find(r=>r.day===d.day);
  if(observed)assert.equal(observed.income,f.income,'Only physically delivered income');
  const decisions=native?.decisions?.map((r,index)=>({...r,index})).filter(r=>r.day===d.day);
  const daylight=decisions?.reduce((n,r)=>n+r.daylightSeconds,0);
  if(decisions)assert.ok(Math.abs(daylight-d.daylightSeconds)<1e-5,'Decision daylight must match completed native day');
  const idle=decisions?decisions.reduce((n,r)=>n+(r.otherActions||creditedRepairs.has(r.index)?0:r.daylightSeconds),0):d.unoccupiedSeconds;
  cumulativeOperatingNet+=credits-expenses;
  const attacks=raids.filter(r=>r.day===d.day),sum=k=>attacks.reduce((n,r)=>n+(r[k]??0),0);
  return {day:d.day,money:f.closing,income:f.income,expenses,net:credits-expenses,
   seeds:f.seeds,wages:f.wages,walls:f.walls,repairs:f.repairs,centers:f.centers,villages:f.villages,
   refunds:f.refunds,otherCredits:f.otherCredits,otherDebits:f.otherDebits,cumulativeOperatingNet,
   referenceRepairCostAtEndLiving:12+.42*d.living+.003*d.living*d.living,
   purchased:observed?.cropPurchases??null,living:d.living,delivered:d.delivered,destroyed:d.destroyed,
   wallPieces:observed?.wallPieces??null,animals:attacks.reduce((n,r)=>n+r.actors.length,0),
   cropHits:sum('cropHits'),wallHits:sum('wallHits'),centerHits:sum('centerHits'),
   destroyedByAttacks:sum('cropsDestroyed'),shieldContacts:sum('shieldContacts'),
   daylightSeconds:d.daylightSeconds,idleFraction:d.daylightSeconds?idle/d.daylightSeconds:null,
   rawDecisionIdleFraction:d.daylightSeconds?d.unoccupiedSeconds/d.daylightSeconds:null,
   activityBasis:decisions?'native decisions plus once-credited paid HP-restoring repair requests':'legacy raw decisions; repair credit evidence unavailable'};
 });
 const daylight=daily.reduce((n,d)=>n+d.daylightSeconds,0),idle=daily.reduce((n,d)=>n+d.daylightSeconds*(d.idleFraction??0),0);
 return {strategy:source.arguments.strategy,seed:source.arguments.seed,gitHead:source.gitHead,
  labourPolicy:data.labourPolicy??source.arguments.labourPolicy??null,
  requestedDays:source.arguments.days??null,biome:data.biome??source.arguments.biome??null,culture:data.culture??source.arguments.culture??null,
  shieldEnabled:typeof data.policy?.shieldEnabled==='boolean'?data.policy.shieldEnabled:typeof data.shieldEnabled==='boolean'?data.shieldEnabled:null,
  protocolId:data.protocol?.id??source.protocol?.id??null,
  status:receipt.status,result:receipt.result??receipt.nativeResult??null,error:receipt.message??null,
  observedDays:daily.length,completedNights:report?.completedNights??null,
  incompleteAt:partial?{day:partial.day,time:partial.time}:null,
  money:daily.at(-1)?.money??null,living:daily.at(-1)?.living??null,
  income:daily.reduce((n,d)=>n+d.income,0),expenses:daily.reduce((n,d)=>n+d.expenses,0),
  net:daily.reduce((n,d)=>n+d.net,0),wallPieces:daily.reduce((n,d)=>n+(d.wallPieces??0),0),
  wallHits:daily.reduce((n,d)=>n+d.wallHits,0),idleFraction:daylight?idle/daylight:null,
  observerStatus:native?.status??null,raidObserverStatus:data.raidEvidence?.status??null,daily,raids:raidRows,
  scope:'Completed native days only. Partial current day remains in original receipts. No extrapolation to100/180. Day1 opening already paid center800; cumulative operating net excludes that opening capital. Purchases include first hiring-trigger seed, unlike loop-only planted count. Additional wages are already in wages. Repair reference uses end-of-day living plants and is a hypothetical comparison only, never a fee; actual repairs include all structures. Activity uses native decisions plus once-credited paid HP-restoring requests when available; raw legacy activity is labeled separately. No GPU/touch/visual acceptance.'};
}
const read=path=>JSON.parse(readFileSync(path,'utf8'));
export function readNativeCase(dir){return summarizeNativeCase({receipt:read(resolve(dir,'receipt.json')),source:read(resolve(dir,'source.json')),report:existsSync(resolve(dir,'report.json'))?read(resolve(dir,'report.json')):null,partial:existsSync(resolve(dir,'partial.json'))?read(resolve(dir,'partial.json')):null});}
const pct=x=>x===null?'—':(100*x).toFixed(2)+'%';
export function writeNativeComparison(out,cases){
 if(existsSync(out)&&readdirSync(out).length)throw Error('Refusing to overwrite original comparison evidence');
 mkdirSync(out,{recursive:true});
 writeFileSync(resolve(out,'comparison.json'),JSON.stringify(cases,null,2)+'\n');
 const columns=['strategy','seed','status','day','money','income','expenses','net','cumulativeOperatingNet','seeds','wages','walls','repairs','centers','villages','refunds','otherCredits','otherDebits','purchased','living','delivered','destroyed','wallPieces','animals','cropHits','wallHits','centerHits','destroyedByAttacks','shieldContacts','referenceRepairCostAtEndLiving','idleFraction','rawDecisionIdleFraction','activityBasis','gitHead','labourPolicy','shieldEnabled','biome','culture','requestedDays','protocolId'];
 writeFileSync(resolve(out,'daily.csv'),columns.join(',')+'\n'+cases.flatMap(c=>c.daily.map(d=>columns.map(k=>d[k]??c[k]??'').join(','))).join('\n')+'\n');
 const raidColumns=['strategy','seed','id','day','daytime','ended','animals','exposedLiving','exposedWounded','hitBudget','consumedStrikes','remainingOrUnobservedStrikes','potentialStructureDamage','structureHpLost','wallHpLost','cropHits','destroyed','destroyedFraction','workerHits','misses','shieldContacts','wallHits','centerHits','replacementCost','lostBaseHarvestValue','freshCropKillUpperBound','woundedCropKillUpperBound','targetUnprotected','targetProtected','pressure','referencePotentialAgriculturalHp','effectiveAgriculturalHp','agriculturalEfficiency','plantsReached','woundedAfterAttack','targetUnavailableAttempts','routeUnavailableAttempts'];
 writeFileSync(resolve(out,'raids.csv'),raidColumns.join(',')+'\n'+cases.flatMap(c=>c.raids.map(r=>raidColumns.map(k=>r[k]??c[k]??'').join(','))).join('\n')+'\n');
 const lines=['# Piloto nativo: resultados observados','',
  '| Estrategia | Contratación declarada | Fuente | Semilla | Estado | Días completos / solicitados | Dinero | Vivas | Ingresos | Gastos | Neto diario acumulado | Muros comprados | Golpes a muros | Inactividad |',
  '|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...cases.map(c=>`| ${c.strategy} | ${c.labourPolicy??'no registrada'} | ${c.gitHead?.slice(0,8)??'sin fuente'} | ${c.seed} | ${c.status} | ${c.observedDays} / ${c.requestedDays??'—'} | ${c.money} | ${c.living} | ${c.income} | ${c.expenses} | ${c.net} | ${c.wallPieces} | ${c.wallHits} | ${pct(c.idleFraction)} |`),
  '',...cases.filter(c=>c.error).map(c=>`- ${c.strategy}: incompleto en día ${c.incompleteAt?.day}, hora interna ${c.incompleteAt?.time}. ${c.error}`),
  '',cases[0]?.scope??'',
  '', 'Consultar las fuentes, políticas y condiciones declaradas: esta tabla no acredita que campañas de versiones distintas compartan código o parámetros. Las decisiones pueden consumir RNG y modificar atracción; compartir semilla no garantiza cohortes idénticas. Una compra de muro no acredita recinto cerrado ni protección eficaz. Un control sin murallas puede conservar escudos; si ese permiso no está registrado, no se infiere de su nombre.',
  '', '![Dinero por día](money.svg)', '', '![Plantas vivas por día](living.svg)', ''];
 writeFileSync(resolve(out,'comparison.md'),lines.join('\n'));
 const colors=['#2f855a','#b7791f','#c53030','#2b6cb0'];
 for(const [key,label] of [['money','Monedas'],['living','Plantas vivas']]){
  const maxDay=Math.max(1,...cases.flatMap(c=>c.daily.map(d=>d.day))),maxValue=Math.max(1,...cases.flatMap(c=>c.daily.map(d=>d[key]))),x=d=>60+(d-1)*680/Math.max(1,maxDay-1),y=v=>300-v*230/maxValue;
  const body=cases.map((c,i)=>`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="3" points="${c.daily.map(d=>`${x(d.day)},${y(d[key])}`).join(' ')}"/><text x="60" y="${335+22*i}" fill="${colors[i%4]}">${c.strategy} (${c.observedDays} días observados)</text>`).join('');
  writeFileSync(resolve(out,key+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="white"/><g font-family="sans-serif" font-size="16"><text x="60" y="30">${label} — piloto nativo, sin extrapolación</text><path d="M60 60V300H740" fill="none" stroke="#444"/><text x="10" y="70">${maxValue}</text><text x="25" y="300">0</text><text x="60" y="320">Día 1</text><text x="690" y="320">Día ${maxDay}</text>${body}</g></svg>`);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [out,...dirs]=process.argv.slice(2);if(!out||!dirs.length)throw Error('Usage: node tools/summarize-native-campaigns.mjs OUT CASE_DIR...');
 writeNativeComparison(resolve(out),dirs.map(dir=>readNativeCase(resolve(dir))));
}
