import {CROP_HIT_POINTS} from '../src/simulation/crop-impact-health.js';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync,appendFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {serialize} from '../src/persistence/snapshots.js';
import {simulateNativeCampaign} from './native-campaign-runner.mjs';
import {PROFILES} from '../src/simulation/workforce.js';
import {wallSpec} from '../src/simulation/rules.js';
import {BIOME_IDS} from '../src/world/navigation.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {NATIVE_CAMPAIGN_PROTOCOL,nativeCampaignStrategy,campaignProtocolForLabour} from './native-campaign-protocol.mjs';
export function parseNativeCampaignArgs(args){
 const allowed=new Set(['out','days','seed','strategy','biome','culture','stop-file','stop-cash','stop-min-day','labour-policy','defense-policy','defense-start-day','defense-material','crop-policy','profile','plot-fluid-clearance','repair-policy','defense-funding','defense-piece-reserve','perimeter-qa','gate-animation-invariant']),o={days:7,seed:712,strategy:'good',biome:'sabana',culture:'mapungubwe',profile:'olderFemale'};
 for(let i=0;i<args.length;i+=2){const k=args[i]?.replace(/^--/,'');if(!allowed.has(k)||args[i+1]===undefined)throw Error('Use --out DIR --days 1..180 --seed INTEGER --strategy expansive|good|bad|no-walls|no-shield --biome NAME --culture NAME');o[k]=args[i+1];}
 for(const k of ['days','seed'])o[k]=Number(o[k]);
 if(!Number.isSafeInteger(o.days)||o.days<1||o.days>180||!Number.isSafeInteger(o.seed)||o.seed<0)throw Error('Invalid native days/seed');
 if(!Object.hasOwn(BIOME_IDS,o.biome))throw Error('Unknown native biome: '+o.biome);
 if(!PROFILES.some(p=>p.id===o.profile))throw Error('Unknown native worker profile');
 o.plotFluidClearance=Number(o['plot-fluid-clearance']??0);delete o['plot-fluid-clearance'];if(!Number.isFinite(o.plotFluidClearance)||o.plotFluidClearance<0||o.plotFluidClearance>3)throw Error('Invalid plot fluid clearance');
 if(o['stop-cash']!==undefined||o['stop-min-day']!==undefined){
  o['stop-cash']=Number(o['stop-cash']);o['stop-min-day']=Number(o['stop-min-day']);
  if(!Number.isSafeInteger(o['stop-cash'])||o['stop-cash']<1||!Number.isSafeInteger(o['stop-min-day'])||o['stop-min-day']<1)throw Error('Cash calibration stop requires positive --stop-cash and --stop-min-day');
 }
 if(o['stop-file'])o['stop-file']=resolve(o['stop-file']);
 o.labourPolicy=o['labour-policy']??'legacy';delete o['labour-policy'];campaignProtocolForLabour(o.labourPolicy);
 o.cropPolicy=o['crop-policy']??'legacy';delete o['crop-policy'];if(!['legacy','cashflow'].includes(o.cropPolicy))throw Error('Unknown crop policy');
 o.defensePolicy=o['defense-policy']??'expanding';delete o['defense-policy'];if(!['legacy','expanding','closed','funded','routed','shore'].includes(o.defensePolicy))throw Error('Unknown defense policy');
 o.defenseMaterial=o['defense-material']??'zarzas';delete o['defense-material'];wallSpec(o.defenseMaterial);
 if(o.defenseMaterial!=='zarzas'&&!['funded','routed','shore'].includes(o.defensePolicy))throw Error('Explicit defense material requires funded/routed/shore policy');
 o.defenseStartDay=Number(o['defense-start-day']??1);delete o['defense-start-day'];if(!Number.isSafeInteger(o.defenseStartDay)||o.defenseStartDay<1||o.defenseStartDay!==1&&!['closed','funded','routed','shore'].includes(o.defensePolicy))throw Error('Explicit defense start requires closed/funded/routed policy and positive integer day');
 o.repairPolicy=o['repair-policy']??'legacy';delete o['repair-policy'];if(!['legacy','breach-first'].includes(o.repairPolicy)||o.repairPolicy!=='legacy'&&!['funded','routed','shore'].includes(o.defensePolicy))throw Error('Unsupported native repair policy');
 o.defenseFunding=o['defense-funding']??'contour';delete o['defense-funding'];if(!['contour','rolling'].includes(o.defenseFunding)||o.defenseFunding==='rolling'&&!['funded','routed','shore'].includes(o.defensePolicy))throw Error('Unsupported defense funding choice');
 o.defensePieceReserve=Number(o['defense-piece-reserve']??0);delete o['defense-piece-reserve'];if(![0,1].includes(o.defensePieceReserve)||o.defensePieceReserve&&o.defenseFunding!=='rolling')throw Error('Invalid rolling piece reserve');
 o.perimeterQa=o['perimeter-qa']??'legacy';delete o['perimeter-qa'];if(!['legacy','incremental-v3','worker-first-v4','stable-plan-v5'].includes(o.perimeterQa))throw Error('Unknown perimeter QA candidate');
 const invariant=o['gate-animation-invariant']??'false';delete o['gate-animation-invariant'];if(!['true','false'].includes(invariant))throw Error('Gate phase invariant must be true or false');o.gateAnimationInvariant=invariant==='true';if(o.gateAnimationInvariant&&o.perimeterQa!=='stable-plan-v5')throw Error('Gate phase invariant requires stable-plan-v5 QA');
 nativeCampaignStrategy(o.strategy);if(!o.out)throw Error('Explicit output directory required');o.out=resolve(o.out);return o;
}
export function calibrationStop(reason){const error=Error(reason);error.code='NATIVE_CALIBRATION_STOP';return error;}
export function nativeCampaignProvenance(options){
 const p=intensiveRunProvenance(options),root=new URL('../',import.meta.url);
 for(const path of ['content/balance/raid_pressure_candidate.json','content/balance/player_revisions.json'])p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
 const paths=['src/simulation/crop-impact-health.js','src/simulation/agricultural-power.js','tools/native-agricultural-magic.mjs','tools/native-campaign-runner.mjs','tools/native-campaign-protocol.mjs','tools/native-q4-labour-policy.mjs','tools/native-q5-labour-policy.mjs','tools/native-q6-labour-policy.mjs','tools/native-campaign-finance.mjs','tools/native-campaign-evidence.mjs','tools/repair-settlement-evidence.mjs','tools/native-raid-campaign-evidence.mjs','tools/native-campaign-entry-driver.mjs','tools/native-campaign-expansion.mjs','tools/native-campaign-plots.mjs','tools/native-expanding-defense-policy.mjs','tools/node-raid-entry-transport.mjs','tools/node-raid-entry-worker.mjs','tools/run_native_campaign.mjs'];
 paths.push('tools/native-closed-defense-policy.mjs','tools/native-funded-defense-policy.mjs','tools/native-obstacle-aware-contour.mjs','tools/native-perimeter-proof.mjs','tools/native-q7-labour-policy.mjs','tools/native-q8-labour-policy.mjs');
 paths.push('tools/native-campaign-crop-policy.mjs','tools/native-shore-defense-contour.mjs','tools/native-service-component-proof.mjs');
 paths.push('tools/native-repair-funding.mjs');
 paths.push('tools/native-q9-labour-policy.mjs','tools/native-q10-labour-policy.mjs','tools/native-q12-labour-policy.mjs');
 paths.push('tools/native-q13-labour-policy.mjs');
 paths.push('tools/native-q14-labour-policy.mjs');
 paths.push('tools/native-q15-labour-policy.mjs');
 paths.push('tools/native-integrated-perimeter-proof.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/native-reused-service-component-proof-v2.mjs','tools/native-interior-attack-anchor.mjs','tools/native-worker-service-proof-v2.mjs','tools/terrain-lattice-tile-candidate.mjs');
 paths.push('tools/native-worker-service-proof-v3.mjs','tools/static-animal-certificate-cache.mjs','src/world/worker-wall-overlap-recovery.js','tools/native-proof-failure-details.mjs');
 paths.push('tools/proof-geometry-signature-candidate.mjs','tools/native-stable-plan-perimeter-proof.mjs','tools/stable-prospective-wall-plan-candidate.mjs');
 for(const path of paths)p.sourceHashes[path]=createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex');
 return {...p,protocol:{...campaignProtocolForLabour(options.labourPolicy),profile:options.profile??'olderFemale',plotFluidClearance:options.plotFluidClearance??0,defenseMaterial:options.defenseMaterial??'zarzas',repairPolicy:options.repairPolicy??'legacy',defenseFunding:options.defenseFunding??'contour',defensePieceReserve:options.defensePieceReserve??0,perimeterQa:options.perimeterQa??'legacy',gateAnimationInvariant:options.gateAnimationInvariant??false,cropHitPoints:CROP_HIT_POINTS}};
}
export async function runNativeCampaignCase(options,{run=simulateNativeCampaign,provenance=nativeCampaignProvenance}={}){
 const out=options.out;if(existsSync(out)&&readdirSync(out).length)throw Error('Refusing to overwrite original campaign evidence');mkdirSync(out,{recursive:true});
 const save=(name,value)=>writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n');
 const inputs=provenance(options);save('source.json',inputs);save('protocol.json',{...campaignProtocolForLabour(options.labourPolicy),profile:options.profile??'olderFemale',plotFluidClearance:options.plotFluidClearance??0,defenseMaterial:options.defenseMaterial??'zarzas',repairPolicy:options.repairPolicy??'legacy',defenseFunding:options.defenseFunding??'contour',defensePieceReserve:options.defensePieceReserve??0,perimeterQa:options.perimeterQa??'legacy',gateAnimationInvariant:options.gateAnimationInvariant??false,cropHitPoints:CROP_HIT_POINTS});
 const progressStarted=Date.now();let progressLast=0;
 save('receipt.json',{status:'running',options,startedAt:inputs.startedAt,processId:process.pid});
 try{
  if(inputs.trackedChanges.length)throw Error('Freeze tracked runtime before launching native pilot');
  const r=await run({...options,slotId:`native-${options.strategy}-${options.seed}`,
   onTick:s=>{if(options['stop-file']&&existsSync(options['stop-file']))throw calibrationStop('Requested calibration stop file detected');
    const now=Date.now();if(s&&now-progressLast>=5000){progressLast=now;save('progress.json',{observedAt:new Date(now).toISOString(),processId:process.pid,day:s.day,time:s.time,elapsed:s.elapsed,living:s.plants.filter(p=>p.alive).length,workers:s.workers.length,wallMilliseconds:now-progressStarted,result:s.result});}
   },
   onDay:row=>{
    appendFileSync(resolve(out,'days.jsonl'),JSON.stringify(row)+'\n');
    if(options['stop-cash']!==undefined&&row.day>=options['stop-min-day']&&row.money>=options['stop-cash'])throw calibrationStop(`Calibration cash ceiling ${options['stop-cash']} reached on day ${row.day}`);
   }});
  const {state,nav,...report}=r;writeFileSync(resolve(out,'state.json.gz'),gzipSync(Buffer.from(serialize(state))));save('report.json',report);
  const observedDefeat=r.result&&r.result!=='victory';
  const receipt={status:observedDefeat?'observed-native-defeat':'observed-horizon',result:r.result,completedNights:r.completedNights,finishedAt:new Date().toISOString(),meaningfulActivity:r.nativeEvidence?.meaningfulActivity??null,scope:'Native observed result; harness completion is not activity, protection or 100-night acceptance'};save('receipt.json',receipt);return {exitCode:observedDefeat?2:0,receipt};
 }catch(error){
  const partial=error.nativeCampaignPartial??null;
  if(partial?.state)writeFileSync(resolve(out,'partial-state.json.gz'),gzipSync(Buffer.from(partial.state)));
  save('partial.json',partial?{...partial,state:undefined}:null);
  const stopped=error.code==='NATIVE_CALIBRATION_STOP';
  const receipt={status:stopped?'stopped-early-calibration':'incomplete-harness-error',message:error.message,stack:error.stack,finishedAt:new Date().toISOString(),nativeResult:partial?.result??null,completedDailyRows:partial?.receipts?.daily?.length??null,scope:stopped?'Calibration stopped cooperatively; retained partial evidence is not defeat or completed horizon':'Transport/deadline/tool error is not invented game defeat; no rerun performed'};save('receipt.json',receipt);return {exitCode:stopped?3:1,receipt};
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await runNativeCampaignCase(parseNativeCampaignArgs(process.argv.slice(2)));console.log(JSON.stringify(r.receipt));process.exitCode=r.exitCode;}catch(e){console.error(e.stack);process.exitCode=1;}
}
