import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import * as currentGame from '../../src/simulation/game.js';
import {execFileSync} from 'node:child_process';

const snapshot=process.argv[2];
if(!snapshot)throw Error('Pass the captured day-ten state path');
const source=execFileSync('git',['show','4a3afa7a:src/simulation/game.js'],
  {encoding:'utf8'});
const temporary=new URL(`../../src/simulation/.manglares-quote-base-${process.pid}.mjs`,import.meta.url);
writeFileSync(temporary,source);
let baseline;
try{baseline=await import(temporary);}finally{unlinkSync(temporary);}
const binary=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const stroke=[[72,-18],[102,-18],[102,18],[72,18],[72,-18]];
for(const [label,game] of [['before',baseline],['after',currentGame]]){
  const state=deserialize(readFileSync(snapshot,'utf8'));
  const loaded=new Map();
  const session=createSpatialGameSession(binary,state,
    {loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const jobs=new Map();
    for(let z=-2;z<=2;z++)for(let x=0;x<=4;x++)
      jobs.set(`${x},${z}`,{cx:x,cz:z,score:Math.abs(x-2)+Math.abs(z)});
    session.stream.plan(jobs);await session.stream.whenIdle();
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds([-72,-120,168,120]);
    const stuck=state.workers.find(worker=>worker.id==='worker-4866');
    if(stuck){
      const home=state.villages.find(v=>v.id===stuck.villageId)?.entry;
      console.log(JSON.stringify({label,stuck:{x:stuck.x,z:stuck.z},home,
        stand:nav.walkable(stuck.x,stuck.z,.28,null,true),
        region:nav.regionConnected(stuck,home,.28,null,true),
        route:nav.workerPath(stuck,home)?.length??null}));
    }
    const calls={path:0,preview:0,reach:0,reachUnknown:0,reachTargets:0,
      unknownSamples:[]};
    for(const [key,method] of [['path','path'],['preview','withWallPreview'],
      ['reach','wallWorkerReachability']]){
      if(typeof nav[method]!=='function')continue;
      const original=nav[method];
      nav[method]=(...args)=>{
        calls[key]++;
        const result=original(...args);
        if(key==='reach'){
          calls.reachTargets+=args[1].length;
          calls.reachUnknown+=result?.filter(value=>value==='unknown').length??0;
          for(let i=0;i<(result?.length??0)&&calls.unknownSamples.length<20;i++)
            if(result[i]==='unknown')calls.unknownSamples.push({origin:args[0],
              target:{id:args[1][i].id,x:args[1][i].x,z:args[1][i].z,
                status:args[1][i].status},proposed:args[2].length,
              reverse:args[4]});
        }
        return result;
      };
    }
    const start=performance.now();
    const plan=game.quoteWallChain(state,'zarzas',stroke,nav,{smooth:false,snap:false});
    console.log(JSON.stringify({label,ms:performance.now()-start,calls,
      pieces:plan.pieces.length,gates:plan.gates,cost:plan.cost,
      blocked:plan.blockedPieces.length,
      gatePoints:plan.pieces.filter(piece=>piece.gate).map(piece=>[piece.x,piece.z])}));
  }finally{session.dispose();}
}
