import {MudWorkerQueue} from '../../tools/trees/mud-worker-queue.js';
import {rebuildMudGeometry} from '../../tools/trees/mud-worker-geometry.js';

// Presentation only. The authority owns the confirmed samples; copy the
// transferable buffer so checkpoints and other consumers retain their data.
export function createWebGpuMudPreparer({worker=null,limit=16}={}){
 const ownedWorker=worker??new Worker(new URL('../../tools/trees/mud-worker-browser.js',import.meta.url),{type:'module'});
 const queue=new MudWorkerQueue(ownedWorker,{limit}),requests=new Map();let closed=false;
 async function prepare(payload,revision,{signal}={}){
  const input=payload?.mudInputs;
  if(closed)throw Error('Mud preparer disposed');
  const terrain=payload?.terrain?.positions,site=input?.site;
  if(!input||input.cx!==payload.cx||input.cz!==payload.cz||!Number.isSafeInteger(revision)||revision<1||!Number.isSafeInteger(input.seed)||input.seed<0||input.seed>0xffffffff||!Number.isFinite(input.scale)||input.scale<=0||!(input.heights instanceof Float32Array)||input.heights.length!==49*49||!input.heights.every(Number.isFinite)||!(terrain instanceof Float32Array)||terrain.length!==49*49*3||!input.heights.every((height,i)=>Object.is(height,terrain[i*3+1]))||!Array.isArray(input.inside)||input.inside.length!==130||input.inside.some(row=>!Array.isArray(row)||row.length!==3||!Number.isFinite(row[0])||!Number.isFinite(row[1])||typeof row[2]!=='boolean')||!Array.isArray(input.slopes)||input.slopes.length!==10||input.slopes.some(row=>!Array.isArray(row)||row.length!==3||!row.every(Number.isFinite))||site!==null&&(!site||![site.x,site.z,site.clearRadius].every(Number.isFinite)||site.clearRadius<0))throw TypeError('Invalid confirmed mud input');
  if(signal?.aborted)throw new DOMException('Mud preparation cancelled','AbortError');
  const key=`${input.cx},${input.cz}`,token={};requests.set(key,token);
  const abort=()=>{if(requests.get(key)===token)queue.invalidate(key);};signal?.addEventListener('abort',abort,{once:true});
  try{
   const copied={...input,heights:input.heights.slice()};
   const result=await queue.request(key,revision,copied);
   if(closed||signal?.aborted||requests.get(key)!==token)throw new DOMException('Mud preparation cancelled','AbortError');
   return rebuildMudGeometry(result.result);
  }finally{signal?.removeEventListener('abort',abort);if(requests.get(key)===token)requests.delete(key);}
 }
 return {prepare,dispose(){if(closed)return;closed=true;requests.clear();queue.dispose();}};
}
