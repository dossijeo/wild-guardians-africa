import {createGamePhysics} from './mobility-game-physics-core.js';let session,lastCommand=0,nextStep=1,fault=false;const id='pacer-game-pause';
try{session=await createGamePhysics({originalClips:true,initialAnimation:true});postMessage({kind:'ready',session:id,initialTime:session.clock(),pose:session.visualPose()});}catch(error){postMessage({kind:'error',error:String(error?.stack??error)});}
self.onmessage=({data:d})=>{try{
 if(fault||!session||d.session!==id||!Number.isSafeInteger(d.command)||d.command!==lastCommand+1)throw Error('Invalid command order');lastCommand=d.command;
 if(d.kind==='pause'){session.pause('diagnostic');postMessage({kind:'pause-ack',session:id,command:d.command,time:session.clock(),pauses:session.pauseReasons()});}
 else if(d.kind==='resume'){if(!session.pauseReasons().includes('diagnostic'))throw Error('Not paused');session.resume('diagnostic');postMessage({kind:'resume-ack',session:id,command:d.command,time:session.clock(),pauses:session.pauseReasons()});}
 else if(d.kind==='step'){
  if(session.pauseReasons().length){postMessage({kind:'rejected',session:id,command:d.command,reason:'paused',time:session.clock()});return;}
  if(d.sequence!==nextStep)throw Error('Invalid step order');nextStep++;const result=session.step(),state=d.final?session.state():null;postMessage({kind:'result',session:id,command:d.command,sequence:d.sequence,result,pose:session.visualPose(),simulationTime:session.clock(),state});
 }else throw Error('Unknown command');
}catch(error){fault=true;postMessage({kind:'error',session:id,command:d?.command,error:String(error?.stack??error)});}};
