import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export function probe(eyeZ) {
 const s=Game.newGame({seed:712});s.villages=[];s.workers=[];s.structures=[];s.plants=[];s.initialPreparation=false;s.time=400;s.day=6;s.spells=[];
 s.structures.push({id:'center',kind:'center',culture:'mapungubwe',created:1,x:-10,z:-5,yaw:0,status:'intact',hp:600,maxHp:600,cost:800});
 let id=2;
 for(let x=-20;x<=20;x+=2)for(const z of [-20,20])s.structures.push({id:'wall-'+id,created:id++,kind:'wall',material:'zarzas',x,z,yaw:0,status:'intact',hp:100,maxHp:100,cost:10,gate:false});
 for(let z=-18;z<=18;z+=2)for(const x of [-20,20])s.structures.push({id:'wall-'+id,created:id++,kind:'wall',material:'zarzas',x,z,yaw:Math.PI/2,status:'intact',hp:100,maxHp:100,cost:10,gate:false});
 s.plants.push({id:'crop',species:'mijo',x:8,z:0,alive:true,growth:0,attackHits:0});
 const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);nav.setActiveBounds([-60,-60,60,60]);nav.setRaidView({x:0,z:eyeZ},{x:0,z:0});
 assert.equal(nav.segmentClear({x:0,z:30},{x:0,z:0},1.1,null,false),false,'The real wall collision must block a direct crossing');
 spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
 const birth={...s.raid.animals[0].spawn};updateRaid(s,0,nav);
 const selected=s.raid.animals[0].targetId,kind=selected==='crop'?'crop':s.structures.find(v=>v.id===selected)?.kind;
 let steps=0;
 // Isolated native actor motion/attack only; no economy or campaign clock.
 while(s.raid&&steps<2400&&!s.events.some(e=>e.type==='CropHit'||e.type==='StructureHit')){s.elapsed+=.05;updateRaid(s,.05,nav);steps++;}
 const hit=s.events.find(e=>e.type==='CropHit'||e.type==='StructureHit');
 return {eye:{x:0,z:eyeZ},birth,insideClosedSquare:Math.abs(birth.x)<20&&Math.abs(birth.z)<20,selected,selectedKind:kind,firstHit:hit?{type:hit.type,targetId:hit.targetId}:null,steps,elapsedSteppedSeconds:steps*.05,wallCount:s.structures.filter(v=>v.kind==='wall').length};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/probe-camera-enclosure.mjs')) {
 const rows=[probe(8),probe(30)],out=process.argv[2];mkdirSync(out,{recursive:true});
 const sourceHashes=Object.fromEntries(['tools/probe-camera-enclosure.mjs','src/simulation/raids.js','src/world/navigation.js','src/simulation/game.js'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 writeFileSync(out+'/closed-enclosure-probe.json',JSON.stringify({scope:'Controlled flat terrain with actual production wall collision and native actor motion/hits, not a biome campaign or visual QA. Manual fixture has no automatic gate and synthetic wall HP100.',sourceHashes,rows},null,2)+'\n');console.log(JSON.stringify(rows));
}
