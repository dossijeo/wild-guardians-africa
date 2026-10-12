import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fixture({gate=false,status='ruined'}={}){
 const state=Game.newGame({seed:712,biome:'sabana',culture:'mapungubwe'});
 const wall={id:'wall-test',kind:'wall',material:'zarzas',gate,x:10,z:0,yaw:0,
  hp:status==='ruined'?0:7,maxHp:10,status,collapseRemaining:0};
 state.structures.push(wall);
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(state);
 return {state,nav,wall};
}

test('intact wall HP repair retains topology and its obstacle health',()=>{
 const {state,nav,wall}=fixture({status:'intact'}),version=nav.version,obstacles=nav.obstacles;
 wall.hp=10;nav.syncWallRepair(state,wall,'intact');
 assert.equal(nav.version,version);assert.equal(nav.obstacles,obstacles);
 assert.equal(nav.obstacles.find(o=>o.id===wall.id).hp,10);
});

test('rebuilding a solid wall preserves only distant worker paths',()=>{
 const {state,nav,wall}=fixture(),version=nav.version;
 const far={id:'far',x:0,z:10,radius:.28,pathVersion:version,path:[{x:5,z:10},{x:20,z:10}]};
 const crossing={id:'crossing',x:0,z:0,radius:.28,pathVersion:version,path:[{x:20,z:0}]};
 const nearby={id:'nearby',x:0,z:.3,radius:.28,pathVersion:version,path:[{x:20,z:.3}]};
 const stale={id:'stale',x:0,z:10,radius:.28,pathVersion:version-1,path:[{x:20,z:10}]};
 state.workers.push(far,crossing,nearby,stale);
 wall.hp=10;wall.status='intact';nav.syncWallRepair(state,wall,'ruined');
 assert.equal(nav.version,version+1);
 assert.equal(far.pathVersion,version+1);
 assert.equal(crossing.pathVersion,version);
 assert.equal(nearby.pathVersion,version);
 assert.equal(stale.pathVersion,version-1);
 assert.ok(nav.workerMotionClear(far,far.path[0],far.radius));
 assert.ok(nav.workerMotionClear(far.path[0],far.path[1],far.radius));
 assert.equal(nav.workerMotionClear(crossing,crossing.path[0],crossing.radius),false);
 const loaded=deserialize(serialize({...state,workers:[]}));
 assert.equal(loaded.navigationVersion,nav.version);
});

test('rebuilding a gate conservatively replans every worker route',()=>{
 const {state,nav,wall}=fixture({gate:true}),version=nav.version;
 const worker={id:'far',x:0,z:10,radius:.28,pathVersion:version,path:[{x:20,z:10}]};
 state.workers.push(worker);wall.hp=10;wall.status='intact';
 nav.syncWallRepair(state,wall,'ruined');
 assert.equal(nav.version,version+1);assert.equal(worker.pathVersion,version);
});
