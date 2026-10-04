import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {spawnRaid} from '../src/simulation/raids.js';
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: real opening terrain keeps the mandatory animal near the initial camera or on the connected near farm side`,()=>{
 const {s,nav}=createOpeningWorld({biome}),v=s.villages[0],canyon=nav.field.canyon;
 const pose=nativeCameraPose(nav.field,[v.x+20,0,v.z],canyon?0:.5,canyon?1.18:1.16,canyon?34:38);
 const eye={x:pose.eye[0],z:pose.eye[2]},target={x:pose.target[0],z:pose.target[2]};
 nav.setRaidView(eye,target);nav.setActiveBounds(activeChunkRegion(eye).bounds);
 let searches=0;const original=nav.approachPath;nav.approachPath=function(...args){searches++;return original.apply(this,args);};
 spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);const a=s.raid.animals[0],center=s.structures[0];
 assert.ok(Math.hypot(a.x-eye.x,a.z-eye.z)<20||Math.hypot(a.x-center.x,a.z-center.z)<12,'a distant resident-border spawn is not a near arrival');
 assert.ok(searches<=4,'camera and near-farm probes have a bounded A* budget');
 assert.ok(nav.walkable(a.x,a.z,a.radius,null,false));assert.ok(nav.walkable(a.exit.x,a.exit.z,a.radius,null,false));assert.ok(nav.segmentClear(a,a.exit,a.radius,null,false));
 assert.equal(s.events.filter(e=>e.type==='RaidSpawned').length,1);
});
