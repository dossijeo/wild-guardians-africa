import {performance} from 'node:perf_hooks';
import {Navigation} from '../src/world/navigation.js';

const count=Number(process.argv[2]??600),iterations=Number(process.argv[3]??400);
const structures=Array.from({length:count},(_,i)=>({id:`wall-${i}`,kind:'wall',status:'intact',material:'zarzas',gate:i%37===0,x:(i%40-20)*3,z:(Math.floor(i/40)-7)*3,yaw:i%7*Math.PI/11,hp:10,maxHp:10}));
const nav=new Navigation(712,'sabana',{});
nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];
nav.setState({structures,villages:[],spells:[],suppressed:[]});
let seed=12345;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const samples=Array.from({length:iterations},()=>{
 const start={x:(random()-.5)*30,z:(random()-.5)*30};
 return [start,{x:start.x+(random()-.5)*5,z:start.z+(random()-.5)*5}];
});
const index=nav.obstacleIndex;
const measure=enabled=>{
 nav.obstacleIndex=enabled?index:null;
 const begun=performance.now();let blocked=0;
 for(const [start,end] of samples)if(!nav.coarseSegmentClear(start,end,.28,null,true))blocked++;
 return {milliseconds:performance.now()-begun,blocked};
};
measure(false);measure(true);
for(const enabled of [false,true,true,false])console.log(JSON.stringify({count,iterations,indexed:enabled,...measure(enabled)}));
