import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from '../tools/probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {installEnclosureRouteTree} from '../tools/experiments/enclosure-route-tree-prototype.mjs';
import {breachPortalTable} from '../tools/experiments/breach-portal-prototype.mjs';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

function ruin(s,...ids){
  for(const id of ids){const wall=s.structures.find(t=>t.id===id);wall.status='ruined';wall.hp=0;}
}
for(const [layout,breach] of [['mono',false],['closed-walls',false],['closed-walls',true]])test(`shared route tree respects native physical paths: ${layout}, breach=${breach}`,()=>{
  const {s,nav}=fixture(layout);
  if(breach){ruin(s,'wall-2-4','wall-2-5');nav.setState(s);}
  const metrics={};installEnclosureRouteTree(nav,metrics,false,true,false,true);
  const route=nav.approachPath.bind(nav);let checked=0;
  nav.approachPath=(from,to,radius,margin)=>{
    const points=route(from,to,radius,margin);
    if(points){
      let previous=from;
      for(const point of points){
        assert(nav.walkable(point.x,point.z,radius,null,false));
        assert(nav.segmentClear(previous,point,radius,null,false));
        previous=point;
      }
      assert(Math.hypot(previous.x-to.x,previous.z-to.z)<1e-5);checked++;
    }
    return points;
  };
  assert(spawnRaid(s,{group:Array(12).fill('warthog')},nav));updateRaid(s,0,nav);
  assert(checked>0);
  if(breach)assert(metrics.reused>0,'animals entering the same breach should reuse a route tree');
  const targetedCrops=s.raid.animals.filter(a=>s.plants.some(p=>p.id===a.targetId)).length;
  assert.equal(targetedCrops,breach||layout==='mono'?12:0);
});

test('breach portal categories are reused until topology changes, with native validation',()=>{
  const {s,nav}=fixture('closed-walls');
  const closed=breachPortalTable(nav);assert.equal(closed.portals.length,0);
  assert.strictEqual(breachPortalTable(nav),closed);
  ruin(s,'wall-2-4','wall-2-5');nav.setState(s);
  const breached=breachPortalTable(nav);assert.notStrictEqual(breached,closed);
  const portal=breached.portals.find(p=>p.moduleCount===2);assert(portal);
  assert.equal(portal.bySpecies.warthog.status,'passable');
  for(const edge of portal.bySpecies.warthog.crossings)assert(nav.segmentClear(edge.from,edge.to,1.1,null,false));
  assert.strictEqual(breachPortalTable(nav),breached);
});

test('corner breaches remain uncertain rather than certifying a false crossing',()=>{
  const {s,nav}=fixture('closed-walls');
  ruin(s,'wall-0-10','wall-1-0');nav.setState(s);
  const table=breachPortalTable(nav);
  assert(table.portals.some(p=>!p.straight&&p.bySpecies.warthog.status==='unknown'));
});

test('shared route decisions survive save/reload without persisting route-tree caches',()=>{
  const {s,nav}=fixture('mono');installEnclosureRouteTree(nav,{},false,true,false,true);
  assert(spawnRaid(s,{group:Array(5).fill('warthog')},nav));updateRaid(s,0,nav);
  const saved=serialize(s),copy=deserialize(saved),fresh=new Navigation(copy.seed,copy.biome,nav.profile);
  fresh.field=nav.field;fresh.propsAt=()=>[];fresh.setState(copy);fresh.setActiveBounds(nav.activeBounds);fresh.setRaidView(nav.raidView.eye,nav.raidView.target);
  installEnclosureRouteTree(fresh,{},false,true,false,true);
  for(let i=0;i<20;i++){
    Game.tick(s,.1,nav);Game.tick(copy,.1,fresh);
    assert.equal(serialize(s),serialize(copy));
  }
});

test('incremental shared tree reuses a breached approach and validates every movement segment',()=>{
  const {s,nav}=fixture('closed-walls');ruin(s,'wall-2-4','wall-2-5');nav.setState(s);
  const metrics={};installEnclosureRouteTree(nav,metrics,false,true,false,true,false,true);
  const route=nav.approachPath.bind(nav);let checked=0;
  nav.approachPath=(from,to,radius,margin)=>{
    const points=route(from,to,radius,margin);let previous=from;
    for(const point of points??[]){
      assert(nav.walkable(point.x,point.z,radius,null,false));
      assert(nav.segmentClear(previous,point,radius,null,false));previous=point;checked++;
    }
    return points;
  };
  assert(spawnRaid(s,{group:Array(12).fill('warthog')},nav));updateRaid(s,0,nav);
  assert(checked>0);assert(metrics.reused>0);assert(metrics.sharedOrigins>0);assert(metrics.portalEdges>0);
});
