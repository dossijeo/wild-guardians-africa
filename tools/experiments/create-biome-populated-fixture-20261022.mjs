import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import * as Game from '../../src/simulation/game.js';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const biome=process.env.WG_FIXTURE_BIOME??'sabana';
const out=`docs/qa/global-visual-lab/${biome}-populated-frozen-20261022`;
const o=await createSpatialCampaignOpening({seed:712,biome,culture:'mapungubwe',slotId:'opening'});
try {
 const {state:s,nav}=o; s.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
 const center=s.structures[0],origin=centerServicePoint(center,s,.8);
 let count=0;
 for(let dz=-9;dz<=9&&count<12;dz+=1.5)for(let dx=4.5;dx<=15&&count<12;dx+=1.5){
  const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
  if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true)){
   assert.ok(Game.plant(s,'closure-plant-'+count,'mijo',p.x,p.z,nav));count++;
  }
 }
 assert.equal(count,12);Game.openInitialHiring(s);Game.hire(s,'closure-hire',{olderFemale:2});s.tutorial.step='done';
 for(let i=0;i<1200;i++)Game.tick(s,.1,nav);
 assert.ok(s.elapsed>=119);assert.equal(s.workers.length,2);Game.pause(s,'menu');
 const snapshot=serialize(s);deserialize(snapshot);
 const record={timing:{navigationContext:{state:snapshot}},living:s.plants.filter(p=>p.alive).length,workers:s.workers.length,scope:'Current Wild Engine opening; 12 paid millet crops and two paid workers; 120 seconds ordinary simulation. Tutorial skipped for directed QA. No money, growth, RNG or terrain overrides.',worldVersion:s.wildEngineWorldVersion};
 await mkdir(out,{recursive:true});await writeFile(out+'/native-fixture.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({living:record.living,workers:record.workers,time:s.time,elapsed:s.elapsed}));
}finally{o.dispose()}
