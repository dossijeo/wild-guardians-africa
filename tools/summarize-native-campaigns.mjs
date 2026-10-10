import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export function summarizeNativeCase({receipt,source,report,partial}){
 assert.notEqual(receipt.status,'running','Only terminal evidence can be summarized');
 const data=report??partial?.receipts;
 assert.ok(data,'Missing native evidence');
 const native=data.nativeEvidence,raids=data.raidEvidence?.raids??[];
 const daily=(data.daily??[]).map(d=>{
  const f=d.finance,expenses=['wages','seeds','walls','centers','villages','repairs','otherDebits'].reduce((n,k)=>n+f[k],0),credits=f.income+f.refunds+f.otherCredits;
  assert.equal(f.closing-f.opening,credits-expenses,'Daily journal must reconcile');
  const observed=native?.daily?.find(r=>r.day===d.day);
  if(observed)assert.equal(observed.income,f.income,'Only physically delivered income');
  const attacks=raids.filter(r=>r.day===d.day),sum=k=>attacks.reduce((n,r)=>n+(r[k]??0),0);
  return {day:d.day,money:f.closing,income:f.income,expenses,net:credits-expenses,
   seeds:f.seeds,wages:f.wages,walls:f.walls,repairs:f.repairs,
   purchased:observed?.cropPurchases??null,living:d.living,delivered:d.delivered,destroyed:d.destroyed,
   wallPieces:observed?.wallPieces??null,animals:attacks.reduce((n,r)=>n+r.actors.length,0),
   cropHits:sum('cropHits'),wallHits:sum('wallHits'),centerHits:sum('centerHits'),
   destroyedByAttacks:sum('cropsDestroyed'),shieldContacts:sum('shieldContacts'),
   daylightSeconds:d.daylightSeconds,idleFraction:d.daylightSeconds?d.unoccupiedSeconds/d.daylightSeconds:null};
 });
 const daylight=daily.reduce((n,d)=>n+d.daylightSeconds,0),idle=daily.reduce((n,d)=>n+d.daylightSeconds*(d.idleFraction??0),0);
 return {strategy:source.arguments.strategy,seed:source.arguments.seed,gitHead:source.gitHead,
  status:receipt.status,result:receipt.result??receipt.nativeResult??null,error:receipt.message??null,
  observedDays:daily.length,completedNights:report?.completedNights??null,
  incompleteAt:partial?{day:partial.day,time:partial.time}:null,
  money:daily.at(-1)?.money??null,living:daily.at(-1)?.living??null,
  income:daily.reduce((n,d)=>n+d.income,0),expenses:daily.reduce((n,d)=>n+d.expenses,0),
  net:daily.reduce((n,d)=>n+d.net,0),wallPieces:daily.reduce((n,d)=>n+(d.wallPieces??0),0),
  wallHits:daily.reduce((n,d)=>n+d.wallHits,0),idleFraction:daylight?idle/daylight:null,
  observerStatus:native?.status??null,raidObserverStatus:data.raidEvidence?.status??null,daily,
  scope:'Completed native days only. Partial current day remains in original receipts. No extrapolation to100/180. Day1 opening already paid center800; daily net excludes that opening capital. Purchases include first hiring-trigger seed, unlike loop-only planted count. Additional wages are already in wages. No GPU/touch/visual acceptance.'};
}
const read=path=>JSON.parse(readFileSync(path,'utf8'));
export function readNativeCase(dir){return summarizeNativeCase({receipt:read(resolve(dir,'receipt.json')),source:read(resolve(dir,'source.json')),report:existsSync(resolve(dir,'report.json'))?read(resolve(dir,'report.json')):null,partial:existsSync(resolve(dir,'partial.json'))?read(resolve(dir,'partial.json')):null});}
const pct=x=>x===null?'—':(100*x).toFixed(2)+'%';
export function writeNativeComparison(out,cases){
 mkdirSync(out,{recursive:true});
 writeFileSync(resolve(out,'comparison.json'),JSON.stringify(cases,null,2)+'\n');
 const columns=['strategy','seed','status','day','money','income','expenses','net','purchased','living','delivered','destroyed','walls','repairs','wallPieces','animals','cropHits','wallHits','centerHits','destroyedByAttacks','shieldContacts','idleFraction'];
 writeFileSync(resolve(out,'daily.csv'),columns.join(',')+'\n'+cases.flatMap(c=>c.daily.map(d=>columns.map(k=>d[k]??c[k]??'').join(','))).join('\n')+'\n');
 const lines=['# Piloto nativo: resultados observados','',
  '| Estrategia | Semilla | Estado | Días completos | Dinero | Vivas | Ingresos | Gastos | Neto diario acumulado | Muros comprados | Golpes a muros | Inactividad |',
  '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...cases.map(c=>`| ${c.strategy} | ${c.seed} | ${c.status} | ${c.observedDays} | ${c.money} | ${c.living} | ${c.income} | ${c.expenses} | ${c.net} | ${c.wallPieces} | ${c.wallHits} | ${pct(c.idleFraction)} |`),
  '',...cases.filter(c=>c.error).map(c=>`- ${c.strategy}: incompleto en día ${c.incompleteAt?.day}, hora interna ${c.incompleteAt?.time}. ${c.error}`),
  '',cases[0]?.scope??'',
  '', 'Las campañas comparten código y economía; sus decisiones pueden consumir RNG y modificar atracción. Compartir semilla no garantiza cohortes idénticas. Una compra de muro no acredita recinto cerrado ni protección eficaz.',
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
