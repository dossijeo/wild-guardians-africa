import {ashMask} from './qa-volcanic-ash-mask.js';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const src=new Uint8Array(4900).fill(123);
for(const [x,z]of [[0,0],[-48,-96],[192,240]]){
 const a=ashMask(src,{minX:x,minZ:z}),b=ashMask(src,{minX:x+48,minZ:z}),c=ashMask(src,{minX:x,minZ:z+48});
 for(let row=0;row<35;row++)for(let edge=0;edge<3;edge++){
  assert.equal(a[(row*35+edge+32)*4],b[(row*35+edge)*4]);
  assert.equal(a[((edge+32)*35+row)*4],c[(edge*35+row)*4]);
 }
 for(let i=0;i<4900;i++){assert.equal(src[i],123);if(i%4)assert.equal(a[i],123);}
 assert.deepEqual(a,ashMask(src,{minX:x,minZ:z}));
}
assert.throws(()=>ashMask(new Uint8Array(4),{minX:0,minZ:0}));
const start=performance.now();for(let i=0;i<100;i++)ashMask(src,{minX:i*48,minZ:-48});
const result={checks:['horizontal and vertical overlap including negative coordinates','borrowed input unchanged','other channels unchanged','deterministic rebuild','invalid size rejected'],cpuMsPerMask:(performance.now()-start)/100,note:'Node CPU microbenchmark, not browser streaming latency; 100 allocations of 4900 bytes, no GPU work.'};
const out='docs/qa/global-visual-lab/volcanic-ash-mask';await mkdir(out,{recursive:true});await writeFile(out+'/mask-checks.json',JSON.stringify(result,null,2)+'\n');console.log(result);
