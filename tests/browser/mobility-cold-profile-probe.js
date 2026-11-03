// QA-only native collision queries on deterministic actor positions and the ruined center.
export function probeColdProfileWorld(simulation){
 const {game,session}=simulation.diagnosticWorld(),center=game.structures.find(s=>s.kind==='center');
 if(!center||!game.raid?.animals?.length)throw Error('Missing diagnostic actors or center');
 const target={x:center.x,z:center.z};
 return game.raid.animals.map(a=>{const from={x:a.x,z:a.z},options={worker:false,species:a.species},shortSteps=[[.5,0],[-.5,0],[0,.5],[0,-.5]].map(([dx,dz])=>session.actorStepClear(from,{x:from.x+dx,z:from.z+dz},options));return {id:a.id,species:a.species,from,canStand:session.actorCanStand(from,options),stationaryClear:session.actorStepClear(from,from,options),centerStand:session.actorCanStand(target,options),directClear:session.actorStepClear(from,target,options),shortSteps};});
}
