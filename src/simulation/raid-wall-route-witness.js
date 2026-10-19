// An entry decision is short-lived: reuse only positive routes proved against
// its unchanged native topology. A directed physical segment from another
// birth to that route's origin composes a valid route to the same wall side.
export function createWallRouteWitness(nav,onNativeRoute){
  const byDestination=new Map();
  const maxWitnesses=8;
  return (start,side,radius)=>{
    const key=`${radius}|${side.wallId??''}|${side.x}|${side.z}`;
    const witnesses=byDestination.get(key);
    if(witnesses&&nav.segmentClear)for(const witness of witnesses)
      if(nav.segmentClear(start,witness,radius,null,false))return 'found';
    const began=onNativeRoute?performance.now():0;
    const status=nav.spatialRouteStatus(start,side,radius);
    onNativeRoute?.(performance.now()-began);
    if(status==='found'){
      if(witnesses){if(witnesses.length<maxWitnesses)witnesses.push(start);}
      else byDestination.set(key,[start]);
    }
    return status;
  };
}
