// Candidate only: histories append new immutable-ID members in gameplay.
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
assert.ok(process.argv[2]&&process.argv[3],'Pass frozen source and NEW candidate roots');
const source=resolve(process.argv[2]),dest=resolve(process.argv[3]);assert.ok(!existsSync(dest));
let helper=readFileSync(resolve(source,'src/simulation/worker-entity-lookup.js'),'utf8');
const replace=(from,to)=>{assert.equal(helper.split(from).length,2,from);helper=helper.replace(from,to);};
replace('{reuse=false}={}', '{reuse=false,appendOnly=false}={}');
// A temporary small collection must retire a previous large-history index.
// Otherwise a later growth back to its former size could reuse removed IDs.
replace('if(length<64)return collection.find(entity=>entity.id===id);',
 'if(length<64){if(reuse)historyIndexes.delete(collection);return collection.find(entity=>entity.id===id);}');
replace('if(cached)historyIndexes.delete(collection);',`if(appendOnly&&cached&&cached.length<length){
   for(let i=cached.length;i<length;i++){const entity=collection[i];if(!cached.index.has(entity.id))cached.index.set(entity.id,entity);}
   cached.length=length;index=cached.index;return index.get(id);
  }if(cached)historyIndexes.delete(collection);`);
let game=readFileSync(resolve(source,'src/simulation/game.js'),'utf8');
for(const group of ['plants','crates']){
 const from=`workerEntityLookup(()=>s.${group},{reuse:true})`;assert.equal(game.split(from).length,2);
 game=game.replace(from,`workerEntityLookup(()=>s.${group},{reuse:true,appendOnly:true})`);
}
mkdirSync(dest,{recursive:true});cpSync(resolve(source,'src'),resolve(dest,'src'),{recursive:true});cpSync(resolve(source,'package.json'),resolve(dest,'package.json'));
writeFileSync(resolve(dest,'src/simulation/worker-entity-lookup.js'),helper);writeFileSync(resolve(dest,'src/simulation/game.js'),game);
console.log(JSON.stringify({source,dest,scope:'Experimental append-only histories; no production change or performance acceptance'}));
