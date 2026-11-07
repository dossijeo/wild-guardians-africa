// Preserve the real media clock, including pauses and seeks. When audio is
// deliberately muted, the authored cues can follow the visible message instead.
export function guardianNarrationAudio(voice,record,age){
  if(voice?.audio)return voice.audio;
  if(voice?.status==='fallback'&&voice.failure==='muted'&&record)return {currentTime:Math.max(0,age),ended:false,paused:false};
  return null;
}
