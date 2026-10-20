import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {centerServicePoint} from '../../src/world/centers.js';
import {WILD_ENGINE_WORLD_VERSION} from '../../src/world/wild-engine/world-version.js';
import * as Game from '../../src/simulation/game.js';
import {serialize} from '../../src/persistence/snapshots.js';

const output=process.argv[2]??'test-results/browser-visibility-current-fixture.json';
const opening=await createSpatialCampaignOpening({seed:712,slotId:'qa-visibility-current'});
const {state:s,nav}=opening;
s.wildEngineWorldVersion=WILD_ENGINE_WORLD_VERSION;
try{
const center=s.structures[0],departure=centerServicePoint(center,s,.8);
let plot=null;
for(let dz=-9;dz<=9&&!plot;dz+=1.5)for(let dx=4.5;dx<=15&&!plot;dx+=1.5){
  const x=Math.round((center.x+dx)/1.5)*1.5,z=Math.round((center.z+dz)/1.5)*1.5;
  if(nav.placement(x,z,.4).valid&&nav.path(departure,{x,z},.28,null,true)&&nav.path({x,z},departure,.28,null,true))plot={x,z};
}
if(!plot)throw new Error('No legal, reachable crop plot for visibility QA');
Game.plant(s,'visibility-crop','mijo',plot.x,plot.z,nav);
Game.openInitialHiring(s);
Game.hire(s,'visibility-hire',{olderFemale:1});
s.tutorial.step='done';s.tutorial.basicSkipped=true;
Game.tick(s,3,nav);
if(s.pauses.length||s.plants.length!==1||!s.plants[0].alive||
  s.workers.length!==1||s.workers[0].status!=='walking')
  throw new Error('Visibility fixture is not an active farm');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,serialize(s)+'\n');
console.log(JSON.stringify({output,slotId:s.slotId,elapsed:s.elapsed,workerStatus:s.workers[0].status,cropId:s.plants[0].id}));
}finally{opening.dispose();}
