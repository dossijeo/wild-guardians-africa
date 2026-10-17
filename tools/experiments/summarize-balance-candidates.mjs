import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [output,...inputs]=process.argv.slice(2);
if(!output||!inputs.length)throw Error('Usage: node summarize-balance-candidates.mjs output.csv report.json ...');
const fields=['candidate','biome','seed','night','crops','cash','workers','income','wages','seeds','newWalls','repairs','animals','cropsDestroyed','wallHpLost','verifiedRaid'];
const lines=[fields.join(',')];
for(const input of inputs){
 const report=JSON.parse(readFileSync(resolve(input),'utf8'));
 if(!report.balanceCandidate||!Array.isArray(report.rows))throw Error('Missing balance campaign data: '+input);
 const raids=new Map();
 for(const raid of report.raidEvidence?.raids??[]){
  const prior=raids.get(raid.day)??{animals:0,cropsDestroyed:0,wallHpLost:0};
  prior.animals+=raid.actors?.length??0;
  prior.cropsDestroyed+=raid.cropsDestroyed??0;
  prior.wallHpLost+=raid.wallHpLost??0;
  raids.set(raid.day,prior);
 }
 for(const row of report.rows){
  const raid=raids.get(row.day)??{animals:0,cropsDestroyed:0,wallHpLost:0};
  const data={candidate:report.balanceCandidate.id,biome:report.parameters.biome,
   seed:report.parameters.seed,night:row.day,crops:row.living,cash:row.money,
   workers:row.staff,income:row.finance.income,wages:row.finance.wages,
   seeds:row.finance.seeds,newWalls:row.finance.walls,repairs:row.finance.repairs,
   ...raid,verifiedRaid:report.raidEvidence?.status==='verified'&&
    !report.raidEvidence.issues?.length};
  lines.push(fields.map(field=>data[field]).join(','));
 }
}
writeFileSync(resolve(output),lines.join('\n')+'\n');
