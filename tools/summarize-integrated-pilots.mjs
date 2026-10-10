// Reporting only: never advances a simulation or mutates an original receipt.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='docs/qa/integrated-spiritual-survival';
const [version='v5',suffix='cache']=process.argv.slice(2);
if(!/^v[0-9]+$/.test(version)||! /^[a-z0-9-]+$/.test(suffix))throw Error('Invalid retained pilot version/suffix');
const labels=[['good','Buena gestión','#226f42'],['expansive','Expansiva','#955520'],['passive','Pasiva','#6459a0'],['no-shield','Sin defensas','#a82732']];
const runs=labels.map(([strategy,label,color])=>{
 const dir=`${root}/pilot-${version}-${strategy}-sabana-712-${suffix}`,r=JSON.parse(readFileSync(dir+'/report.json')),source=JSON.parse(readFileSync(dir+'/source.json')),receipt=JSON.parse(readFileSync(dir+'/receipt.json'));
 assert.equal(receipt.status,'observed-horizon');assert.equal(r.completedNights,7);
 for(const d of r.daily)assert.equal(d.finance.reconciliationDifference,0);
 return {strategy,label,color,r,source};
});
for(const run of runs)assert.deepEqual(run.source.sourceHashes,runs[0].source.sourceHashes,'All policies must use the same frozen runtime');
const sum=(rows,read)=>rows.reduce((total,row)=>total+read(row),0);
const summary=runs.map(({strategy,label,r})=>({strategy,label,nights:r.completedNights,cash:r.money,living:r.daily.at(-1).living,destroyed:sum(r.daily,d=>d.destroyed),
 income:sum(r.daily,d=>d.finance.income),seeds:sum(r.daily,d=>d.finance.seeds),wages:sum(r.daily,d=>d.finance.wages),walls:sum(r.daily,d=>d.finance.walls),repairs:sum(r.daily,d=>d.finance.repairs),
 wallHits:sum(r.raidEvidence.raids,q=>q.wallHits),shieldContacts:sum(r.raidEvidence.raids,q=>q.shieldContacts),cropHits:sum(r.raidEvidence.raids,q=>q.cropHits),
 applications:r.agriculturalMagic.applications,additionalIncome:r.agriculturalMagic.additionalDeliveredIncome,growthSeconds:r.agriculturalMagic.executionGrowthSecondsAdded,
 humanManualActivitySeconds:r.agriculturalMagic.humanManualActivitySeconds,decisionIdleProxy:r.nativeEvidence.meaningfulActivity.unoccupiedFraction}));
const out=root+'/pilot-'+version+'-sabana-comparison';
if(existsSync(out+'.json'))throw Error('Refusing to overwrite frozen comparison');
writeFileSync(out+'.json',JSON.stringify({source:runs[0].source.sourceHashes,scope:'Seven native nights, one seed and biome. Not 100-night balance or measured human inactivity acceptance.',summary},null,2)+'\n');
writeFileSync(out+'.csv','strategy,day,cash,living,planted,delivered,destroyed,income,seeds,wages,walls,repairs,reconciliation\n'+runs.flatMap(({strategy,r})=>r.daily.map(d=>[strategy,d.day,d.money,d.living,d.planted,d.delivered,d.destroyed,d.finance.income,d.finance.seeds,d.finance.wages,d.finance.walls,d.finance.repairs,d.finance.reconciliationDifference].join(','))).join('\n')+'\n');
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="650" viewBox="0 0 960 650"><rect width="960" height="650" fill="#faf9f2"/><g font-family="sans-serif" fill="#243329"><text x="45" y="32" font-size="20">Pilotos nativos: Sabana / Mapungubwe · semilla 712 · siete noches</text>';
for(const [panel,key,title] of [[0,'money','Monedas disponibles'],[1,'living','Plantas vivas']]){
 const y=70+panel*245,h=180,w=810,x=90,max=Math.ceil(Math.max(...runs.flatMap(q=>q.r.daily.map(d=>d[key])))/50)*50;
 svg+=`<text x="45" y="${y}" font-size="17">${title}</text>`;
 for(let i=0;i<=4;i++){const py=y+25+h-i*h/4;svg+=`<path d="M${x} ${py}h${w}" stroke="#d8ded5"/><text x="45" y="${py+5}" font-size="12">${max*i/4}</text>`;}
 for(const {r,color} of runs){const points=r.daily.map(d=>`${x+(d.day-1)*w/6},${y+25+h-d[key]*h/max}`).join(' ');svg+=`<polyline fill="none" stroke="${color}" stroke-width="3" points="${points}"/>`;}
 for(let day=1;day<=7;day++)svg+=`<text x="${x+(day-1)*w/6}" y="${y+225}" font-size="12">${day}</text>`;
}
runs.forEach(({label,color},i)=>{svg+=`<rect x="${45+i*225}" y="568" width="18" height="8" fill="${color}"/><text x="${70+i*225}" y="578" font-size="14">${label}</text>`;});
svg+='<text x="45" y="615" font-size="13">Sin aceptación de campaña completa ni medición de inactividad humana. Ledger conciliado.</text></g></svg>';
writeFileSync(out+'.svg',svg+'\n');
console.log(JSON.stringify(summary));
