import {createGamePhysics} from './mobility-game-physics-core.js';
let session;
try{session=await createGamePhysics({originalClips:true,initialAnimation:true});postMessage({kind:'ready'});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=e=>{if(e.data.kind!=='step'||!session)return;try{const start=performance.now(),step=session.step(),state=session.state();postMessage({kind:'result',step,state,workerTotalMs:performance.now()-start});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
