import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const source=await fs.readFile('src/rendering/vfx-native.js','utf8');
const old='function fxTri(a,b,c,col,alpha,kind=0,normals=null){if(alpha<.003)return;const n=normals||[V.norm(V.cross(V.sub(b,a),V.sub(c,a)))];for(const [i,p]of[a,b,c].entries())fxVertices.push(...p,...(n[i]||n[0]),...col,alpha,kind);}';
const replacement=`function fxTri(a,b,c,col,alpha,kind=0,normals=null){
 if(alpha<.003)return;
 let nx,ny,nz;
 if(!normals){const bx=b[0]-a[0],by=b[1]-a[1],bz=b[2]-a[2],cx=c[0]-a[0],cy=c[1]-a[1],cz=c[2]-a[2];nx=by*cz-bz*cy;ny=bz*cx-bx*cz;nz=bx*cy-by*cx;const length=Math.hypot(nx,ny,nz)||1;nx/=length;ny/=length;nz/=length;}
 for(let i=0;i<3;i++){const p=i===0?a:i===1?b:c,n=normals&&(normals[i]||normals[0]);fxVertices.push(p[0],p[1],p[2],n?n[0]:nx,n?n[1]:ny,n?n[2]:nz,col[0],col[1],col[2],alpha,kind);}
}`;
assert(source.includes(old),'Reference implementation changed');
const candidate=source.replace(old,replacement);
await fs.mkdir('docs/qa/mangrove-magic-20261026/vfx-triangle-candidate',{recursive:true});
await fs.writeFile('docs/qa/mangrove-magic-20261026/vfx-triangle-candidate/vfx-native.mjs',candidate);
const load=text=>import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
const A=await load(source),B=await load(candidate),assets=JSON.parse(await fs.readFile('public/content/vfx.json','utf8')),manifest=JSON.parse(await fs.readFile('content/manifests/vfx-native.json','utf8'));
const rects=A.createVfxAtlasRects(assets,...manifest.atlasDimensions),rows=[];
for(const def of A.vfxDefinitions)for(const time of [0,.1,.5,1,2,4,8]){const a=A.createNativeVfx(def.id,rects),b=B.createNativeVfx(def.id,rects);a.seek(time);b.seek(time);assert.deepEqual(b.geometry(),a.geometry(),`${def.id}@${time}`);rows.push({id:def.id,time});}
const timings=[];
for(const mode of ['A','B','A','B']){const module=mode==='A'?A:B,effect=module.createNativeVfx('shield',rects);effect.seek(2);for(let i=0;i<20;i++)effect.geometry();const start=performance.now();for(let i=0;i<300;i++)effect.geometry();timings.push({mode,ms:performance.now()-start});}
const report={equivalentCases:rows.length,timings,scope:'Node geometry-only microbenchmark; not renderer or frame performance. Candidate remains QA-only.'};
await fs.writeFile('docs/qa/mangrove-magic-20261026/vfx-triangle-candidate/report.json',JSON.stringify(report,null,2));console.log(report);
