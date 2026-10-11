// One positive static certificate per native proof view. Workers are deliberately
// excluded: their access is checked separately on every query.
const entries=new WeakMap();
export function staticAnimalCertificate(state,view,plan,bounds,outline,compute,{cache=true}={}){
 const field=view.field;
 const signature=JSON.stringify([view.version,plan,bounds,outline,
  view.obstacles,state.structures,state.villages,state.culture,state.suppressed,
  state.plants.filter(p=>p.alive).map(p=>[p.id,p.x,p.z,p.kind,p.centerId,p.species]),
  field?.c,field?.settlementSite,field?.seed,field?.phase,field?.riverLevel,
  field?.canyon,field?.riverActive,field?.pondsActive,field?.wetland,field?.desert,field?.featureCell]);
 const methods=[field,field?.heightCache,field?.height,field?.surface,field?.slope,field?.waterInfo,
  field?.raw,field?.naturalHeight,field?.riverBase,field?.riverX,field?.nearbyPonds,
  view.walkable,view.segmentClear,view.approachPath,view.approachGroupBlocked,view.testWalkable,view.testSegmentClear,
  view.terrainValid,view.propsAt];
 const old=cache?entries.get(view):null;
 if(old?.state===state&&old.signature===signature&&methods.every((value,i)=>value===old.methods[i]))return structuredClone(old.proof);
 const proof=compute();
 if(cache&&proof.valid===true)entries.set(view,{state,signature,methods,proof:structuredClone(proof)});
 else entries.delete(view);
 return proof;
}
