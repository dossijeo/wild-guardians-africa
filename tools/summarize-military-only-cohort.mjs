import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {frozenPolicies} from './run-military-only-calibration.mjs';

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
export function observeBaselineCohort(root){
 const read=path=>existsSync(path)?JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')):null;
 const cases=[];
 for(const site of frozenPolicies.initialSites)for(const profile of Object.keys(frozenPolicies.profiles))for(const seed of frozenPolicies.matchedSeeds){
  const directory=profile==='good'&&seed===123&&site.biome==='sabana'?frozenPolicies.baselineCampaign:`military-baseline-v1-${profile}-${site.biome}-${seed}`;
  const path=resolve(root,directory),receipt=read(resolve(path,'receipt.json')),report=read(resolve(path,'report.json')),progress=read(resolve(path,'progress.json'));
  // Progress is a file observation, not independent confirmation of a live PID.
  cases.push({profile,seed,...site,directory,status:classifyMilitaryCase(receipt,report),nativeResult:report?.result??null,completedNights:report?.completedNights??null,lastRecordedProgress:progress??null,finalMoney:report?.money??null});
 }
 return {observedAt:new Date().toISOString(),policyFreeze:frozenPolicies.id,cases,profiles:summarizeMilitaryCases(cases),scope:'Only terminal native reports enter the win-rate denominator. Progress files do not prove a live process. Small screening cohorts cannot certify target population win rates; no configuration accepted automatically.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [root,out,...extra]=process.argv.slice(2);
 if(!root||!out||extra.length)throw Error('Use ROOT NEW_REPORT.json');
 if(existsSync(out))throw Error('Refusing to overwrite evidence');
 writeFileSync(out,JSON.stringify(observeBaselineCohort(root),null,2)+'\n');
}
