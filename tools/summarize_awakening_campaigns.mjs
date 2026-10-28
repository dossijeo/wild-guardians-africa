// Derive compact, auditable comparisons without changing a campaign or its outcome.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,basename} from 'node:path';
import {gunzipSync} from 'node:zlib';

const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length)throw Error('Usage: node tools/summarize_awakening_campaigns.mjs output.json campaign.json ...');
const sum=(rows,key)=>rows.reduce((n,row)=>n+(row[key]??0),0);
const finance=rows=>Object.fromEntries(['income','refunds','wages','seeds','walls','centers','villages','repairs','otherCredits','otherDebits','net'].map(k=>[k,sum(rows.map(r=>r.finance),k)]));
const campaigns=inputs.map(path=>{
 const bytes=readFileSync(path);
 const r=JSON.parse((path.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8'));
 if(r.status==='complete'&&r.campaign?.policy?.profile!=='olderFemale')throw Error(`Unsupported wage normalization: ${path}`);
 const raids=r.campaign?.raidEvidence?.raids??[];
 const totals=finance(r.daily);
 const last=r.daily.at(-1);
 const paidWorkerDays=totals.wages/30;
 const terminal=last?{day:last.day,money:last.money,living:last.living,sources:last.sources,destroyedBlessings:last.destroyed,walls:last.walls,centerHp:last.centerHp}:null;
 return {file:basename(path),status:r.status,arm:r.arm,biome:r.biome,culture:r.culture,seed:r.seed,
  completedNights:r.completedNights,result:r.result??null,provenance:r.provenance,
  totals,terminal,checkpoints:r.checkpoints,
  chargesEarned:r.campaign?.counts?.AwakeningReady??null,blessingsApplied:r.casts.length,
  chargeNights:r.daily.filter(x=>x.awakening?.before<100&&x.awakening?.after===100).map(x=>x.day),
  casts:r.casts.map(({day,time,targetId,kind})=>({day,time,targetId,kind})),losses:r.losses,
  averageDailyEarned:r.averageEarned??null,passiveDeliveredCoins:r.passiveDeliveredCoins,sourceValue:r.sourceValue,
  averageDailyNetProgress:r.daily.length?r.daily.reduce((n,x)=>n+(x.awakening?.delta??0),0)/r.daily.length:0,
  decisions:r.decisions,raidEvidenceStatus:r.campaign?.raidEvidence?.status??null,
  cropsLostToRaids:sum(raids,'cropsDestroyed'),wallHpLost:sum(raids,'wallHpLost'),
  paidWorkerDays,deliveredCrates:r.deliveredCrates,
  cratesPerPaidWorkerDay:paidWorkerDays?r.deliveredCrates/paidWorkerDays:0,
  incomePerPaidWorkerDay:paidWorkerDays?totals.income/paidWorkerDays:0,
  lateRaids:raids.filter(x=>x.day>=75).map(x=>({day:x.day,cropsDestroyed:x.cropsDestroyed,wallHpLost:x.wallHpLost,centerHits:x.centerHits,pressure:x.pressureFacts?.pressure,animals:x.pressureFacts?.targetAnimals})),
  daily:r.daily.map(x=>({day:x.day,...x.finance,delivered:x.delivered,living:x.living,sources:x.sources,destroyedBlessings:x.destroyed,progress:x.progress,earned:x.awakening?.earned??0,cropsLostToRaids:sum(raids.filter(a=>a.day===x.day),'cropsDestroyed')}))};
});
const comparisons=[];
for(const r of campaigns.filter(r=>r.arm!=='baseline'&&r.status==='complete')){
 const baseline=campaigns.find(b=>b.arm==='baseline'&&b.status==='complete'&&b.biome===r.biome&&b.culture===r.culture&&b.seed===r.seed);
 if(!baseline)continue;
 const nights=Math.min(r.completedNights,baseline.completedNights);
 const prefix=x=>x.daily.filter(d=>d.day<=nights);
 const a=prefix(r),b=prefix(baseline);
 const metrics=rows=>Object.fromEntries(['income','wages','seeds','repairs','net','cropsLostToRaids'].map(k=>[k,sum(rows,k)]));
 const actual=metrics(a),control=metrics(b);
 comparisons.push({arm:r.arm,baseline:baseline.file,file:r.file,nights,actual,control,difference:Object.fromEntries(Object.keys(actual).map(k=>[k,actual[k]-control[k]]))});
}
writeFileSync(resolve(output),JSON.stringify({scope:'Native ordinary-command campaigns. Partial runs are explicitly incomplete; no inferred nights after defeat.',
 caveats:[
  'Paid worker days = wages / 30 for the olderFemale campaign profile; this is wage-equivalent labour, not measured productive work time.',
  'Direct passive coins are settled CrateDelivered bonuses. Per-source shared attribution divides overlapping bonuses equally; it is not marginal causal value.',
  'Campaign differences include placement, defense choices and subsequent raid trajectories; they are not pure causal monetary values of individual blessings.',
  'Crops lost use native raid evidence: the campaign snapshot field destroyed tracks cumulative destroyed blessings, not daily crop losses.',
  'Ready charges and applied blessings differ when the final dawn banks a charge. A 100-night victory label alone does not establish a healthy farm.'
 ],campaigns,comparisons},null,2)+'\n');
console.log(JSON.stringify({output:resolve(output),campaigns:campaigns.map(r=>({arm:r.arm,biome:r.biome,status:r.status,nights:r.completedNights})),comparisons:comparisons.length}));
