import test from 'node:test';
import assert from 'node:assert/strict';
import {Navigation,distance} from '../src/world/navigation.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
function reference(nav,x,z,radius){
 const result=[];
 const minX=Math.floor((x-radius+24)/48),maxX=Math.floor((x+radius+24)/48),minZ=Math.floor((z-radius+24)/48),maxZ=Math.floor((z+radius+24)/48);
 for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++)for(const list of nav.chunk(cx,cz).instances)for(const p of list)if(distance(p,{x,z})<radius+8&&!nav.suppressed.has(p.id))result.push(p);
 return result;
}
test('axis rejection retains strict circular edges, identity, duplicate entries and original ordering',()=>{
 const edge={id:'edge',x:12,z:0},inside={id:'inside',x:12-Number.EPSILON*12,z:0},diagonal={id:'diagonal',x:9,z:9},suppressed={id:'suppressed',x:1,z:1},negative={id:'negative',x:-11,z:0};
 const nav=new Navigation(712,'sabana',{});nav.suppressed.add(suppressed.id);nav.chunk=()=>({instances:[[edge,inside,diagonal],[suppressed,negative,inside]]});
 const actual=nav.propsAt(0,0,4);assert.deepEqual(actual,[inside,negative,inside]);assert.equal(actual[0],inside);
 for(const radius of [0,.28,4,12,24,50])for(const [x,z] of [[0,0],[24,24],[-24,-24],[.0001,-.0001],[1e6,-1e6]])assert.deepEqual(nav.propsAt(x,z,radius),reference(nav,x,z,radius));
});
for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])test(`${biome}: native prop queries preserve all results and their order near chunk boundaries`,()=>{
 const {nav,s}=createOpeningWorld({biome}),c=s.structures[0];
 for(const radius of [.28,4.28,8,24])for(let dz=-36;dz<=36;dz+=12)for(let dx=-36;dx<=36;dx+=12){const x=c.x+dx+.125,z=c.z+dz-.125;assert.deepEqual(nav.propsAt(x,z,radius),reference(nav,x,z,radius));}
 const props=nav.propsAt(c.x,c.z,24);if(props.length)nav.suppressed.add(props[0].id);
 assert.deepEqual(nav.propsAt(c.x,c.z,24),reference(nav,c.x,c.z,24));
});
