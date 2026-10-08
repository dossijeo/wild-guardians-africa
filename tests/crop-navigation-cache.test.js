import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {centerServicePoint} from '../src/world/centers.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function site(s,nav,{suppression=false,away=[]}={}){
 const c=s.structures[0],origin=centerServicePoint(c,s,.8);
 for(let dz=-15;dz<=15;dz+=1.5)for(let dx=6;dx<=30;dx+=1.5){
  const p={x:c.x+dx,z:c.z+dz},check=nav.placement(p.x,p.z,.4);
  if(check.valid&&Boolean(check.suppress.length)===suppression&&away.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>1.5)&&nav.segmentClear(origin,p,.28,null,true))return {p,origin,check};
 }
 throw Error('Native crop site not found');
}

test('paid planting on cleared native ground preserves static caches, route epoch semantics and fresh-navigator routes',()=>{
 const {s,nav}=createOpeningWorld(),first=site(s,nav),second=site(s,nav,{away:[first.p]});
 const route=nav.path(first.origin,first.p,.28,null,true);assert.ok(route);
 nav.walkable(Math.round(first.p.x),Math.round(first.p.z),.28,null,true);
 assert.equal(nav.segmentClear(first.origin,first.p,.28,null,true),true);
 nav.segmentClear({x:Math.round(first.origin.x),z:Math.round(first.origin.z)},{x:Math.round(first.p.x),z:Math.round(first.p.z)},.28,null,true);
 assert.ok(nav.walkCache.size>0&&nav.segmentCache.size>0);
 const names=['walkCache','segmentCache','searchNeighborCache','failedPaths','closedRegions','searchedRegions','portalGraphs','obstacles','obstacleBounds'];
 const references=names.map(name=>nav[name]),walkEntries=[...nav.walkCache],segmentEntries=[...nav.segmentCache],version=nav.version;
 Game.plant(s,'empty-crop-1','mijo',first.p.x,first.p.z,nav);
 assert.equal(nav.version,version);assert.equal(s.navigationVersion,nav.version);assert.equal(nav.state,s);
 names.forEach((name,i)=>assert.equal(nav[name],references[i],name));
 assert.deepEqual([...nav.walkCache],walkEntries);assert.deepEqual([...nav.segmentCache],segmentEntries);
 Game.plant(s,'empty-crop-2','mijo',second.p.x,second.p.z,nav);assert.equal(nav.version,version);
 const loaded=deserialize(serialize(s)),fresh=new Navigation(s.seed,s.biome,nav.profile);fresh.setState(loaded);
 assert.deepEqual(nav.path(first.origin,first.p,.28,null,true),fresh.path(first.origin,first.p,.28,null,true));
 assert.deepEqual(nav.path(second.p,first.origin,.28,null,true),fresh.path(second.p,first.origin,.28,null,true));
 assert.equal(serialize(loaded),serialize(s));
});

test('real crop prop removal invalidates caches and keeps native rendering/navigation suppression consistent after reload',()=>{
 const {s,nav}=createOpeningWorld(),target=site(s,nav,{suppression:true});
 nav.path(target.origin,target.p,.28,null,true);nav.segmentClear(target.origin,target.p,.28,null,true);
 nav.walkable(Math.round(target.p.x),Math.round(target.p.z),.28,null,true);
 nav.segmentClear({x:Math.round(target.origin.x),z:Math.round(target.origin.z)},{x:Math.round(target.p.x),z:Math.round(target.p.z)},.28,null,true);
 assert.ok(nav.walkCache.size>0&&nav.segmentCache.size>0);
 const version=nav.version;
 Game.plant(s,'clearing-crop','mijo',target.p.x,target.p.z,nav);
 assert.equal(nav.version,version+1);assert.equal(nav.walkCache.size,0);assert.equal(nav.segmentCache.size,0);
 for(const id of target.check.suppress){assert.ok(s.suppressed.includes(id));assert.ok(nav.suppressed.has(id));}
 assert.ok(!nav.propsAt(target.p.x,target.p.z,4).some(p=>target.check.suppress.includes(p.id)));
 const loaded=deserialize(serialize(s)),fresh=new Navigation(s.seed,s.biome,nav.profile);fresh.setState(loaded);
 assert.ok(!fresh.propsAt(target.p.x,target.p.z,4).some(p=>target.check.suppress.includes(p.id)));
});

test('a paid wall still invalidates a previously clear native segment after empty crop cache reuse',()=>{
 const {s,nav}=createOpeningWorld(),{p,origin}=site(s,nav);
 Game.plant(s,'empty-crop','mijo',p.x,p.z,nav);
 const a={x:Math.round(origin.x),z:Math.round(origin.z)},b={x:Math.round(p.x),z:Math.round(p.z)};
 assert.equal(nav.segmentClear(a,b,.28,null,true),true);assert.ok(nav.segmentCache.size>0);
 const wall={kind:'wall',material:'zarzas',x:(a.x+b.x)/2,z:(a.z+b.z)/2,yaw:Math.PI/2-Math.atan2(b.z-a.z,b.x-a.x)};
 assert.equal(nav.wallPlacement(wall).valid,true);
 const version=nav.version;Game.placeStructure(s,'paid-wall',wall,nav);
 assert.equal(nav.version,version+1);assert.equal(nav.segmentCache.size,0);
 assert.equal(nav.segmentClear(a,b,.28,null,true),false);
});

test('crop synchronization of a different loaded state rebuilds rather than reusing the old world index',()=>{
 const {s,nav}=createOpeningWorld(),{p,origin}=site(s,nav);nav.path(origin,p,.28,null,true);
 const loaded=deserialize(serialize(s)),oldObstacles=nav.obstacles,version=nav.version;
 nav.syncCropPlacement(loaded,[]);
 assert.equal(nav.state,loaded);assert.notEqual(nav.obstacles,oldObstacles);assert.equal(nav.walkCache.size,0);
 assert.equal(nav.version,version+1);assert.equal(loaded.navigationVersion,nav.version);
});

test('native moving worker remains full-state equivalent across cold restore and another cleared-ground purchase',()=>{
 const {s,nav}=createOpeningWorld(),plots=[];
 for(let i=0;i<4;i++)plots.push(site(s,nav,{away:plots.map(x=>x.p)}));
 for(let i=0;i<3;i++)Game.plant(s,'restore-seed-'+i,'mijo',plots[i].p.x,plots[i].p.z,nav);
 Game.openInitialHiring(s);Game.hire(s,'restore-paid-worker',{olderFemale:1});
 assert.equal(s.workers.length,1);assert.equal(s.pauses.length,0);
 const start={x:s.workers[0].x,z:s.workers[0].z};
 for(let i=0;i<80;i++)Game.tick(s,.1,nav);
 assert(Math.hypot(s.workers[0].x-start.x,s.workers[0].z-start.z)>1e-6,'Worker must physically move before restore');
 assert.notEqual(s.workers[0].status,'home');
 const loaded=deserialize(serialize(s)),cold=new Navigation(s.seed,s.biome,nav.profile);cold.setState(loaded);
 const epoch=nav.version;assert.equal(cold.version,epoch);let compared=0,movingTicks=0;
 for(let i=0;i<50;i++){
  if(i===10)for(const [state,n] of [[s,nav],[loaded,cold]]){
   const p=plots[3].p,check=n.placement(p.x,p.z,.4);assert(check.valid&&check.suppress.length===0);
   Game.plant(state,'restore-after-load-plant','mijo',p.x,p.z,n);assert.equal(n.version,epoch);
  }
  const before={x:s.workers[0].x,z:s.workers[0].z};
  Game.tick(s,.1,nav);Game.tick(loaded,.1,cold);assert.equal(serialize(s),serialize(loaded));compared++;
  if(Math.hypot(s.workers[0].x-before.x,s.workers[0].z-before.z)>1e-6)movingTicks++;
 }
 assert.equal(compared,50);assert(movingTicks>0,'Cold comparison must exercise physical movement');
});
