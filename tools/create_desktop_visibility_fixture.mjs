import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from './experiments/spatial-campaign-opening.mjs';
import {WILD_ENGINE_WORLD_VERSION} from '../src/world/wild-engine/world-version.js';
import * as Game from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {serialize} from '../src/persistence/snapshots.js';

export async function createDesktopVisibilityFixture({biome='gran-canon'}={}){
  const opening=await createSpatialCampaignOpening({seed:712,biome,culture:'mapungubwe',slotId:'qa-desktop-visibility-712'});
  const {state:s,nav}=opening;
  s.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
  try{
    const center=s.structures[0],origin=centerServicePoint(center,s,.8);
    let planted=false;
    for(let dz=-6;dz<=6&&!planted;dz+=1.5)for(let dx=5;dx<=12&&!planted;dx+=1.5){
      const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
      if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true)){
        Game.plant(s,'desktop-visibility-seed','yuca',p.x,p.z,nav);planted=true;
      }
    }
    assert.ok(planted,'No reachable paid crop');
    Game.openInitialHiring(s);Game.hire(s,'desktop-visibility-hire',{youngFemale:1});s.tutorial.step='done';
    const pose=nativeCameraPose(nav.field,[center.x,0,center.z],0,1.18,34);
    nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
    while(!s.raid&&s.day===1&&!s.result){Game.tick(s,.1,nav);if(s.elapsed>650)throw Error('Native first raid missing');}
    assert.ok(s.raid&&!s.result);assert.ok(s.plants[0].alive&&s.plants[0].water[0].status==='manual');
    const point=[{x:center.x+15,z:center.z},{x:center.x-15,z:center.z}].find(p=>Game.previewSpell(s,'shield',p.x,p.z,nav).valid);
    assert.ok(point);Game.cast(s,'desktop-visibility-shield','shield',point.x,point.z,nav);
    assert.equal(s.ledger.balance.n,'648');assert.equal(s.cooldowns.shield,90);assert.equal(s.spells[0].remaining,20);
    Game.pause(s,'menu');
    return {slotId:s.slotId,snapshot:serialize(s),scope:'Wild Engine paid center, cassava, young woman and first raid; tutorial skipped for directed QA. No money, clock, RNG, growth, damage or magic overrides.'};
  }finally{opening.dispose();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const target=process.argv[2]??'test-results/desktop-visibility-fixture.json';mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,JSON.stringify(await createDesktopVisibilityFixture({biome:process.env.WG_FIXTURE_BIOME??'gran-canon'}),null,2)+'\n');console.log('Prepared native paid visibility fixture: '+target);
}
