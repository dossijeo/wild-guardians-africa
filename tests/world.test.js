import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {findInitialLocation} from '../src/world/villages.js';
import {newGame,BIOMES,CULTURES} from '../src/simulation/game.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/content/${name}.json`,import.meta.url),'utf8'));
const villages=read('villages');
test('Navigation refuses a blocked destination, including routes shorter than one step',()=>{
 const nav=Object.create(Navigation.prototype);nav.failedPaths=new Set();nav.walkable=(x,z)=>x<1;
 assert.equal(nav.path({x:.9,z:0},{x:1.1,z:0}),null);
});
for(const seed of [712,918271])for(const biome of BIOMES)for(const culture of CULTURES)test(`${biome}/${culture}/${seed}: original terrain supports initial village and employee route`,()=>{
 const profile=read('biome-'+BIOME_IDS[biome]).profile,nav=new Navigation(seed,biome,profile);
 const payload=villages.find(v=>v.id===(culture==='saheliana'?'saheliano':culture));
 const location=findInitialLocation(nav,payload),state=newGame({seed,biome,culture,slotId:'matrix'});
 Object.assign(state.villages[0],location);state.suppressed.push(...location.suppress);nav.setState(state);
 const home=state.villages[0].entry,destination={x:location.center.x+3.4,z:location.center.z};
 assert.ok(nav.walkable(home.x,home.z,.28,null,true),'Village must have a walkable departure point');
 assert.ok(nav.path(home,destination,.28,null,true),'Employees must reach initial work area around actual buildings');
});
