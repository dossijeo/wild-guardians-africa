import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {Vector3} from 'three';
import {actorGeometry} from '../../tests/helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';
import {BeastRecovery} from '../../src/rendering/beast-recovery.js';
const path='src/rendering/beast-recovery.js',base=pathToFileURL(process.cwd()+'/'+path);
const source=execFileSync('git',['show','0d4e3b224:'+path],{encoding:'utf8'}).replace(/from 'three'/g,"from '"+import.meta.resolve('three')+"'").replace(/from '(\.[^']+)'/g,(_,s)=>"from '"+new URL(s,base).href+"'");
const Previous=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).BeastRecovery;
const result={scope:'Node static standing-pose sparse skin support scan, not whole recovery, browser frames or terrain query performance',baseline:'0d4e3b224',iterationsPerBlock:100,pairedBlocks:30,species:{}};
const quantile=(a,q)=>[...a].sort((a,b)=>a-b)[Math.floor((a.length-1)*q)];
for(const species of ['hyena','lion','warthog','buffalo','rhino']){
 const model=await actorGeometry('public'+ANIMAL_ACTIONS.animals[species].url);model.updateMatrixWorld(true);
 const sets=[Previous.contactSamples(model),BeastRecovery.contactSamples(model)],p=new Vector3();
 const scan=samples=>{let minimum=Infinity;for(const {mesh,index}of samples){mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,p.y);}return minimum;};
 for(let i=0;i<100;i++)for(const set of sets)scan(set);
 const rows=[];let checksum=0;for(let i=0;i<30;i++){const row=[];for(const j of i%2?[1,0]:[0,1]){const start=performance.now();for(let k=0;k<100;k++)checksum+=scan(sets[j]);row[j]=(performance.now()-start)/100;}rows.push(row);}
 result.species[species]={samples:sets.map(s=>s.length),medianMs:[0,1].map(j=>quantile(rows.map(r=>r[j]),.5)),p95BlockMeanMs:[0,1].map(j=>quantile(rows.map(r=>r[j]),.95)),checksum,rows};
}
console.log(JSON.stringify(result,null,2));
