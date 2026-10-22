// Three small, paid first-day visual fixtures. No ticking or campaign simulation.
import {writeFileSync} from 'node:fs';
import {createSpatialCampaignOpening} from './experiments/spatial-campaign-opening.mjs';
import {WILD_ENGINE_WORLD_VERSION} from '../src/world/wild-engine/world-version.js';
import * as Game from '../src/simulation/game.js';
import {TUTORIAL_IDS} from '../src/tutorial/messages.js';
import {serialize} from '../src/persistence/snapshots.js';
for(const [name,biome] of [['wood','sabana'],['wet','manglares'],['rocks','gran-canon']]){
 const opening=await createSpatialCampaignOpening({slotId:'microevent-catalogue-'+name,biome});
 const {s,nav}=opening,c=s.structures[0];s.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;let planted=0;
 for(let z=-7;z<=7;z+=2)for(let x=4;x<=14;x+=2){if(planted>=3)break;try{if(Game.plant(s,'qa-plant-'+planted,'mijo',c.x+x,c.z+z,nav))planted++;}catch{}}
 Game.openInitialHiring(s);Game.hire(s,'qa-hire',{olderFemale:1});
 if(name==='wood'){for(const dz of [7,11,-11,15]){try{if(Game.buildWallChain(s,'qa-wall','empalizada',[[c.x+6,c.z+dz],[c.x+12,c.z+dz]],nav,{smooth:false,snap:false}))break;}catch{}}if(!s.structures.some(e=>e.material==='empalizada'))throw Error('No legal paid wooden anchor');}
 let front=0;for(const [dx,dz] of [[4,12],[8,12],[12,8],[14,5]]){if(front>=2)break;try{if(Game.plant(s,'qa-front-'+front,'mijo',c.x+dx,c.z+dz,nav)){front++;planted++;}}catch{}}
 if(!planted)throw Error('No legal crop anchor: '+name);
 s.tutorial={step:'done',seen:[...TUTORIAL_IDS],basicSkipped:true};writeFileSync(new URL('../tests/fixtures/microevent-'+name+'.json',import.meta.url),serialize(s));
 opening.dispose();
 console.log(name+': '+planted+' paid crops; '+s.structures.length+' structures; no simulation advancement');
}
