import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=path.join(root,'public/content/lighting/global-ao');
const banks=readdirSync(dir).filter(n=>n.endsWith('.bin')).sort().map(name=>{
 const data=readFileSync(path.join(dir,name));
 const metadata=readFileSync(path.join(dir,name.replace(/\.bin$/,'.json')));
 const meta=JSON.parse(metadata);
 const sha256=createHash('sha256').update(data).digest('hex');
 if(meta.byteLength!==data.length||meta.outputSHA256!==sha256)throw Error(`Bank integrity mismatch: ${name}`);
 const group=name.startsWith('village-')?'villages':name.startsWith('model-crop')?'crops':name==='model-guardian.bin'?'guardian':name.startsWith('model-')?'actors':name==='walls.bin'?'walls':'biomeProps';
 return {name,group,bytes:data.length,metadataBytes:metadata.length,records:meta.records.length,sha256};
});
const groups={};
for(const bank of banks){const g=groups[bank.group]??={banks:0,bytes:0,metadataBytes:0};g.banks++;g.bytes+=bank.bytes;g.metadataBytes+=bank.metadataBytes;}
const catalogueBytes=readFileSync(path.join(dir,'models.json')).length;
const report={scope:'All optional globalAO banks on disk; not per-scene downloads, transfer compression, GPU residency or a performance benchmark.',binaryBytes:banks.reduce((s,b)=>s+b.bytes,0),metadataBytes:banks.reduce((s,b)=>s+b.metadataBytes,0)+catalogueBytes,catalogueBytes,exclusions:['Existing work-center AO textures','Impostor atlases','Terrain contact atlas','GPU/CPU clones and expanded wall attributes'],groups,banks};
const output=path.join(root,'docs/lighting/global-ao/resource-inventory.json');
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,binaryBytes:report.binaryBytes,metadataBytes:report.metadataBytes,groups},null,2));
