import {REVISION} from 'three';
// Experimental adapter for Three 0.180's reference-counted WebGLPrograms.
// Pins only the already-warmed snapshot; never accumulates future variants.
// The cap counts programs, not driver bytes (WebGL exposes no allocation size).
export function retainWarmedPrograms(renderer,{limit=96,revision=REVISION,newestFirst=false,select=()=>true}={}){
 if(typeof select!=='function')throw TypeError('Invalid program selection');
 if(!Number.isSafeInteger(limit)||limit<0)throw RangeError('Invalid program retention limit');
 const programs=renderer.info?.programs;
 const stats={retained:0,released:0,destroyed:0,abandoned:0,skipped:0,unsupported:false};
 const pinned=[];let disposed=false;
 if(revision!=='180'||!Array.isArray(programs)){stats.unsupported=true;return {stats,dispose(){}};}
 const candidates=[...new Set(programs)].filter(select);
 if(newestFirst)candidates.sort((a,b)=>(b.id??0)-(a.id??0));
 for(const program of candidates){
  if(pinned.length>=limit){stats.skipped++;continue;}
  if(!Number.isSafeInteger(program.usedTimes)||program.usedTimes<1||typeof program.destroy!=='function'){stats.unsupported=true;stats.skipped++;continue;}
  program.usedTimes++;pinned.push(program);stats.retained++;
 }
 return {stats,dispose(){
  if(disposed)return;disposed=true;
  if(renderer.info?.programs!==programs||renderer.getContext?.().isContextLost?.()){stats.abandoned=pinned.length;pinned.length=0;return;}
  for(const program of pinned){
   const index=programs.indexOf(program);
   // Renderer/context teardown may already have removed the old collection.
   if(index<0)continue;
   program.usedTimes--;stats.released++;
   if(program.usedTimes===0){programs[index]=programs[programs.length-1];programs.pop();program.destroy();stats.destroyed++;}
  }
  pinned.length=0;
 }};
}
