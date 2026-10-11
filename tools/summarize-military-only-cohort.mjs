import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {frozenPolicies,frozenMilitaryOptions} from './run-military-only-calibration.mjs';

export function frozenMilitaryIdentityIssues(profile,site,receipt,report,source,referenceHashes){
 const expected=frozenMilitaryOptions(profile,{...site,out:'.cache-identity-only'}),issues=[];
 // Native reports serialize the seed as canonical decimal text; launch
 // provenance stores the numeric seed. Accept those two representations
 // without coercing arbitrary or malformed strings into the expected seed.
 if(report?.seed!==expected.seed&&report?.seed!==String(expected.seed))issues.push('report.seed');
 for(const key of ['biome','culture','strategy','labourPolicy'])if(report?.[key]!==expected[key])issues.push('report.'+key);
 for(const key of ['profile','cropPolicy','defensePolicy','defenseStartDay','defenseMaterial','repairPolicy','defenseFunding','defensePieceReserve','reserveMaintenance']){
  if(report?.policy?.[key]!==expected[key])issues.push('report.policy.'+key);
 }
 // The final native receipt replaces the running receipt and omits options.
 // The immutable launch provenance remains the evidence of requested scope.
 if(source?.arguments?.days!==100)issues.push('source.arguments.days');
 if(receipt?.options&&receipt.options.days!==100)issues.push('receipt.options.days');
 if(source?.arguments?.perimeterQa!==expected.perimeterQa)issues.push('source.arguments.perimeterQa');
 if(source?.protocol?.cropHitPoints!==1)issues.push('source.protocol.cropHitPoints');
 for(const [path,hash] of Object.entries(referenceHashes??{}))if(source?.sourceHashes?.[path]!==hash)issues.push('frozen-source:'+path);
 if(!referenceHashes||!Object.keys(referenceHashes).length)issues.push('missing-frozen-source-reference');
 return issues;
}

export function classifyMilitaryCase(receipt,report){
 if(!receipt)return 'not-started';
 if(receipt.status==='running')return 'running';
 if(receipt.status==='observed-native-defeat'&&report?.result&&report.result!=='victory')return 'native-defeat';
 if(receipt.status==='observed-horizon'&&report?.completedNights>=100&&(!report.result||report.result==='victory'))return 'survived-100';
 return 'incomplete-review-required';
}
export function wilsonInterval(wins,total){
 if(!Number.isSafeInteger(wins)||!Number.isSafeInteger(total)||wins<0||total<wins)throw Error('Invalid sample');
 if(!total)return null;
 const z=1.959963984540054,p=wins/total,den=1+z*z/total;
 const center=(p+z*z/(2*total))/den;
 const half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
 return [Math.max(0,center-half),Math.min(1,center+half)];
}
export function summarizeMilitaryCases(cases){
 return Object.fromEntries(Object.keys(frozenPolicies.profiles).map(profile=>{
  const rows=cases.filter(c=>c.profile===profile),wins=rows.filter(c=>c.status==='survived-100').length,losses=rows.filter(c=>c.status==='native-defeat').length,total=wins+losses;
  return [profile,{planned:rows.length,wins,nativeDefeats:losses,completed:total,unresolved:rows.length-total,winRate:total?wins/total:null,wilson95: wilsonInterval(wins,total),target:frozenPolicies.targets[profile],accepted:false}];
 }));
}
export function auditNativeMilitaryCase(directory){
 try{
  const stdout=execFileSync(process.execPath,[fileURLToPath(new URL('./audit-native-terminal-campaigns.mjs',import.meta.url)),resolve(directory)],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const facts=JSON.parse(stdout).cases;
  if(facts.length!==1)throw Error('Expected exactly one audited case');
  return {status:'verified',facts:facts[0]};
 }catch(error){
  return {status:'failed',message:String(error.stderr??error.message).slice(0,2000)};
 }
}
export function observeBaselineCohort(root){
 const read=path=>existsSync(path)?JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')):null;
 const reference=read(resolve(root,frozenPolicies.baselineCampaign,'source.json'));
 const cases=[];
 for(const site of frozenPolicies.initialSites)for(const profile of Object.keys(frozenPolicies.profiles))for(const seed of frozenPolicies.matchedSeeds){
  const directory=profile==='good'&&seed===123&&site.biome==='sabana'?frozenPolicies.baselineCampaign:`military-baseline-v1-${profile}-${site.biome}-${seed}`;
  const path=resolve(root,directory),receipt=read(resolve(path,'receipt.json')),report=read(resolve(path,'report.json')),progress=read(resolve(path,'progress.json')),source=read(resolve(path,'source.json'));
  let identityIssues=[];
  let status=classifyMilitaryCase(receipt,report),terminalAudit=null;
  if(['native-defeat','survived-100'].includes(status)){
   terminalAudit=auditNativeMilitaryCase(path);
   identityIssues=frozenMilitaryIdentityIssues(profile,{seed,...site},receipt,report,source,reference?.sourceHashes);
   if(terminalAudit.status!=='verified'||identityIssues.length)status='incomplete-review-required';
  }
  // Progress is a file observation, not independent confirmation of a live PID.
  cases.push({profile,seed,...site,directory,status,terminalAudit,identityIssues,nativeResult:report?.result??null,completedNights:report?.completedNights??null,lastRecordedProgress:progress??null,finalMoney:report?.money??null});
 }
 return {observedAt:new Date().toISOString(),policyFreeze:frozenPolicies.id,cases,profiles:summarizeMilitaryCases(cases),scope:'Only terminal native reports passing snapshot, ledger, physical-delivery and strike audits enter the win-rate denominator. Progress files do not prove a live process. Small screening cohorts cannot certify target population win rates; no configuration accepted automatically. Each case is audited separately; common frozen runtime hashes are independently enforced by the launch provenance.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [root,out,...extra]=process.argv.slice(2);
 if(!root||!out||extra.length)throw Error('Use ROOT NEW_REPORT.json');
 if(existsSync(out))throw Error('Refusing to overwrite evidence');
 writeFileSync(out,JSON.stringify(observeBaselineCohort(root),null,2)+'\n');
}
