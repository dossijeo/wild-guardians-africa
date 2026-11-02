// Diagnostic only: intercept coordinate assignments without changing their values.
// X/Z writes are paired until both axes have been assigned or a repeated axis
// starts a new pair. This is not an authoritative movement event stream.
export function observeCoordinateWrites(actors,{stacks=false}={}){
 let active=null;const flush=entry=>{if(!entry.pending)return;const p=entry.pending;active?.push({id:entry.id,from:p.from,to:{x:entry.x,z:entry.z},axes:p.axes,...(stacks?{origin:p.origin}:{})});entry.pending=null;};
 const entries=actors.map(actor=>{const entry={id:actor.id,x:actor.x,z:actor.z,pending:null};for(const axis of ['x','z']){const descriptor=Object.getOwnPropertyDescriptor(actor,axis);if(!descriptor?.configurable||!descriptor.writable||!descriptor.enumerable)throw Error('Unsupported coordinate descriptor');Object.defineProperty(actor,axis,{enumerable:true,configurable:true,get:()=>entry[axis],set:value=>{if(active){if(entry.pending?.axes.includes(axis))flush(entry);if(!entry.pending)entry.pending={from:{x:entry.x,z:entry.z},axes:'',...(stacks?{origin:String(new Error().stack).split('\n').slice(2,4).map(x=>x.trim()).join(' | ')}:{})};entry.pending.axes+=axis;}entry[axis]=value;if(active&&entry.pending.axes.length===2)flush(entry);}});}return entry;});
 return {begin(){if(active)throw Error('Recording already active');active=[];},end(){if(!active)throw Error('Recording not active');for(const entry of entries)flush(entry);const result=active;active=null;return result;}};
}
