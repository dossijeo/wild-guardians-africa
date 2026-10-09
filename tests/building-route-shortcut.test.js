import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {shortenBuildingRoute} from '../src/world/building-route-shortcut.js';
import {centerFootprint} from '../src/world/centers.js';
import {CENTER_GEOMETRIES} from '../src/world/center-geometries.js';
const start={x:-15.10406224583656,z:53.49417272598826},end={x:-13.37303336523354,z:59.320231353738734};
const length=(a,route)=>route.reduce((result,b,i)=>result+Math.hypot(b.x-(i?route[i-1]:a).x,b.z-(i?route[i-1]:a).z),0);
function native(){
 const state=deserialize(gunzipSync(readFileSync(new URL('./fixtures/canyon-saheliana-day1-route.json.gz',import.meta.url))).toString('utf8'));
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);return {state,nav};
}
function clearRoute(nav,a,route){let previous=a;for(const point of route){assert.ok(nav.segmentClear(previous,point,.28,null,true));previous=point;}}
test('recorded canyon route uses the physical corner corridor instead of walking around the entire center',()=>{
 const {nav}=native(),old=nav.smoothPath(start,nav.findPath(start,end,.28,null,true),.28,null,true);
 assert.ok(length(start,old)>38);assert.equal(nav.segmentClear(start,end,.28,null,true),false);
 const route=nav.path(start,end,.28,null,true);assert.ok(length(start,route)<7);assert.deepEqual(route.at(-1),end);clearRoute(nav,start,route);
 // Animal routing remains the original lattice route.
 assert.ok(length(start,nav.path(start,end,.28,null,false))>38);
});
test('new solids invalidate the shortcut rather than reusing a terrain-dependent cached corner route',()=>{
 const {nav,state}=native(),before=nav.path(start,end,.28,null,true),corner=before[0];
 state.structures.push({id:'new-wall',kind:'wall',material:'piedra',x:corner.x,z:corner.z,status:'intact',hp:100});nav.setState(state);
 assert.equal(nav.walkable(corner.x,corner.z,.28,null,true),false);
 const route=nav.path(start,end,.28,null,true);assert.ok(route);clearRoute(nav,start,route);assert.notDeepEqual(route,before);
});
for(const culture of Object.keys(CENTER_GEOMETRIES))for(const yaw of [0,.67,1.8])test(`${culture}/${yaw}: corner candidates preserve rotated authored solid clearance`,()=>{
 const nav=new Navigation(712,'sabana',{});nav.field={slope:()=>0,blocked:()=>false,waterInfo:()=>({inside:false})};nav.propsAt=()=>[];
 const center={id:'center',kind:'center',culture,x:2.35,z:-3.67,yaw,status:'intact'},shape=centerFootprint(center);nav.obstacles=[shape];
 const bounds=CENTER_GEOMETRIES[culture].bounds,rotate=(x,z)=>({x:center.x+x*Math.cos(yaw)+z*Math.sin(yaw),z:center.z-x*Math.sin(yaw)+z*Math.cos(yaw)});
 const a=rotate(bounds.max[0]-1,bounds.min[2]-1),b=rotate(bounds.max[0]+1,0);
 const route=[rotate(bounds.min[0]-2,bounds.min[2]-2),rotate(bounds.min[0]-2,bounds.max[2]+2),rotate(bounds.max[0]+2,bounds.max[2]+2),b];
 const shortened=shortenBuildingRoute(nav,a,b,route,.28,null);assert.ok(length(a,shortened)<length(a,route));clearRoute(nav,a,shortened);
});
test('fractional candidates do not bypass fluid restrictions or increase work without a large detour',()=>{
 const {nav}=native(),route=nav.path(start,end,.28,null,true);let checks=0;nav.walkable=()=>{checks++;return false;};
 const long=[{x:-27,z:53},{x:-27,z:65},end];assert.equal(shortenBuildingRoute(nav,start,end,long,.28,null),long);assert.ok(checks<=48);
 checks=0;assert.equal(shortenBuildingRoute(nav,start,end,route,.28,null),route);assert.equal(checks,0);
});
test('native swept fluid tests reject all short corner routes across a pond',()=>{
 const {nav}=native(),long=nav.smoothPath(start,nav.findPath(start,end,.28,null,true),.28,null,true);
 nav.field={canyon:false,slope:()=>0,waterInfo:(x,z)=>({inside:x>-18&&x<-12&&z>54&&z<58})};nav.propsAt=()=>[];
 nav.walkCache.clear();nav.segmentCache.clear();nav.workerRouteCache.clear();
 clearRoute(nav,start,long);
 assert.equal(shortenBuildingRoute(nav,start,end,long,.28,null),long);
});
