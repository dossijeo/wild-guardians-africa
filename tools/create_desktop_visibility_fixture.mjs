import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {serialize} from '../src/persistence/snapshots.js';
import {createHash} from 'node:crypto';
import {skyNight} from '../src/rendering/sky.js';

export function createDesktopVisibilityFixture({seed=712,biome='gran-canon',culture='mapungubwe',slotId='qa-desktop-visibility-712',provenance=false}={}){
  if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295||!Game.BIOMES.includes(biome)||!Game.CULTURES.includes(culture)||typeof slotId!=='string'||!slotId||typeof provenance!=='boolean')throw Error('Invalid native fixture selection');
  const {s,nav}=createOpeningWorld({seed,biome,culture,slotId});
  const commands=[{operation:'createOpeningWorld/placeStructure',seed,biome,culture}];
  const center=s.structures[0],origin=centerServicePoint(center,s,.8);
  let planted=false;
  for(let dz=-6;dz<=6&&!planted;dz+=1.5)for(let dx=5;dx<=12&&!planted;dx+=1.5){
    const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
    if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true)){
      Game.plant(s,'desktop-visibility-seed','yuca',p.x,p.z,nav);commands.push({operation:'Game.plant',species:'yuca',x:p.x,z:p.z});planted=true;
    }
  }
  assert.ok(planted,'No reachable paid crop');
  Game.openInitialHiring(s);Game.hire(s,'desktop-visibility-hire',{youngFemale:1});s.tutorial.step='done';commands.push({operation:'Game.openInitialHiring/Game.hire',selection:{youngFemale:1}},{operation:'directed tutorial presentation bypass',scope:'unchanged original fixture bypass'});
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],0,1.18,34);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  let ticks=0;while(!s.raid&&s.day===1&&!s.result){Game.tick(s,.1,nav);ticks++;if(s.elapsed>650)throw Error('Native first raid missing');}
  commands.push({operation:'Game.tick',seconds:.1,count:ticks});assert.ok(s.raid&&!s.result);assert.ok(s.plants[0].alive&&s.plants[0].water[0].status==='manual');
  const point=[{x:center.x+15,z:center.z},{x:center.x-15,z:center.z}].find(p=>Game.previewSpell(s,'shield',p.x,p.z,nav).valid);
  assert.ok(point);Game.cast(s,'desktop-visibility-shield','shield',point.x,point.z,nav);commands.push({operation:'Game.cast',spell:'shield',x:point.x,z:point.z});
  assert.equal(s.ledger.balance.n,'648');assert.equal(s.cooldowns.shield,90);assert.equal(s.spells[0].remaining,20);
  Game.pause(s,'menu');
  const fixture={slotId:s.slotId,snapshot:serialize(s),scope:'Native paid center, cassava, young woman and first raid; tutorial skipped for directed QA. No money, clock, RNG, growth, damage or magic overrides.'};
  if(provenance){
    assert.ok(skyNight(s)>=.99,'First raid fixture must genuinely be night');
    fixture.provenance={seed:s.seed,biome:s.biome,culture:s.culture,day:s.day,time:s.time,elapsed:s.elapsed,skyNight:skyNight(s),snapshotSha256:createHash('sha256').update(fixture.snapshot).digest('hex'),snapshotBytes:Buffer.byteLength(fixture.snapshot),commands:[...commands,{operation:'Game.pause',reason:'menu'}],scope:'Legal paid first-raid night; original active raid/shield requirements retained. No seed retry or state overrides.'};
  }
  return fixture;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const target=process.argv[2]??'test-results/desktop-visibility-fixture.json';mkdirSync(dirname(target),{recursive:true});
  const args=process.argv.slice(3),options={};
  if(args.length){options.provenance=true;const allowed=new Map([['--seed','seed'],['--biome','biome'],['--culture','culture'],['--slot-id','slotId']]);for(let i=0;i<args.length;i+=2){const key=allowed.get(args[i]);if(!key||options[key]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid fixture arguments');options[key]=key==='seed'?Number(args[i+1]):args[i+1];}}
  writeFileSync(target,JSON.stringify(createDesktopVisibilityFixture(options),null,2)+'\n');console.log('Prepared native paid visibility fixture: '+target);
}
