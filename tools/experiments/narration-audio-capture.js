// QA only: capture streamed narration without rerouting its audible output or clock.
export function captureNarration(context,destination,voices){
 const report={attached:0,errors:[]},cleanups=new Set(),restores=[];let released=false;
 function watch(element){
  let stream=null,source=null,closed=false;
  const close=()=>{if(closed)return;closed=true;element.removeEventListener('playing',start);element.removeEventListener('emptied',close);stream?.removeEventListener('addtrack',connect);try{source?.disconnect();}catch{}for(const track of stream?.getTracks()??[])track.stop();cleanups.delete(close);};
  const fail=error=>{report.errors.push(String(error?.message??error));close();};
  const connect=()=>{if(closed||source||!stream.getAudioTracks().length)return;try{source=context.createMediaStreamSource(stream);source.connect(destination);report.attached++;}catch(error){fail(error);}};
  const start=()=>{if(closed||stream||released)return;try{if(!element.captureStream)throw Error('Narration captureStream unavailable');stream=element.captureStream();stream.addEventListener('addtrack',connect);connect();}catch(error){fail(error);}};
  cleanups.add(close);element.addEventListener('playing',start);element.addEventListener('emptied',close);
  if(!element.paused&&element.readyState>=3)start();
 }
 for(const voice of new Set(voices)){
  const original=voice.create;
  const wrapped=function(...args){const element=original.apply(this,args);watch(element);return element;};
  voice.create=wrapped;restores.push(()=>{if(voice.create===wrapped)voice.create=original;});
  if(voice.audio)watch(voice.audio);
 }
 return {report,release(){if(released)return;released=true;for(const restore of restores)restore();for(const close of [...cleanups])close();}};
}
