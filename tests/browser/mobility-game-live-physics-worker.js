import {createGamePhysics} from './mobility-game-physics-core.js';
let session;
try{session=await createGamePhysics({originalClips:true,initialAnimation:true});postMessage({kind:'ready',pose:session.visualPose()});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=e=>{if(e.data.kind!=='step'||!session)return;try{const started=performance.now(),result=session.step(),beforePose=performance.now(),pose=session.visualPose(),poseMs=performance.now()-beforePose,state=e.data.final?session.state():null;postMessage({kind:'result',sequence:e.data.sequence,result,pose,poseMs,computeMs:performance.now()-started,state});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}};
