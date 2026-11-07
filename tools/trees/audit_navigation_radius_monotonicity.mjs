import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';

const state=JSON.parse(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')));
state.mangroveNetwork=true;state.mangroveSettlementVersion=2;
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),loaded=new Map(),v=state.villages[0],cx=Math.floor((v.x+24)/48),cz=Math.floor((v.z+24)/48);
const session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
 for(let z=cz-1;z<=cz+1;z++)for(let x=cx-1;x<=cx+1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const profiles=Object.entries(ANIMAL_SPATIAL_PROFILES).map(([species,profile])=>({species,radius:profile.radius})).sort((a,b)=>a.radius-b.radius),points=[];
 for(let z=-60;z<=60;z+=.5)for(let x=-60;x<=60;x+=.5)points.push({x:v.x+x+.17,z:v.z+z+.31});
 const values=profiles.map(profile=>points.map(point=>session.actorCanStand(point,{worker:false,species:profile.species}))),pairs=[];
 for(let i=0;i<profiles.length;i++)for(let j=i+1;j<profiles.length;j++){
  let smallerBlockedLargerClear=0,smallerClearLargerBlocked=0;const examples=[];
  for(let k=0;k<points.length;k++)if(values[i][k]!==values[j][k]){
   if(values[i][k])smallerClearLargerBlocked++;else{smallerBlockedLargerClear++;if(examples.length<5)examples.push(points[k]);}
  }
  pairs.push({smaller:profiles[i],larger:profiles[j],smallerBlockedLargerClear,smallerClearLargerBlocked,examples});
 }
 const report={scope:'Static local-clearance samples in a synthetic 3x3 mangrove island-network world. Absence of counterexamples is not a monotonicity proof. Does not test moving bodies, complete routes, invalidations or gameplay.',mangroveNetwork:state.mangroveNetwork,settlementVersion:state.mangroveSettlementVersion,points:points.length,profiles:profiles.map((profile,i)=>({...profile,clear:values[i].filter(Boolean).length})),pairs};
 writeFileSync('docs/lighting/tree-near-retexture/performance/mobility-radius-monotonicity.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{session.dispose();}
