import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const reference=resolve(process.argv[2]??''),candidate=resolve(process.argv[3]??'');
assert.ok(process.argv[2]&&process.argv[3],'Pass frozen reference and NEW candidate roots');
assert.ok(!existsSync(candidate),'Candidate destination must not exist');
const file=resolve(reference,'src/world/terrain.js'),source=readFileSync(file,'utf8');
const start=source.indexOf(' naturalHeight(x,z){');assert.ok(start>=0);
const at=source.indexOf('   const d=this.pondMetric(x,z,p);',start);assert.ok(at>start);
const addition=`   // Exact native circular/axis-aligned pond rejection; overridden metric
   // implementations keep their original semantics and invocation order.
   if(this.pondMetric===TerrainField.prototype.pondMetric&&!(p.angle||0)&&
     (Math.abs((x-p.x)/Math.max(.01,p.radiusX||p.radius))>=1.8||Math.abs((z-p.z)/Math.max(.01,p.radiusZ||p.radius))>=1.8))continue;
`;
mkdirSync(candidate,{recursive:true});cpSync(resolve(reference,'src'),resolve(candidate,'src'),{recursive:true});
cpSync(resolve(reference,'package.json'),resolve(candidate,'package.json'));
writeFileSync(resolve(candidate,'src/world/terrain.js'),(source.slice(0,at)+addition+source.slice(at)).replace(/\r\n/g,'\n'));
console.log(JSON.stringify({reference,candidate,productionChanged:false,scope:'Candidate preparation only; no performance or visual acceptance.'}));
