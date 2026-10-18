import {readFileSync,writeFileSync} from 'node:fs';

const [controlPath,candidatePath,outputPath]=process.argv.slice(2);
if(!controlPath||!candidatePath||!outputPath)
  throw Error('Usage: node write-balance-pair-ledger.mjs control.json candidate.json output.csv');
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const control=load(controlPath),candidate=load(candidatePath);
for(const key of ['source'])if(control[key]!==candidate[key])
  throw Error(`Mismatched ${key}`);
for(const key of ['wasm','game','raids','runner'])
  if(control.inputHashes[key]!==candidate.inputHashes[key])
    throw Error(`Mismatched ${key} input`);
for(const key of ['biome','seed','strategy','defensePolicy'])
  if(control.parameters[key]!==candidate.parameters[key])
    throw Error(`Mismatched ${key} parameter`);
if(control.raidEvidence?.status!=='verified'||candidate.raidEvidence?.status!=='verified'||
  control.raidEvidence.issues.length||candidate.raidEvidence.issues.length)
  throw Error('Both arms require verified raids with zero evidence issues');

const header=['day','arm','living','coins','raidCropsDestroyed','animalsGenerated',
  'wallHits','centerHits','income','wages','seeds','wallPurchases','repairs',
  'gameTickMs','decisionMs'];
const rows=[header.join(',')];
const raidFor=(report,day)=>report.raidEvidence.raids.filter(raid=>raid.day===day);
const sum=(items,key)=>items.reduce((total,item)=>total+(Number(item[key])||0),0);
for(let day=1;day<=Math.max(control.rows.length,candidate.rows.length);day++)
  for(const [arm,report] of [['control',control],['candidate',candidate]]){
    const row=report.rows.find(item=>item.day===day);
    if(!row)continue;
    const raids=raidFor(report,day);
    rows.push([day,arm,row.living,row.money,sum(raids,'cropsDestroyed'),
      raids.reduce((total,raid)=>total+Object.values(raid.species??{})
        .reduce((n,species)=>n+(species.generated??0),0),0),
      sum(raids,'wallHits'),sum(raids,'centerHits'),
      row.finance.income,row.finance.wages,row.finance.seeds,
      row.finance.walls,row.finance.repairs,
      row.wallTime.gameTickMs,row.wallTime.decisionMs].join(','));
  }
writeFileSync(outputPath,rows.join('\n')+'\n');
