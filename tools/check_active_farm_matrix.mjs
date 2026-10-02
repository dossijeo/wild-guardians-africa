// All requested worlds use the same legal strategy, including failures in the report.
import {writeFileSync} from 'node:fs';
import {simulateActiveFarm} from './check_active_farm.mjs';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
const seed=Number(process.argv[2]??712),rows=[];
for(const biome of BIOMES)for(const culture of CULTURES){
  console.log(JSON.stringify({phase:'start',biome,culture,seed}));
  try{
    const {state,nav,daily,...report}=simulateActiveFarm({biome,culture,seed,diversifyDay:20});
    rows.push({...report,operatingDays:daily.filter(d=>d.day>=5&&d.delivered>0).length});
  }catch(error){rows.push({biome,culture,seed,error:error.message});}
  console.log(JSON.stringify(rows.at(-1)));
  writeFileSync(new URL(`../test-results/active-farm-matrix-${seed}.json`,import.meta.url),JSON.stringify({seed,rows},null,2)+'\n');
}
const crops=['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'];
const passed=rows.filter(r=>r.result==='victory'&&r.completedNights===100&&r.operatingDays===96&&crops.every(id=>r.deliveries[id]>0));
console.log(JSON.stringify({passed:passed.length,total:rows.length,seed}));
if(passed.length!==rows.length)process.exitCode=1;
