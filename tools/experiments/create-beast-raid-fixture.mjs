import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import * as Game from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
const species=process.argv[2]??'rhino',biome=process.argv[3]??'sabana';
assert(['warthog','hyena','buffalo','lion','rhino'].includes(species));
const group=(process.env.WG_BEAST_GROUP??species).split(','),fixtureId=process.env.WG_BEAST_FIXTURE_ID??species;
assert(group.length>0&&group.length<=16&&group.every(s=>['warthog','hyena','buffalo','lion','rhino'].includes(s)));
assert(/^[a-z0-9-]+$/.test(fixtureId));
const opening=await createSpatialCampaignOpening({seed:712,biome,culture:'mapungubwe',slotId:'beast-integration-'+fixtureId});
try {
 const {state,nav,start}=opening;state.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
 const crop=start.farm[0];Game.plant(state,'qa-paid-crop','mijo',crop.x,crop.z,nav);Game.openInitialHiring(state);Game.hire(state,'qa-paid-worker',{olderFemale:1});state.tutorial.step='done';
 while(state.time<310&&!state.raid&&!state.result)Game.tick(state,.1,nav);
 assert(!state.raid&&!state.result);state.nightPlan={at:state.time+2,group,done:false};
 Game.pause(state,'menu');
 await mkdir('docs/qa/beast-integration-20261025/fixtures',{recursive:true});
 await writeFile('docs/qa/beast-integration-20261025/fixtures/'+fixtureId+'.json',JSON.stringify({slotId:state.slotId,group,snapshot:serialize(state),scope:'Native WASM terrain and paid opening, natural clock advance. QA controls only next raid group/time for reproducible camera and shield review; no free money, invulnerability or animation overrides. A controlled group is not a claim about typical campaign composition.'},null,2));
 console.log(species,state.time,state.ledger.balance);
}finally{opening.dispose();}
