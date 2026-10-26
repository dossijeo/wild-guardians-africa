import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import * as Game from '../../src/simulation/game.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
const biome=process.env.WG_MAGIC_BIOME??'sabana',network=process.env.WG_NETWORK_VARIANT==='8';
const opening=await createSpatialCampaignOpening({seed:712,biome,culture:'mapungubwe',slotId:network?'estuary-agriculture-render-qa':'agriculture-render-qa',mangroveNetwork:network});
try{
 const {state,nav,start}=opening;state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
 for(const [i,p] of start.farm.slice(0,4).entries())Game.plant(state,`qa-paid-crop-${i}`,'mijo',p.x,p.z,nav);
 Game.openInitialHiring(state);Game.hire(state,'qa-paid-worker',{olderFemale:1});
 // Controlled progression fixture, not a claim of a naturally played campaign.
 state.day=5;state.completedNights=4;state.initialPreparation=false;state.tutorial.step='done';state.time=100;state.dayPlan={done:true};state.nightPlan={done:true};
 const probe=deserialize(serialize(state));
 for(const [i,p] of probe.plants.entries())assert(Game.cast(probe,`verify-${i}`,i%2?'multiply':'growth',p.x,p.z,nav,p.id));
 Game.pause(state,'menu');
 const out=process.env.WG_MAGIC_FIXTURE_OUT??'docs/qa/mangrove-magic-20261026/agriculture';await mkdir(out,{recursive:true});
 await writeFile(out+'/fixture.json',JSON.stringify({slotId:state.slotId,snapshot:serialize(state),scope:'Native paid opening and four paid living millet plants; QA advances progression to day5 and daytime100 for unlocked agricultural magic. No spell applied before renderer loads. Not a campaign progression test.'},null,2));
 console.log(JSON.stringify({plants:state.plants.length,day:state.day,time:state.time}));
}finally{opening.dispose();}
