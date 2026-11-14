import fs from 'node:fs';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
const report=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const worst=new Map();for(const frame of report.report.peerFrameTrace)for(const actor of frame.actors){const s=actor.exitSupport;if(s&&(!worst.has(actor.id)||s.minimum<worst.get(actor.id).minimum))worst.set(actor.id,s);}
const species=report.report.actorSpecies,models=new Map();
for(const [id,s]of worst){const name=species[Number(id.split('-').at(-1))];let model=models.get(name);if(!model){model=await actorGeometry(new URL('../../public'+ANIMAL_ACTIONS.animals[name].url,import.meta.url));models.set(name,model);}const mesh=model.getObjectByName(s.limiter.mesh),i=s.limiter.index,a=mesh.geometry.attributes;console.log(JSON.stringify({id,species:name,...s,weights:Array.from({length:4},(_,k)=>({bone:mesh.skeleton.bones[a.skinIndex.getComponent(i,k)].name,weight:a.skinWeight.getComponent(i,k)}))}));}
