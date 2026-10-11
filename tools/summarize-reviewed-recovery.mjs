// Read-only analysis. Reference and recovery results never share denominators.
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {reviewedRecoveryOptions,verifyReviewedRecoverySources} from './run-reviewed-recovery-comparison.mjs';
import {frozenPolicies} from './run-military-only-calibration.mjs';
import {frozenMilitaryIdentityIssues,classifyMilitaryCase,summarizeMilitaryCases,auditNativeMilitaryCase} from './summarize-military-only-cohort.mjs';
const reviewBytes=readFileSync(new URL('../docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz',import.meta.url));
const review=JSON.parse(gunzipSync(reviewBytes));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function reviewedRecoveryIdentityIssues(caseInfo,receipt,report,source){
 const {profile,seed,biome,culture,arm}=caseInfo,issues=[];
 try{
  if(!['reference','recovery'].includes(arm))throw Error('Unknown comparison arm');
  const expectedOptions=reviewedRecoveryOptions(profile,{seed,biome,culture,out:source?.arguments?.out});
  if(!isDeepStrictEqual(source.arguments,expectedOptions))issues.push('frozen-launch-options');
  const inventory=Object.fromEntries(Object.keys(review.current.sourceHashes).map(path=>[path,source?.sourceHashes?.[path]]));
  const detected=verifyReviewedRecoverySources(inventory);
  if(detected.arm!==arm)issues.push('declared-arm');
  if(source.comparison?.arm!==detected.arm||source.comparison?.militaryCandidate!==detected.militaryCandidate)issues.push('source.comparison.recipe');
  if(source.comparison?.playerProfile!==profile)issues.push('source.comparison.playerProfile');
  if(source.comparison?.policyFreeze!==frozenPolicies.id)issues.push('source.comparison.policyFreeze');
  if(source.comparison?.reviewSha256!==hash(reviewBytes))issues.push('source.comparison.reviewSha256');
  const extraPaths=['tools/run-reviewed-recovery-comparison.mjs','tools/run-military-only-calibration.mjs','docs/qa/integrated-spiritual-survival/military-only-policy-freeze-v1.json'];
  if(Object.keys(source.sourceHashes).some(path=>!Object.hasOwn(inventory,path)&&!extraPaths.includes(path)))issues.push('unexpected-dependency');
  for(const path of extraPaths)if(source.sourceHashes[path]!==hash(readFileSync(new URL('../'+path,import.meta.url))))issues.push('comparison-dependency:'+path);
  issues.push(...frozenMilitaryIdentityIssues(profile,{seed,biome,culture},receipt,report,source,inventory));
  if(report?.protocol?.gateAnimationInvariant!==true)issues.push('report.protocol.gateAnimationInvariant');
 }catch(error){issues.push('reviewed-source:'+error.message);}
 return issues;
}
export function summarizeReviewedRecoveryCases(cases){
 return Object.fromEntries(['reference','recovery'].map(arm=>[arm,summarizeMilitaryCases(cases.filter(row=>row.arm===arm))]));
}
export function observeReviewedRecoveryCases(descriptors){
 const read=path=>existsSync(path)?JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')):null;
 const cases=descriptors.map(info=>{
  if(!['reference','recovery'].includes(info.arm))throw Error('Explicit reference/recovery arm required');
  reviewedRecoveryOptions(info.profile,{...info,out:info.directory});
  const directory=resolve(info.directory),receipt=read(resolve(directory,'receipt.json')),report=read(resolve(directory,'report.json'));
  let status=classifyMilitaryCase(receipt,report),identityIssues=[],terminalAudit=null;
  if(['native-defeat','survived-100'].includes(status)){
   identityIssues=reviewedRecoveryIdentityIssues(info,receipt,report,read(resolve(directory,'source.json')));
   terminalAudit=auditNativeMilitaryCase(directory);
   if(identityIssues.length||terminalAudit.status!=='verified')status='incomplete-review-required';
  }
  return {...info,directory,status,identityIssues,terminalAudit,nativeResult:report?.result??null,completedNights:report?.completedNights??null,lastRecordedProgress:read(resolve(directory,'progress.json'))};
 });
 return {observedAt:new Date().toISOString(),cases,arms:summarizeReviewedRecoveryCases(cases),scope:'Only independently audited terminal native outcomes enter each arm denominator. Files marked running do not confirm a live PID. Small cohorts do not approve population win-rate targets.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [descriptors,out,...extra]=process.argv.slice(2);
 if(!descriptors||!out||extra.length||existsSync(out))throw Error('Use CASES.json NEW_REPORT.json');
 writeFileSync(out,JSON.stringify(observeReviewedRecoveryCases(JSON.parse(readFileSync(descriptors,'utf8'))),null,2)+'\n',{flag:'wx'});
}
