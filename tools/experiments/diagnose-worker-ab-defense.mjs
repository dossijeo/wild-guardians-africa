// Read-only QA of the candidate's planned outer ring at frozen dawn states.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {relative,resolve} from 'node:path';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {wallStroke} from '../../src/world/wall-layout.js';
import {numberOf} from '../../src/simulation/money.js';
import * as Game from '../../src/simulation/game.js';

const input=resolve(process.argv[2]);
const compressed=readFileSync(input),sourceSha256=createHash('sha256').update(compressed).digest('hex');
const state=deserialize(gunzipSync(compressed).toString());
const wasm=new WebAssembly.Module(readFileSync(new URL(
 '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const loaded=new Map();
const session=createSpatialGameSession(wasm,state,{
 loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
 const corners=[[72,-18],[102,-18],[102,18],[72,18],[72,-18]];
 const keys=new Set();
 for(const [px,pz] of corners){
  const cx=Math.floor((px+24)/48),cz=Math.floor((pz+24)/48);
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)keys.add(`${cx+dx},${cz+dz}`);
 }
 for(const key of keys){const [cx,cz]=key.split(',').map(Number);
  if(session.core.selectChunk(cx,cz)<0&&session.core.addChunk(cx,cz)<0)
   throw Error('Unresident chunk '+key);
  const data=session.core.chunkPayload();data.terrainRevision=0;loaded.set(key,data);
 }
 const nav=createSpatialNavigationMovement(session,state);
 const slots=wallStroke(corners,state.structures,{smooth:false,snap:false});
 const reasons={};const placement=[];
 for(const slot of slots){
  const piece={kind:'wall',material:'zarzas',gate:false,
   baseScaleX:slot.scaleX,x:slot.x,z:slot.z,yaw:-slot.angle};
  const check=nav.wallPlacement(piece);
  const reason=check.valid?'valid':check.reason??'invalid';
  reasons[reason]=(reasons[reason]??0)+1;
  placement.push({x:slot.x,z:slot.z,reason});
 }
 const pending=state.tasks.filter(t=>t.kind==='repair').reduce((sum,t)=>{
  const piece=state.structures.find(p=>p.id===t.targetId);
  return sum+(piece?Math.ceil(numberOf(Game.repairCost(piece))):0);
 },0);
 const money=numberOf(state.ledger.balance),protectedCash=Math.ceil(money*.8);
 console.log(JSON.stringify({input:relative(process.cwd(),input).replaceAll('\\','/'),sourceSha256,
  day:state.day,time:state.time,money,
  protectedCash,pendingRepairs:pending,upperBoundFundsAfterReserve:
   Math.max(0,money-protectedCash-pending),
  wallCount:state.structures.filter(p=>p.kind==='wall').length,
  ruinedWallCount:state.structures.filter(p=>p.kind==='wall'&&p.status==='ruined').length,
  slots:slots.length,reasons,placement},null,2));
}finally{session.dispose();}
