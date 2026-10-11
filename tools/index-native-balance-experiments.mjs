// Retained terminal evidence only. Does not run a campaign or infer causality.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
const [prefix,...directories]=process.argv.slice(2);
if(!prefix||!directories.length||['.json','.md'].some(s=>existsSync(prefix+s)))throw Error('Fresh index prefix and terminal campaign directories required');
const sha=x=>createHash('sha256').update(x).digest('hex');
const rows=directories.map(directory=>{
 const read=name=>JSON.parse(readFileSync(directory+'/'+name));
 const receipt=read('receipt.json'),report=read('report.json'),source=read('source.json');
 assert(['observed-horizon','observed-native-defeat'].includes(receipt.status),'No running or technical-failure campaign can become terminal economic evidence');
 assert.equal(receipt.completedNights,report.completedNights);
 const totals={income:0,wages:0,seeds:0,walls:0,repairs:0};
 for(const d of report.daily){assert.equal(d.finance.reconciliationDifference,0);for(const k of Object.keys(totals))totals[k]+=d.finance[k];}
 const hashes=Object.entries(source.sourceHashes).sort(([a],[b])=>a.localeCompare(b));
 const native=hashes.filter(([p])=>p.startsWith('src/')||p.startsWith('content/'));
 return {case:basename(directory),directory,receiptStatus:receipt.status,result:report.result,sourceHead:source.gitHead,
  frozenSourceDigest:sha(JSON.stringify(hashes)),nativeAndContentDigest:sha(JSON.stringify(native)),
  seed:report.seed,biome:report.biome,culture:report.culture,strategy:report.strategy,labourPolicy:report.labourPolicy,
  agriculturalMagic:report.agriculturalMagic.mode,magicCadenceSeconds:report.agriculturalMagic.cadenceSeconds,
  cropHitPoints:report.protocol.cropHitPoints,policy:report.policy,
  defenseFunding:report.policy.defenseFunding??'contour',newWallFraction:report.defense?.discretionaryNewWallFraction??1,
  survivedNights:report.completedNights,terminalDay:report.daily.at(-1).day,money:report.money,living:report.daily.at(-1).living,
  destroyed:report.daily.reduce((s,d)=>s+d.destroyed,0),totals,
  manualHumanActivityMeasured:report.activity.humanManualTimeMeasured,
  scope:'Observed native terminal outcome. Ledger equality and frozen hashes alone do not approve balance, causality or human activity.'};
});
writeFileSync(prefix+'.json',JSON.stringify({scope:'Selected retained experiments, not an exhaustive acceptance matrix. All parameters refer to each original report and frozen manifest; no current prices are substituted into historical evidence.',rows},null,2)+'\n');
const lines=['# Retained balance experiments','',
 'This index reads original terminal reports. A native defeat is preserved as an outcome, without automatically attributing it to difficulty rather than player policy. Survived nights exclude an unfinished terminal attack. Source digests distinguish QA revisions from native/content revisions.','',
 '| Case | Strategy | Labour | Agricultural magic | Defense start | Funding | Survived | Final day | Result | Coins | Live crops |',
 '|---|---|---|---|---:|---|---:|---:|---|---:|---:|'];
for(const r of rows)lines.push(`| [${r.case.split('-').slice(0,2).join('-')}](${r.case}/report.json) | ${r.strategy} | ${r.labourPolicy} | ${r.agriculturalMagic} | ${r.policy.defenseStartDay} | ${r.defenseFunding} | ${r.survivedNights} | ${r.terminalDay} | ${r.result??'horizon only'} | ${r.money} | ${r.living} |`);
lines.push('','## Paid native economy','','| Case | Delivered income | Wages | Seeds | Walls | Repairs | Crops destroyed |','|---|---:|---:|---:|---:|---:|---:|');
for(const r of rows)lines.push(`| ${r.case.split('-').slice(0,2).join('-')} | ${r.totals.income} | ${r.totals.wages} | ${r.totals.seeds} | ${r.totals.walls} | ${r.totals.repairs} | ${r.destroyed} |`);
lines.push('','The JSON companion preserves exact policy settings, seed, biome, culture, magic cadence, wall allocation and source digests. No listed pilot establishes 100-night survival, 180-day postgame expansion or measured human inactivity. Separate native source, census, contract and settlement audits remain necessary.','');
writeFileSync(prefix+'.md',lines.join('\n'));
console.log(JSON.stringify({terminalExperiments:rows.length,nativeAndContentVersions:new Set(rows.map(r=>r.nativeAndContentDigest)).size}));
