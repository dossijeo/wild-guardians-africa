// Read-only quantity counterfactual, never a campaign simulation or win claim.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {raidAnimalCount,raidRecoveryAnimalCount,raidPressureCandidateForVersion} from '../src/simulation/raid-pressure-budget.js';
export function analyzeRaidRecoveryResponse(report){
 const rows=report?.raidEvidence?.raids;
 if(!Array.isArray(rows)||!rows.length)throw Error('Native raid evidence required');
 const original=raidPressureCandidateForVersion(3),recovery=raidPressureCandidateForVersion(4);
 return rows.map(row=>{
  const f=row.pressureFacts;
  if(!f||f.candidateVersion!==3)throw Error('Only original candidate-3 observations are comparable');
  const baselineCount=raidAnimalCount(f.night,f.pressure,original);
  if(f.targetAnimals!==baselineCount||row.actors?.length!==baselineCount)throw Error('Original planned and observed quantities must match');
  const recoveryCount=raidRecoveryAnimalCount(f.night,f.pressure,f.observedValue,recovery);
  return {night:f.night,currentValue:f.observedValue,historicalEffectiveValue:f.effectiveValue,pressure:f.pressure,
   originalAnimals:baselineCount,counterfactualRecoveryAnimals:recoveryCount,
   exposedLiving:row.exposedLivingAtSpawn,originalDestroyed:row.cropsDestroyed,
   originalPotentialHp:row.potentialAgriculturalHp,originalEffectiveHp:row.effectiveAgriculturalHp,
   quantityRatio:recoveryCount/baselineCount};
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,out,...extra]=process.argv.slice(2);
 if(!input||!out||extra.length||existsSync(out))throw Error('Use ORIGINAL_REPORT.json NEW_ANALYSIS.json');
 const bytes=readFileSync(input),report=JSON.parse(bytes);
 const result={sourceReportSha256:createHash('sha256').update(bytes).digest('hex'),sourceResult:report.result,sourceCompletedNights:report.completedNights,
  scope:'Original observed losses and quantities; candidate-4 counts are a mathematical counterfactual only. New RNG, species allocation, routes, physical losses and survival require a native matched campaign. No economic or strategic parameters modified.',rows:analyzeRaidRecoveryResponse(report)};
 writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}
