// QA-only native collision queries on deterministic actor positions and the ruined center.
export function probeColdProfileWorld(simulation){
 const {game,session}=simulation.diagnosticWorld(),center=game.structures.find(s=>s.kind==='center');
 if(!center||!game.raid?.animals?.length)throw Error('Missing diagnostic actors or center');
 const target={x:center.x,z:center.z};
 return game.raid.animals.map(a=>{const from={x:a.x,z:a.z},options={worker:false,species:a.species};return {id:a.id,species:a.species,from,canStand:session.actorCanStand(from,options),stationaryClear:session.actorStepClear(from,from,options),centerStand:session.actorCanStand(target,options),directClear:session.actorStepClear(from,target,options)};});
}
