// Local input IDs belong to a graphical port, not to the simulation session.
// Internal IDs stay unique while old commands can still be in flight.
export function createPresentationInputRouter({submit,isAllowed}){
 if(typeof submit!=='function'||typeof isAllowed!=='function')throw TypeError('Invalid presentation input router');
 let next=1;const owners=new Map();
 return {
  forStream(getStream){
   if(typeof getStream!=='function')throw TypeError('Invalid presentation stream');
   let last=0;
   return data=>{
    const stream=getStream(),fail=error=>{try{stream?.sendInputFailure(data?.id,error);}catch{}};
    if(!Number.isSafeInteger(data?.id)||data.id<=last){fail(Error('Stale presentation input'));return;}
    last=data.id;
    if(!isAllowed(data.command)){fail(Error('Invalid presentation input command'));return;}
    if(!Number.isSafeInteger(next)){fail(Error('Presentation input identity exhausted'));return;}
    const internal=next++,owner={stream,id:data.id};owners.set(internal,owner);
    let completion;try{completion=submit(data.command,internal);}catch(error){owners.delete(internal);fail(error);return;}
    Promise.resolve(completion).then(()=>owners.delete(internal),error=>{owners.delete(internal);fail(error);});
   };
  },
  // A result belongs only to the same still-attached graphical generation.
  receipt(internal,stream){const owner=owners.get(internal);return owner&&owner.stream===stream&&!stream?.status().detached?owner.id:undefined;},
  clear(){owners.clear();},
 };
}
