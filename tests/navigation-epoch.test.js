import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
test('Fresh navigation restores the saved route epoch without changing the snapshot; genuine mutations invalidate paths',()=>{
 const s=Game.newGame({seed:19,slotId:'epoch'}),n=new Navigation(19,'sabana',{});n.setState(s);n.setState(s);n.setState(s);
 assert.equal(s.navigationVersion,3);const before=serialize(s),loaded=deserialize(before),fresh=new Navigation(19,'sabana',{});fresh.setState(loaded);
 assert.equal(fresh.version,3);assert.equal(serialize(loaded),before);
 fresh.walkCache.set('stale',true);fresh.segmentCache.set('stale',true);fresh.setState(loaded);assert.equal(loaded.navigationVersion,4);assert.equal(fresh.walkCache.size,0);assert.equal(fresh.segmentCache.size,0);
 const replacement=deserialize(serialize(loaded));fresh.setState(replacement);assert.equal(fresh.version,5);assert.equal(replacement.navigationVersion,5);
});
test('Legacy or invalid epochs conservatively invalidate instead of trusting old persisted paths',()=>{
 for(const value of [undefined,-1,0,1.5,NaN,'3']){
  const s=Game.newGame({seed:19,slotId:'legacy'});if(value!==undefined)s.navigationVersion=value;
  const n=new Navigation(19,'sabana',{});n.setState(s);assert.equal(n.version,1);assert.equal(s.navigationVersion,1);
  n.setState(s);assert.equal(n.version,2);
 }
});

test('geometry invalidation rebuilds enlarged footprints and placement views preserve the live epoch',()=>{
 const n=new Navigation(19,'sabana',{});
 n.field={slope:()=>0,fluidInside:()=>false};n.propsAt=()=>[];
 const s={navigationVersion:4};n.state=s;n.version=4;
 const house={id:'house',kind:'house',footprint:[{x:0,z:0},{x:1,z:0},{x:1,z:1},{x:0,z:1}]};
 n.obstacles=[house];n.invalidateGeometryQueries();
 assert(n.walkable(4,.5,.2,null,false));
 house.footprint[1].x=5;house.footprint[2].x=5;
 n.invalidateGeometryQueries();assert.equal(n.walkable(4,.5,.2,null,false),false);
 assert.equal(s.navigationVersion,n.version);
 const epoch=n.version,view=n.forBuildingPlacement({id:'planned',kind:'house',footprint:[{x:8,z:0},{x:9,z:0},{x:9,z:1},{x:8,z:1}]});
 view.invalidateGeometryQueries();assert.equal(n.version,epoch);assert.equal(s.navigationVersion,epoch);
 assert.equal(view.walkable(8.5,.5,.2,null,false),false);assert(n.walkable(8.5,.5,.2,null,false));
});
