import {captureNarration} from './narration-audio-capture.js';
// Explicit development-only tap. Never changes the audible output connections.
export function captureGameAudio(audio,voices=[]){
 if(audio.context?.state!=='running'||!audio.sfxGain||!audio.musicGain)throw Error('Game audio is not unlocked');
 const destination=audio.context.createMediaStreamDestination(),nodes=[audio.sfxGain,audio.musicGain];let released=false;
 const narration=captureNarration(audio.context,destination,voices);
 const release=()=>{if(released)return;released=true;narration.release();for(const node of nodes){try{node.disconnect(destination);}catch{}}for(const track of destination.stream.getTracks())track.stop();};
 try{for(const node of nodes)node.connect(destination);}catch(error){release();throw error;}
 return {stream:destination.stream,release,narration:narration.report};
}
export function installGameAudioCapture(target,audio,readState,readVoices=()=>[]){
 const handler=event=>{let tap;try{tap=captureGameAudio(audio,readVoices());if(readState)tap.readState=readState;event.detail.accept(tap);}catch(error){tap?.release();event.detail.reject(error);}};
 target.addEventListener('guardian-qa-capture-audio',handler);
 return ()=>target.removeEventListener('guardian-qa-capture-audio',handler);
}
