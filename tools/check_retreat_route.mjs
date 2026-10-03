import {footprintDistance} from '../src/world/footprints.js';
import {centerServicePoint} from '../src/world/centers.js';
// Reproduce the route endpoint from the seed-712 active-farm failure.
// Uses a legally purchased opening and crops; no economy or balance overrides.
import {readFileSync} from 'node:fs';
import {Navigation} from '../src/world/navigation.js';
import {villageLayout,findVillageEntry} from '../src/world/villages.js';
import {centerFootprint} from '../src/world/centers.js';
import * as Game from '../src/simulation/game.js';
import {pathToFileURL} from 'node:url';
export function createRetreatReproduction(){
// Freeze the historical village position recorded in test-results/retreat-route-712.txt.
// A newer opening search may choose a different village and erase this regression.
const payload=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url))).find(v=>v.id==='etiope');
const pack=JSON.parse(readFileSync(new URL('../public/content/biome-savanna.json',import.meta.url)));
const nav=new Navigation(712,'sabana',pack.profile),s=Game.newGame({seed:712,culture:'etiope'});
// This archived failure predates village platforms; replay its original saved map.
delete s.terrainVersion;
const x=-58.927890563119334,z=-57.27265356351765,buildings=villageLayout(payload,x,z);
Object.assign(s.villages[0],{x,z,buildings,entry:findVillageEntry(nav,buildings,x,z)});
s.suppressed.push(...buildings.flatMap(b=>nav.placementFootprint(b).suppress??[]));nav.setState(s);Game.resume(s,'intro');
let site;
for(let ring=0;ring<12&&!site;ring++)for(let i=0;i<(ring?16:1)&&!site;i++){
 const point={x:x+23+Math.cos(i*Math.PI/8)*ring*3,z:z+Math.sin(i*Math.PI/8)*ring*3};
 const shape=centerFootprint({...point,culture:'etiope'});
 if(footprintDistance(shape.footprint,-29.289059826756475,-56.22730078939573)>.45&&nav.placementFootprint(shape).valid)site=point;
}
if(!site)throw new Error('No legal native center for the historical retreat fixture');
Game.placeStructure(s,'route-center',site,nav);
const center=s.structures[0],departure=centerServicePoint(center,s,.8),plots=[];
for(let dz=-9;dz<=9;dz+=1.5)for(let dx=4.5;dx<=15;dx+=1.5){
  const p={x:Math.round((center.x+dx)/1.5)*1.5,z:Math.round((center.z+dz)/1.5)*1.5};
  if(nav.placement(p.x,p.z,.4).valid&&nav.path(departure,p,.28,null,true)&&nav.path(p,departure,.28,null,true))plots.push(p);
}
plots.sort((a,b)=>Math.hypot(a.x-departure.x,a.z-departure.z)-Math.hypot(b.x-departure.x,b.z-departure.z)||a.z-b.z||a.x-b.x);
for(const [i,p] of plots.slice(0,16).entries())Game.plant(s,'route-plot-'+i,'mijo',p.x,p.z,nav);
const start={x:-29.289059826756475,z:-56.22730078939573},exit={x:-81.92789056311933,z:-54.27265356351765},radius=.45;
return {s,nav,center,start,exit,radius};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const {s,nav,center,start,exit,radius}=createRetreatReproduction();
const route=nav.path(start,exit,radius,null,false);
console.log(JSON.stringify({center:{x:center.x,z:center.z},plots:s.plants.length,startWalkable:nav.walkable(start.x,start.z,radius,null,false),exitWalkable:nav.walkable(exit.x,exit.z,radius,null,false),terrain:nav.terrainValid(start.x,start.z,radius),route,
  props:nav.propsAt(start.x,start.z,4).filter(p=>Math.hypot(p.x-start.x,p.z-start.z)<(p.radius??1.5)+radius).map(p=>({id:p.id,x:p.x,z:p.z,radius:p.radius,slot:p.slot})),
  obstacles:nav.obstacles.filter(o=>Math.hypot(o.x-start.x,o.z-start.z)<(o.radius??0)+radius),
  connectors:Array.from({length:9},(_,i)=>({x:Math.round(start.x)+i%3-1,z:Math.round(start.z)+Math.floor(i/3)-1})).map(p=>({...p,walkable:nav.walkable(p.x,p.z,radius,null,false),clear:nav.segmentClear(start,p,radius,null,false)}))}));
for(const [margin,limit] of [[16,12000],[32,48000],[64,120000]]){
  nav.setState(s);
  const started=performance.now(),path=nav.path(start,exit,radius,null,false,margin);
  console.log(JSON.stringify({margin,limit,points:path?.length??null,seconds:(performance.now()-started)/1000,path}));
  if(path)break;
}
}
