// Diagnostic reference geometry, never a replacement for native damage.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

export function referenceOverkill(raid,hp){
 assert(raid.ended,'Only completed native incursions');
 assert(Number.isFinite(hp)&&hp>0);
 const envelope=raid.pressureFacts?.referenceEnvelope;
 if(!envelope)return {day:raid.day,excluded:'No pressure reference envelope (introductory mechanics)'};
 assert.equal(raid.pressureFacts.candidateVersion,3,'Unknown reference recipe');
 let raw=0,clamped=0;
 const species=envelope.rows.filter(row=>row.count>0).map(row=>{
  const s=raid.species[row.id];assert(s);assert.equal(s.generated,row.count);
  const peripheral=(row.area-1)/.5;
  assert(Number.isSafeInteger(peripheral)&&peripheral>=0,'Unexpected weighted reference area');
  const perHitRaw=row.cropDamage*row.area;
  const perHitClamped=Math.min(hp,row.cropDamage)+peripheral*Math.min(hp,row.cropDamage*.5);
  const rawForce=s.initialHitBudget*perHitRaw,healthyReferenceHp=s.initialHitBudget*perHitClamped;
  raw+=rawForce;clamped+=healthyReferenceHp;
  return {species:row.id,assignedHits:s.initialHitBudget,referencePeripheralPlants:peripheral,rawForce,healthyReferenceHp};
 });
 assert.equal(raw,raid.potentialAgriculturalHp,'Raw native reference mismatch');
 assert(clamped<=raw,'Clamping cannot increase force');
 return {day:raid.day,species,rawForce:raw,healthyReferenceHp:clamped,referenceOverkill:raw-clamped,
  observedEffectiveHp:raid.effectiveAgriculturalHp,observedPlantsDestroyed:raid.cropsDestroyed,
  rawEfficiency:raw?raid.effectiveAgriculturalHp/raw:null,
  healthyReferenceRatio:clamped?raid.effectiveAgriculturalHp/clamped:null};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [directory,output]=process.argv.slice(2);assert(directory&&output);
 const input=readFileSync(join(directory,'partial.json'));
 const source=JSON.parse(readFileSync(join(directory,'source.json')));
 for(const file of ['src/simulation/crop-impact-health.js','src/simulation/balance.js','src/simulation/raid-pressure-budget.js']){
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),source.sourceHashes[file],'Recorded mechanics must match diagnostic source');
 }
 const {BALANCE}=await import('../src/simulation/balance.js');
 const raids=JSON.parse(input).receipts.raidEvidence.raids.filter(raid=>raid.ended);
 const result={scope:'Archived native strikes with a secondary healthy reference lattice diagnostic',
  inputSha256:createHash('sha256').update(input).digest('hex'),healthyCropHp:BALANCE.raids.crop_hit_points,
  caveats:['Reference plants are hypothetical; actual positions, occlusion and wounds are not recomputed.',
   'Ratios are diagnostic, not a causal estimate of defense or route efficiency.',
   'No native pressure budget, raid, damage, income or campaign source is modified.'],
  formula:'H * (min(HP,D) + k * min(HP,0.5*D)), k=(recordedArea-1)/0.5',
  raids:raids.map(raid=>referenceOverkill(raid,BALANCE.raids.crop_hit_points))};
 writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(result.raids.map(({day,rawForce,healthyReferenceHp,referenceOverkill,excluded})=>({day,rawForce,healthyReferenceHp,referenceOverkill,excluded}))));
}
