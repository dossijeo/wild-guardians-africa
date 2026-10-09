// Read-only diagnostics of frozen campaign reports and their actual snapshots.
// No simulation, re-seeding, strategy changes or balance overrides.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,basename} from 'node:path';

const [output,...directories]=process.argv.slice(2);
assert.ok(output&&directories.length,'Usage: OUTPUT.json AUDITED_CASE_DIRECTORY...');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=(directory,suffix)=>{
 const files=readdirSync(directory).filter(file=>file.endsWith(suffix));
 assert.equal(files.length,1,`Expected one ${suffix} in ${directory}`);
 const bytes=gunzipSync(readFileSync(join(directory,files[0])));
 return {file:files[0],sha256:sha(bytes),data:JSON.parse(bytes)};
};
const cases=directories.map(directory=>{
 const report=read(directory,'-report.json.gz'),snapshot=read(directory,'-state.json.gz');
 const verification=JSON.parse(readFileSync(join(directory,'root-verification.json'),'utf8'));
 assert.equal(verification.status,'verified');
 const r=report.data,s=snapshot.data;
 assert.equal(r.provenance.gitHead,verification.recordedHead);
 assert.equal(s.completedNights,r.completedNights);
 assert.equal(s.result,r.result);
 assert.equal(r.daily.length,100);
 const living=s.plants.filter(p=>p.alive),firstWaterPending=living.filter(p=>p.water[0].status==='due');
 // The strategy plants one initial seed before day 1's counter starts. Native
 // plants are append-only, and each daily count is a CropPlaced event delta.
 assert.equal(s.plants.length,1+r.daily.reduce((n,row)=>n+row.planted,0));
 const plantedDay=new Map([[s.plants[0].id,1]]);let cursor=1;
 for(const row of r.daily)for(let i=0;i<row.planted;i++)plantedDay.set(s.plants[cursor++].id,row.day);
 const pendingAgeDays=firstWaterPending.map(p=>s.day-plantedDay.get(p.id));
 const center=s.structures.find(c=>c.kind==='center');assert.ok(center);
 const bySpecies=Object.fromEntries([...new Set(living.map(p=>p.species))].sort().map(id=>{
  const plants=living.filter(p=>p.species===id);
  return [id,{living:plants.length,firstWaterPending:plants.filter(p=>p.water[0].status==='due').length,
   zeroGrowth:plants.filter(p=>p.growth===0).length,harvestRequested:plants.filter(p=>p.harvestRequested).length,
   laterWaterPending:plants.filter(p=>p.water[0].status!=='due'&&p.water.some(w=>w.status==='due')).length}];
 }));
 const taskKinds={};for(const t of s.tasks)taskKinds[t.kind]=(taskKinds[t.kind]??0)+1;
 const bands=Array.from({length:5},(_,i)=>{
  const rows=r.daily.slice(i*20,i*20+20);
  const total=key=>rows.reduce((a,b)=>a+b[key],0);
  const idle=key=>rows.reduce((a,b)=>a+b.idle[key],0);
  return {firstDay:rows[0].day,lastDay:rows.at(-1).day,meanStaff:total('staff')/20,
   meanLiving:total('living')/20,meanDelivered:total('delivered')/20,
   meanPlanted:total('planted')/20,deliveredPerWorkerDay:total('delivered')/total('staff'),
   idle:{budget:idle('budget'),space:idle('space'),shiftEnd:idle('shift-end')},
   openingCashAfterHiring:rows[0].before,closingCash:rows.at(-1).money};
 });
 return {case:basename(directory),source:verification.recordedHead,
  files:{report:{file:report.file,sha256:report.sha256},snapshot:{file:snapshot.file,sha256:snapshot.sha256}},
  policy:r.policy,activity:r.activity,plots:r.plots,maximumLiving:r.maximumLiving,
  final:{day:s.day,time:s.time,living:living.length,firstWaterPending:firstWaterPending.length,
   firstWaterPendingAgeDays:{maximum:Math.max(0,...pendingAgeDays),
    atLeast5:pendingAgeDays.filter(v=>v>=5).length,atLeast20:pendingAgeDays.filter(v=>v>=20).length,
    atLeast50:pendingAgeDays.filter(v=>v>=50).length},
   firstWaterPendingFraction:firstWaterPending.length/living.length,taskKinds,bySpecies},bands};
});
writeFileSync(output,JSON.stringify({scope:'Frozen 100-night capacity diagnostics. A final snapshot cannot prove daytime worker utilization, reachability, or the cause of delayed watering. No candidate acceptance or current-source replay.',cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(c=>({case:c.case,source:c.source,plots:c.plots,
 finalFirstWaterPending:c.final.firstWaterPendingFraction,bands:c.bands.map(b=>({firstDay:b.firstDay,deliveredPerWorkerDay:b.deliveredPerWorkerDay,idle:b.idle}))})),null,2));
