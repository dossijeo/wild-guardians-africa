import {createGamePhysics} from './mobility-game-physics-core.js';
let session;
try{session=await createGamePhysics({originalClips:true,initialAnimation:true,traceBones:true});postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=e=>{if(e.data.kind!=='step'||!session)return;try{let result;for(let i=0;i<e.data.count;i++)result=session.step();postMessage({kind:'result',result,pose:session.visualPose()});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
