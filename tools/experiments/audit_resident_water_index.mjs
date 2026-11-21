import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {SpatialSurfaceView} from '../../src/world/wild-engine/spatial-surface-view.js';

// Diagnostic only: indexing the rendered water triangles does not certify the
// continuous native water predicate. Do not use this as a gameplay surface.
function indexWater(positions,cx,cz,margin=.05){
 const cells=new Map();let references=0;
 for(let i=0;i<positions.length;i+=9){const x0=Math.max(0,Math.floor(Math.min(positions[i],positions[i+3],positions[i+6])+24)),x1=Math.min(47,Math.floor(Math.max(positions[i],positions[i+3],positions[i+6])+24)),z0=Math.max(0,Math.floor(Math.min(positions[i+2],positions[i+5],positions[i+8])+24)),z1=Math.min(47,Math.floor(Math.max(positions[i+2],positions[i+5],positions[i+8])+24));for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const key=z*48+x,list=cells.get(key);if(list)list.push(i);else cells.set(key,[i]);references++;}}
 function height(x,z){const lx=x-cx*48,lz=z-cz*48,gx=Math.floor(lx+24),gz=Math.floor(lz+24);if(gx<0||gx>=48||gz<0||gz>=48)return null;let highest=null;for(const i of cells.get(gz*48+gx)??[]){const ax=positions[i],az=positions[i+2],bx=positions[i+3],bz=positions[i+5],qx=positions[i+6],qz=positions[i+8],den=(bz-qz)*(ax-qx)+(qx-bx)*(az-qz);if(Math.abs(den)<1e-12)continue;const u=((bz-qz)*(lx-qx)+(qx-bx)*(lz-qz))/den,v=((qz-az)*(lx-qx)+(ax-qx)*(lz-qz))/den,w=1-u-v;if(u< -1e-9||v< -1e-9||w< -1e-9)continue;const h=u*positions[i+1]+v*positions[i+4]+w*positions[i+7];if(highest===null||h>highest)highest=h;}return highest;}
 return {height,sample(x,z,lookup=height){const h=height(x,z);if(h===null)return null;for(const [dx,dz] of [[-margin,0],[margin,0],[0,-margin],[0,margin],[-margin,-margin],[-margin,margin],[margin,-margin],[margin,margin]]){const next=lookup(x+dx,z+dz);if(next===null||next===undefined||Math.abs(next-h)>.001)return null;}return h;},status(){return {triangles:positions.length/9,cells:cells.size,references};}};
}

const wasm=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),runs=[];
for(const seed of [28,712]){
 const core=createSpatialWorld(wasm);core.generate(seed,0,0,'canyons');const chunks=[];for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(core.selectChunk(x,z)<0)core.addChunk(x,z);chunks.push(core.chunkPayload());}
 const view=new SpatialSurfaceView(),indexes=new Map(),buildStart=performance.now();for(const chunk of chunks){view.install(chunk);indexes.set(`${chunk.cx},${chunk.cz}`,indexWater(chunk.water,chunk.cx,chunk.cz));}const buildMs=performance.now()-buildStart,center=indexes.get('0,0'),lookup=(x,z)=>indexes.get(`${Math.floor((x+24)/48)},${Math.floor((z+24)/48)}`)?.height(x,z)??null;
 let random=481,singleErrors=0,neighbourErrors=0,singleMax=0,neighbourMax=0,regressions=0,improved=0;const points=[];
 for(let i=0;i<200000;i++){
  random=(Math.imul(random,1664525)+1013904223)>>>0;const x=random/4294967296*47.999-23.9995;random=(Math.imul(random,1664525)+1013904223)>>>0;const z=random/4294967296*47.999-23.9995,ground=view.surface(x,z),nativeGround=core.surfaceAnywhere(x,z),level=core.fluidLevelAnywhere(x,z),expected=level>0?Math.max(nativeGround,level-.1):nativeGround,single=center.sample(x,z),neighbour=center.sample(x,z,lookup),singleValue=single===null?ground:Math.max(ground,single-.1),neighbourValue=neighbour===null?ground:Math.max(ground,neighbour-.1),singleError=Math.abs(singleValue-expected),neighbourError=Math.abs(neighbourValue-expected),baselineError=Math.abs(ground-expected);
  if(singleError>.05){singleErrors++;singleMax=Math.max(singleMax,singleError);}if(neighbourError>.05){neighbourErrors++;neighbourMax=Math.max(neighbourMax,neighbourError);}if(neighbourError>baselineError+.00005)regressions++;if(neighbourError+.00005<baselineError)improved++;if(i<10000)points.push([x,z]);
 }
 let checksum=0,start=performance.now();for(const [x,z] of points)checksum+=view.surface(x,z);const groundMs=performance.now()-start;start=performance.now();for(const [x,z] of points){checksum+=view.surface(x,z);checksum+=center.sample(x,z,lookup)??0;}const groundAndWaterMs=performance.now()-start;
 runs.push({seed,chunks:chunks.length,points:200000,buildMs,singleErrors,singleMax,neighbourErrors,neighbourMax,regressions,improved,queryPoints:points.length,groundMs,groundAndWaterMs,checksum,indexes:[...indexes.values()].map(index=>index.status()).reduce((a,s)=>({triangles:a.triangles+s.triangles,cells:a.cells+s.cells,references:a.references+s.references}),{triangles:0,cells:0,references:0})});
}
console.log(JSON.stringify({runs,scope:'Node/WASM diagnostic of rendered water triangles against native canyon surface; no GPU, game frame or exhaustive shoreline proof. Single-chunk fallback lacks neighbours; the 3x3 case uses only resident triangles.'}));
