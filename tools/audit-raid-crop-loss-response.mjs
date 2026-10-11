import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {raidRecoveryAnimalCount,raidAnimalCount} from '../src/simulation/raid-pressure-budget.js';
const [input,output]=process.argv.slice(2);
if(!input||!output||existsSync(output))throw Error('Provide original REPORT.json and a new output file');
const raw=readFileSync(input),report=JSON.parse(raw),raids=report.raidEvidence.raids;
const rows=raids.map(r=>{
 const f=r.pressureFacts;
 return {night:r.day,currentValue:f.observedValue,effectiveValue:f.effectiveValue,pressure:f.pressure,exposedLiving:r.exposedLivingAtSpawn,originalAnimals:f.targetAnimals,baseRecipeAnimals:raidAnimalCount(r.day,f.pressure),candidateAnimals:raidRecoveryAnimalCount(r.day,f.pressure,f.observedValue),actualDestroyed:r.cropsDestroyed};
});
writeFileSync(output,JSON.stringify({originalSha256:createHash('sha256').update(raw).digest('hex'),candidate:4,quantityFormula:'max(1, round(original count * current value / (current value + 1000)))',rows,scope:'Counterfactual plan counts at original recorded states only. Not a rerun, survival proof or predicted damage. Future RNG, farm states and economy will diverge in a native campaign.'},null,2)+'\n');
