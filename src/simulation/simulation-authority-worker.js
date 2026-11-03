import {createSimulationAuthority} from './simulation-authority.js';
import {guardianImpactTime} from './guardian-timing.js';
import {decodePhysicsCheckpoint} from './physics-checkpoint-codec.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';
let authority=null,initializing=false,session=null,dynamicPhysics=false,diagnostics=false;
self.onmessage=async ({data})=>{
 try{
  if(data?.kind==='initialize'){
   if(authority||initializing)throw Error('Simulation authority already initialized');if(typeof data.session!=='string'||!data.session)throw TypeError('Invalid session');initializing=true;session=data.session;diagnostics=data.diagnostics===true;
   const response=await fetch(wasmUrl);if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);
   const saved=JSON.parse(data.snapshot),checkpoint=data.physicsCheckpoint??(saved.workerPhysicsCheckpoint?decodePhysicsCheckpoint(saved.workerPhysicsCheckpoint):null),module=await WebAssembly.compile(await response.arrayBuffer());authority=createSimulationAuthority(module,data.snapshot,data.chunkKeys,{raidWaitBindings:data.raidWaitBindings??null,navigationView:data.navigationView??null,compactViewAcks:data.compactViewAcks===true,restoringPhysics:checkpoint!==null});const pendingImpact=(saved.raid?.animals??[]).some(a=>a.magicImpact&&saved.elapsed<guardianImpactTime(a.magicImpact));dynamicPhysics=data.dynamicPhysics===true||pendingImpact||checkpoint!==null;if(dynamicPhysics||data.physicsActorId!==undefined||data.physicsActorIds!==undefined)await authority.enableBeastPhysics(data.physicsActorId,{actorIds:data.physicsActorIds,structureTemplates:data.structureTemplates??null,allowEmpty:dynamicPhysics,checkpoint});
   postMessage({kind:'ready',session:data.session});return;
  }
  if(data?.session!==session)throw Error('Simulation session mismatch');
  if(data?.kind==='dispose'){authority?.dispose();authority=null;close();return;}
  if(!authority)throw Error('Simulation authority is not ready');
  if(data.kind!=='command')throw Error('Unknown worker message');const begin=diagnostics?performance.now():0;if(dynamicPhysics&&data.command?.kind==='castAttack')await authority.prepareBeastAttack(data.command);const prepared=diagnostics?performance.now():0,result=authority.execute(data.command);const finished=diagnostics?performance.now():0;postMessage({kind:'result',session:data.session,...result,...(diagnostics?{diagnostics:{kind:data.command.kind,preparationMs:prepared-begin,executionMs:finished-prepared}}:{})});
 }catch(error){postMessage({kind:'error',session:data?.session,sequence:data?.command?.sequence??null,message:String(error?.stack??error)});}
};
