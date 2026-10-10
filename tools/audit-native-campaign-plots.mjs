import {createOpeningWorld} from './check_opening.mjs';
import {createNativeCampaignPlots} from './native-campaign-plots.mjs';
import * as Game from '../src/simulation/game.js';
import {numberOf} from '../src/simulation/money.js';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
export function auditCampaignPlots({biome='sabana',culture='mapungubwe',seed=712,target=60,maxDecisions=500}={}){
 for(const n of [target,maxDecisions])if(!Number.isSafeInteger(n)||n<1)throw Error('Positive integer audit limits required');
 const began=performance.now(),{s,nav}=createOpeningWorld({biome,culture,seed,slotId:'plot-audit-'+biome}),plots=createNativeCampaignPlots(nav,()=>s),cashAfterCenter=numberOf(s.ledger.balance);let attempts=0,paid=0;
 try{
  while(paid<target&&attempts++<maxDecisions){
   const point=plots.choose();if(!point)continue;
   if(!Game.plant(s,'plot-'+paid,'mijo',point.x,point.z,nav))throw Error('Native planting command rejected selected plot');paid++;
   if(paid===1){Game.openInitialHiring(s);Game.hire(s,'plot-hire',{olderFemale:1});}
  }
  return {biome,culture,seed,requested:target,paid,attempts,cashAfterCenter,cash:numberOf(s.ledger.balance),seedCoins:s.plants.length*5,wages:30,acceptedPlants:s.plants.map(p=>({id:p.id,species:p.species,centerId:p.centerId,x:p.x,z:p.z})),elapsed:s.elapsed,diagnosticWallMilliseconds:performance.now()-began,plots:plots.report(),reason:plots.reason(),status:paid===target?'placement-verified':'incomplete',scope:'Real original terrain, normal paid Game.plant and legal outward/return paths. No simulation ticks: not proof of worker throughput, daily activity, 60 daily completed tasks or campaign survival.'};
 }catch(error){return {biome,culture,seed,requested:target,paid,attempts,cashAfterCenter,cash:numberOf(s.ledger.balance),diagnosticWallMilliseconds:performance.now()-began,status:'error',error:error.stack,plots:plots.report(),scope:'Partial native placement diagnostic; no fabricated income or simulation advancement'};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const out=process.argv[2];mkdirSync(out,{recursive:true});const rows=[];
 const sourceHashes=Object.fromEntries(['tools/audit-native-campaign-plots.mjs','tools/native-campaign-plots.mjs','tools/check_opening.mjs','src/simulation/game.js','src/simulation/balance.js','src/world/navigation.js'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 for(const biome of Game.BIOMES){const row=auditCampaignPlots({biome});rows.push(row);writeFileSync(out+'/native-plot-audit.json',JSON.stringify({sourceHashes,rows},null,2)+String.fromCharCode(10));console.log(JSON.stringify(row));}
 if(rows.some(r=>r.status!=='placement-verified'))process.exitCode=1;
}
