import {createSimulationAuthority} from './simulation-authority.js';
import wasmUrl from '../world/wild-engine/spatial-savanna.wasm?url';
let authority=null,initializing=false,session=null,dynamicPhysics=false;
self.onmessage=async ({data})=>{
 try{
  if(data?.kind==='initialize'){
   if(authority||initializing)throw Error('Simulation authority already initialized');if(typeof data.session!=='string'||!data.session)throw TypeError('Invalid session');initializing=true;session=data.session;
   const response=await fetch(wasmUrl);if(!response.ok)throw Error(`Wild Engine fetch failed: ${response.status}`);
   const module=await WebAssembly.compile(await response.arrayBuffer());authority=createSimulationAuthority(module,data.snapshot,data.chunkKeys,{raidWaitBindings:data.raidWaitBindings??null});dynamicPhysics=data.dynamicPhysics===true;if(dynamicPhysics||data.physicsActorId!==undefined||data.physicsActorIds!==undefined)await authority.enableBeastPhysics(data.physicsActorId,{actorIds:data.physicsActorIds,structureTemplates:data.structureTemplates??null,allowEmpty:dynamicPhysics});
   postMessage({kind:'ready',session:data.session});return;
  }
  if(data?.session!==session)throw Error('Simulation session mismatch');
  if(data?.kind==='dispose'){authority?.dispose();authority=null;close();return;}
  if(!authority)throw Error('Simulation authority is not ready');
  if(data.kind!=='command')throw Error('Unknown worker message');if(dynamicPhysics&&data.command?.kind==='castAttack')await authority.prepareBeastAttack(data.command);const result=authority.execute(data.command);postMessage({kind:'result',session:data.session,...result});
 }catch(error){postMessage({kind:'error',session:data?.session,sequence:data?.command?.sequence??null,message:String(error?.stack??error)});}
};
