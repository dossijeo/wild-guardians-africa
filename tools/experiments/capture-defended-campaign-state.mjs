import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome='manglares',seedText='712',dayText='40',output]=process.argv.slice(2);
const seed=Number(seedText),day=Number(dayText);
if(!output||!Number.isSafeInteger(seed)||!Number.isSafeInteger(day)||day<1||day>100)
  throw Error('Usage: capture-defended-campaign-state.mjs BIOME SEED DAY OUTPUT.json.gz');

class Captured extends Error {}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const source={
  runnerSha256:sha256(readFileSync(new URL('../native-campaign-runner.mjs',import.meta.url))),
  wasmSha256:sha256(readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)))
};
mkdirSync(dirname(resolve(output)),{recursive:true});
try{
  await simulateNativeCampaign({days:day,seed,biome,strategy:'good',culture:'mapungubwe',
    defend:true,wallSpendingEnabled:true,defensePolicy:'topological',spatialAdvice:true,
    nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
    openingFactory:createSpatialCampaignOpening,
    onDay:row=>console.log(JSON.stringify({day:row.day,living:row.living,
      gameTickMs:row.wallTime.gameTickMs,decisionMs:row.wallTime.decisionMs})),
    onTick:state=>{
      if(state.day!==day||state.time<180||state.result)return;
      const snapshot=serialize(state);
      writeFileSync(output,gzipSync(snapshot,{level:9}));
      console.log(JSON.stringify({capture:output,day:state.day,time:state.time,
        living:state.plants.filter(plant=>plant.alive).length,
        plants:state.plants.length,workers:state.workers.length,
        structures:state.structures.length,sha256:sha256(snapshot),source}));
      throw new Captured();
    }});
  throw Error(`Campaign ended before day ${day} could be captured`);
}catch(error){
  if(!(error instanceof Captured))throw error;
}
