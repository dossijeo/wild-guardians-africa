import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocation} from '../src/world/villages.js';
import * as Game from '../src/simulation/game.js';
import {isMature} from '../src/simulation/crops.js';
import {numberOf} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/content/${name}.json`,import.meta.url),'utf8'));
const villages=read('villages');
for(const biome of Game.BIOMES)for(const culture of Game.CULTURES)test(`${biome}/${culture}: real terrain sowing, watering, maturity, crate and settlement`,()=>{
  const nav=new Navigation(712,biome,read('biome-'+BIOME_IDS[biome]).profile);
  const payload=villages.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
  const location=findInitialLocation(nav,payload),s=Game.newGame({seed:712,biome,culture,slotId:'vertical'});
  Object.assign(s.villages[0],location);s.suppressed.push(...location.suppress);nav.setState(s);
  Game.resume(s,'intro');s.tutorial.step='center';
  Game.placeStructure(s,'center',{x:location.center.x,z:location.center.z},nav);
  const center=s.structures[0],departure={x:center.x+3.4,z:center.z},delivery={x:center.x+3.2,z:center.z};
  let plot=null;
  for(let dz=-6;dz<=6&&!plot;dz+=1.5)for(let dx=5;dx<=12;dx+=1.5){
    const point={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
    if(nav.placement(point.x,point.z,.4).valid&&nav.path(departure,point,.28,center.id,true)&&nav.path(point,delivery,.28,center.id,true)){plot=point;break;}
  }
  assert.ok(plot,'At least one legal crop plot must be reachable in both directions');
  Game.plant(s,'seed','mijo',plot.x,plot.z,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
  const p=s.plants[0];assert.equal(p.growth,0);assert.equal(numberOf(s.ledger.balance),95);
  while(s.time<240&&!isMature(p))Game.tick(s,.5,nav);
  assert.ok(isMature(p),`Crop must mature during the work shift: ${JSON.stringify({time:s.time,growth:p.growth,water:p.water,worker:s.workers[0]})}`);
  assert.ok(p.water.every(w=>w.status==='manual'));
  Game.harvest(s,'harvest',p.id);assert.equal(numberOf(s.ledger.balance),95);
  while(s.time<250&&!s.crates.length)Game.tick(s,.1,nav);
  assert.equal(s.crates.length,1);assert.equal(numberOf(s.ledger.balance),95,'Picking must not pay before physical delivery');
  const loaded=deserialize(serialize(s));nav.setState(loaded);
  while(loaded.time<299&&!loaded.crates[0].delivered)Game.tick(loaded,.5,nav);
  assert.ok(loaded.crates[0].delivered,'A carried crate must reach the real center after reloading');
  assert.equal(numberOf(loaded.ledger.balance),106);Game.tick(loaded,1,nav);assert.equal(numberOf(loaded.ledger.balance),106);
});
