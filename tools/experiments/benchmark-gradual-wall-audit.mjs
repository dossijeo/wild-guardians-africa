import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {wallStroke,wallStrokeLine} from '../../src/world/wall-layout.js';
import {rational} from '../../src/simulation/money.js';
import * as current from '../../src/simulation/game.js';

const baselinePath=new URL('../../src/simulation/game-baseline-qa.mjs',import.meta.url);
writeFileSync(baselinePath,execFileSync('git',['show','7d257501:src/simulation/game.js']));
let session;
try{
  const baseline=await import(baselinePath.href);
  const module=new WebAssembly.Module(readFileSync(new URL(
    '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const state=deserialize(gunzipSync(readFileSync(new URL(
    '../../tests/fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))));
  state.structures=state.structures.filter(s=>!(s.kind==='wall'&&s.created>=27114));
  state.ledger.balance=rational(10000);
  const loaded=new Map();session=createSpatialGameSession(module,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  const desired=new Map();
  for(let z=-2;z<=2;z++)for(let x=-1;x<=3;x++)desired.set(`${x},${z}`,
    {cx:x,cz:z,score:Math.abs(x-1)+Math.abs(z)});
  session.stream.plan(desired);await session.stream.whenIdle();
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([-72,-120,168,120]);
  const slots=wallStroke([[66,-7.18],[66,-18]],state.structures,
    {smooth:false,snap:false});
  const stroke=wallStrokeLine([slots[0]]),options={smooth:false,snap:false,maxPieces:1};
  const arms={baseline:()=>baseline.quoteWallChain(state,'zarzas',stroke,nav,options),
    current:()=>current.quoteWallChain(state,'zarzas',stroke,nav,options)};
  for(let i=0;i<3;i++)for(const run of Object.values(arms))run();
  const rows=[];
  for(const order of [['baseline','current'],['current','baseline'],
    ['current','baseline'],['baseline','current']])for(const name of order){
    const start=performance.now(),result=arms[name]();
    rows.push({name,ms:performance.now()-start,pieces:result.pieces.length,
      gates:result.gates});
  }
  console.log(JSON.stringify({fixture:'Desierto/983 d15, one open module, 42 workers',
    rows},null,2));
}finally{session?.dispose();unlinkSync(baselinePath);}

