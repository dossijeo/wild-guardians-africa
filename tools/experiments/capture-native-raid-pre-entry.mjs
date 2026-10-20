import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome,seedText,dayText,output]=process.argv.slice(2);
const seed=Number(seedText),day=Number(dayText);
if(!biome||!Number.isInteger(seed)||!Number.isInteger(day)||day<1||
  day>100||!output)throw TypeError(
  'Usage: capture-native-raid-pre-entry.mjs BIOME SEED DAY OUTPUT');

const captured=new Error('Pre-entry captured');
let opening=null;
let targetTicks=0,firstTarget=null,lastTarget=null;
try{
  await simulateNativeCampaign({days:day,seed,biome,
    strategy:'good',culture:'mapungubwe',defend:true,
    wallSpendingEnabled:true,defensePolicy:'topological',
    spatialAdvice:true,decisionProfile:true,nativeIntents:true,
    nativeWallPlans:true,reloadRaids:false,
    openingFactory:async world=>(opening=await createSpatialCampaignOpening(world)),
    onTick:(state,nav)=>{
      if(state.day===day){
        const observation={time:state.time,raid:!!state.raid,
          plan:state.nightPlan?.group?.length??0};
        firstTarget??=observation;lastTarget=observation;targetTicks++;
      }
      const plan=state.nightPlan;
      if(state.day!==day||state.raid||state.pauses.length||
        state.result||!plan?.group?.length||plan.done||
        state.time<plan.at-6)return;
      const wasmPath=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
        'src/world/wild-engine/spatial-savanna.wasm';
      const snapshot={biome,seed,day,time:state.time,
        sourceSha256:createHash('sha256').update(readFileSync(
          new URL('../native-campaign-runner.mjs',import.meta.url))).digest('hex'),
        wasmSha256:createHash('sha256').update(readFileSync(wasmPath)).digest('hex'),
        state:serialize(state),navigation:{bounds:nav.activeBounds,
          view:nav.raidView,authority:nav.navigationAuthority??null,
          residentChunks:[...(opening?.session?.stream?.loaded?.()?.keys?.()??[])]}};
      writeFileSync(output,gzipSync(Buffer.from(JSON.stringify(snapshot))));
      throw captured;
    }});
  throw Error(`Campaign ended before day ${day} pre-entry: ${JSON.stringify(
    {targetTicks,firstTarget,lastTarget})}`);
}catch(error){
  if(error!==captured)throw error;
  console.log(JSON.stringify({status:'captured',biome,seed,day,output}));
}
