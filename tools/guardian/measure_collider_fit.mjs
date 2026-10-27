import fs from 'node:fs';
import {beastSkin} from '../../tests/helpers/beast-skin.js';
import {BeastRagdollBinding} from '../../src/rendering/beast-ragdoll-binding.js';
const rows=[];
for(const species of ['hyena','warthog','lion','buffalo','rhino']){
 const model=beastSkin(species),binding=new BeastRagdollBinding(model);binding.capture();binding.colliders();const times=[];let fit;
 for(let i=0;i<40;i++){const start=performance.now();fit=binding.colliders();times.push(performance.now()-start);}
 times.sort((a,b)=>a-b);rows.push({species,median:times[20],p95:times[38],max:times[39],fit});
}
fs.writeFileSync(process.argv[2],JSON.stringify({scope:'Node warm rest-pose collider fit only; no GPU or game benchmark',rows},null,2));console.log(rows.map(({fit,...r})=>r));
