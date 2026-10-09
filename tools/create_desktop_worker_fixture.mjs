import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {centerServicePoint} from '../src/world/centers.js';
import {serialize} from '../src/persistence/snapshots.js';

export function createDesktopWorkerFixture(){
  const {s,nav}=createOpeningWorld({seed:712,biome:'gran-canon',culture:'mapungubwe',slotId:'qa-desktop-worker-712'});
  const center=s.structures[0],origin=centerServicePoint(center,s,.8);
  let planted=false;
  for(let dz=-6;dz<=6&&!planted;dz+=1.5)for(let dx=5;dx<=12&&!planted;dx+=1.5){
    const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
    if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true)){
      Game.plant(s,'desktop-worker-seed','yuca',p.x,p.z,nav);planted=true;
    }
  }
  assert.ok(planted,'No reachable paid crop');
  Game.openInitialHiring(s);Game.hire(s,'desktop-worker-hire',{youngMale:1});s.tutorial.step='done';
  assert.equal(s.workers.length,1);assert.equal(s.workers[0].profile,'youngMale');assert.notEqual(s.workers[0].status,'home');
  Game.pause(s,'menu');
  assert.equal(s.workers.length,1);assert.equal(s.workers[0].profile,'youngMale');
  return {slotId:s.slotId,snapshot:serialize(s),workerRenderQa:{enabled:true,mode:'visual',caseIndices:[34,18]},scope:'Native paid center, reachable cassava and newly hired young male; tutorial skipped for directed QA. No money, clock, RNG, growth, damage or magic overrides.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const target=process.argv[2]??'test-results/desktop-worker-fixture.json';mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,JSON.stringify(createDesktopWorkerFixture(),null,2)+'\n');console.log('Prepared native paid worker fixture: '+target);
}
