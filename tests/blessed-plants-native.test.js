import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialCampaignOpening} from '../tools/experiments/spatial-campaign-opening.mjs';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import * as Game from '../src/simulation/game.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {centerServicePoint} from '../src/world/centers.js';

test('Wild Engine worker leases release a blessed target and deliver a real neighboring crop with a single bonus',async()=>{
  const opening=await createSpatialCampaignOpening({seed:712,slotId:'blessing-native'});
  const {s,nav,session}=opening;let planner,stopTasks,stopWorld;
  try{
    const center=s.structures[0],departure=centerServicePoint(center,s,.8);let sites;
    // Prescribed QA layout, not a claim of autonomous policy or campaign balance.
    for(let dz=-9;dz<=9&&!sites;dz+=1.5)for(let dx=4.5;dx<=15&&!sites;dx+=1.5){
      const p={x:center.x+dx,z:center.z+dz},q={x:p.x+1.5,z:p.z};
      if(nav.placement(p.x,p.z,.4).valid&&nav.placement(q.x,q.z,.4).valid&&
        nav.path(departure,p,.28,null,true)&&nav.path(departure,q,.28,null,true))sites=[p,q];
    }
    assert.ok(sites,'native terrain must provide two real reachable neighboring sites');
    Game.plant(s,'source','mijo',sites[0].x,sites[0].z,nav);
    Game.plant(s,'neighbor','mijo',sites[1].x,sites[1].z,nav);
    const source=s.plants[0],neighbor=s.plants[1];
    planner=createEventDrivenTaskPlanner(session);planner.resetFromState(s);
    stopTasks=planner.observeTasks(s);stopWorld=planner.observeWorld(s);nav.intentTaskPlanner=planner;
    Game.openInitialHiring(s);Game.hire(s,'hire',{youngFemale:1});
    for(let i=0;i<800&&!s.tasks.some(t=>t.targetId===source.id&&t.workerId);i++)Game.tick(s,.1,nav);
    assert.ok(s.tasks.some(t=>t.targetId===source.id&&t.workerId),'source initially receives a real native worker lease');
    awakeningState(s).progress=100;assert.equal(Game.bless(s,'bless-native',source.id),true);
    assert.ok(!s.tasks.some(t=>t.targetId===source.id));
    const before=numberOf(s.ledger.balance);
    while(s.time<290&&!s.result&&!s.pauses.length)Game.tick(s,.2,nav);
    assert.ok(source.alive);assert.ok(!s.tasks.some(t=>t.targetId===source.id));
    assert.ok(!s.crates.some(c=>c.sourcePlantId===source.id));
    const crate=s.crates.find(c=>c.sourcePlantId===neighbor.id);
    assert.ok(crate?.delivered,'the normal crop must still be watered, picked, carried and sold');
    assert.equal(numberOf(crate.blessingBonus),2);assert.equal(numberOf(s.ledger.entries['deliver:'+crate.id]),13);
    assert.equal(numberOf(s.ledger.balance),before+13);
    const saved=serialize(s);assert.equal(serialize(deserialize(saved)),saved);
  }finally{stopTasks?.();stopWorld?.();delete nav.intentTaskPlanner;planner?.dispose?.();await opening.dispose();}
});
