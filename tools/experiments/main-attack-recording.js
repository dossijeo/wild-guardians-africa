import {captureGameAudio} from './game-audio-capture.js';
// Local QA recording only. The receiver accepts a fixed, review-only filename.
export function startMainAttackRecording(canvas,audio){
 const stream=canvas.captureStream(30),chunks=[];let tap=null,audioError=null,stopped=false;
 try{tap=captureGameAudio(audio);for(const track of tap.stream.getAudioTracks())stream.addTrack(track);}catch(error){audioError=error.message;}
 const mimeType=['video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
 let recorder;
 const release=()=>{tap?.release();for(const track of stream.getTracks())track.stop();};
 try{recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:6000000});}catch(error){release();throw error;}
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 const done=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=e=>reject(e.error??new Error('MediaRecorder error'));});
 recorder.start(1000);const began=performance.now();
 return {async stop(){if(stopped)return;stopped=true;try{recorder.stop();await done;const blob=new Blob(chunks,{type:recorder.mimeType});const response=await fetch('http://127.0.0.1:5206/combat-cycle.webm',{method:'POST',body:blob});if(!response.ok)throw Error('Recording receiver: '+response.status);return {saved:true,bytes:blob.size,audio:!!tap,audioError,wallSeconds:(performance.now()-began)/1000,scope:'Real canvas, synthetic UI input, no simulation clock override'};}finally{release();}}};
}
