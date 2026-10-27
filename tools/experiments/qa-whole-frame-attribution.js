// QA only: observe the existing presentation-owned scheduler; create no RAF loop.
export async function installWholeFrameAttribution(){
 const {globalFrameScheduler:s}=await import('/src/app/global-frame-scheduler.js');
 const begin=s.beginFrame,end=s.endFrame,frames=[],longFrames=[];let open=null,dropped=0;
 const wrappedBegin=function(timestamp,...args){if(open)dropped++;open={timestamp,start:performance.now()};return begin.call(this,timestamp,...args);};
 const wrappedEnd=function(...args){const beforeEnd=performance.now();try{return end.apply(this,args);}finally{if(open){frames.push({...open,beforeEnd,end:performance.now()});open=null;}}};
 s.beginFrame=wrappedBegin;s.endFrame=wrappedEnd;
 const supported=PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');let observer=null;
 const collect=entries=>{for(const e of entries)longFrames.push(e.toJSON());};
 if(supported){observer=new PerformanceObserver(list=>collect(list.getEntries()));observer.observe({type:'long-animation-frame',buffered:false});}
 return ()=>{if(observer){collect(observer.takeRecords());observer.disconnect();}if(s.beginFrame===wrappedBegin)s.beginFrame=begin;if(s.endFrame===wrappedEnd)s.endFrame=end;return {frames,longFrames,supported,dropped,scope:'Existing scheduler begin/end encloses synchronous main frame callback. beforeEnd separates optional endFrame work. Does not include browser work or asynchronous continuations outside the callback. Long Animation Frame entries cover only browser-reported slow frames, not GPU execution.'};};
}
