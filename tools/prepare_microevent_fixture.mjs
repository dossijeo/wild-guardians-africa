// Visual QA only: ordinary paid commands; never campaign/balance evidence.
import {writeFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from './experiments/spatial-campaign-opening.mjs';
import {WILD_ENGINE_WORLD_VERSION} from '../src/world/wild-engine/world-version.js';
import * as Game from '../src/simulation/game.js';
import {TUTORIAL_IDS} from '../src/tutorial/messages.js';
import {serialize} from '../src/persistence/snapshots.js';
const opening=await createSpatialCampaignOpening({slotId:'microevent-visual-qa'});
const {s,nav}=opening,c=s.structures[0];s.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;let planted=0;
for(let z=-7;z<=7;z+=2)for(let x=4;x<=12;x+=2){if(planted>=3)break;try{if(Game.plant(s,'qa-plant-'+planted,'platano',c.x+x,c.z+z,nav))planted++;}catch{}}
Game.openInitialHiring(s);Game.hire(s,'qa-hire',{olderFemale:1});s.tutorial={step:'done',seen:[...TUTORIAL_IDS],basicSkipped:true};
writeFileSync(new URL('../tests/fixtures/microevent-world.json',import.meta.url),serialize(s));
opening.dispose();
console.log(`Visual fixture: ${planted} paid banana crops, one paid worker; no economic credit.`);
