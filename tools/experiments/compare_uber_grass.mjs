import {readFile} from 'node:fs/promises';
const [originalPath,sharedPath,swappedOriginalPath,swappedSharedPath]=process.argv.slice(2);if(!swappedSharedPath)throw Error('Usage: node compare_uber_grass.mjs ORIGINAL SHARED SWAPPED_ORIGINAL SWAPPED_SHARED');
const [a,b,c,d]=await Promise.all([originalPath,sharedPath,swappedOriginalPath,swappedSharedPath].map(async path=>JSON.parse(await readFile(path,'utf8'))));
for(const r of [a,b,c,d])if(r.backend!=='WebGPU real'||r.errors.length||r.frames.length!==8||r.scenes.length!==2)throw Error('Incomplete WebGPU run');
if(a.shared||!b.shared||c.shared||!d.shared||a.swapped||b.swapped||!c.swapped||!d.swapped)throw Error('Invalid test variants');
for(let i=0;i<8;i++){const x=a.frames[i],y=b.frames[i],u=c.frames[i],v=d.frames[i];if([y,u,v].some(z=>z.biome!==x.biome||z.frame!==x.frame||z.time!==x.time||z.night!==x.night||z.drawCalls!==x.drawCalls||z.triangles!==x.triangles))throw Error(`Scenario mismatch ${i}`);if(x.sha256!==y.sha256||u.sha256!==v.sha256||x.sha256===u.sha256)throw Error(`Visual or texture control mismatch ${i}`);}
if(b.frames[1].pipelines>=a.frames[1].pipelines||b.frames.slice(2).some(f=>f.pipelines!==b.frames[1].pipelines))throw Error('Expected pipeline reuse was not observed');
console.log('Eight day/night images match, swapped-texture controls match and change all images, and the second biome reuses the shared pipeline.');
