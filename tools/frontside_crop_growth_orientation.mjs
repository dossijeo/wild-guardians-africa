// Offline orientation diagnostic. Uses actual stageSample/iGrowth, no renderer.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';
const folder='docs/qa/frontside-model-pilot/',receipt=JSON.parse(await readFile(folder+'selective-candidate-receipts.json','utf8')).find(r=>r.category==='crops');
const raw=await readFile('public'+receipt.source),bridgeRaw=await readFile('public/content/crop-bridges.json'),bridge=JSON.parse(bridgeRaw);
const sha=b=>createHash('sha256').update(b).digest('hex');if(sha(raw)!==receipt.sourceSha256)throw Error('Source mismatch');
const source=await readFile('src/rendering/crop-batch.js','utf8'),shader=source.match(/const GROWTH_POSITION=`([\s\S]*?)`;/)?.[1];if(!shader)throw Error('Growth shader not found');
// Manual Float64 evaluation of this recorded shader; not a GLSL Float32 emulator.
// An exact shader hash is retained so results cannot silently move to another formula.
const {json,bin}=readGlb(raw);function omitTextures(o){if(!o||typeof o!=='object')return;for(const key of Object.keys(o)){if(key.endsWith('Texture'))delete o[key];else omitTextures(o[key]);}}
omitTextures(json.materials);delete json.images;delete json.textures;
const gltf=await new GLTFLoader().parseAsync(writeGlb(json,bin).buffer,''),scene=new THREE.Scene(),batch=createCropBatch(scene,{capabilities:{getMaxAnisotropy:()=>1}},gltf,bridge,1);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function deform([x,y,z],[growthY,growthR,open,seed],height,clock=1.75){const mask=smooth(.10,.22,y),above=Math.max(0,y-.10),sy=1+(growthY-1)*mask,sr=1+(growthR-1)*mask,leafMask=mask*smooth(.035,.22,Math.hypot(x,z)),fold=1-open,h=Math.max(0,Math.min(1,above/Math.max(.15,height-.10))),wind=(Math.sin(clock*1.55+seed)*.017+Math.sin(clock*2.71+seed*1.7)*.009)*h**1.7*mask;return[x*sr*(1-leafMask*fold*.16)+wind,y+above*(sy-1)+leafMask*fold*(.10+above*.12),z*sr*(1-leafMask*fold*.16)+wind*.47];}
function determinant(point,growth,height,step){const columns=[0,1,2].map(axis=>{const lo=[...point],hi=[...point];lo[axis]-=step;hi[axis]+=step;const a=deform(lo,growth,height),b=deform(hi,growth,height);return b.map((v,i)=>(v-a[i])/(2*step));});const [a,b,c]=columns;return a[0]*(b[1]*c[2]-b[2]*c[1])-b[0]*(a[1]*c[2]-a[2]*c[1])+c[0]*(a[1]*b[2]-a[2]*b[1]);}
const rows=[];
for(const growth of [0,.005,.015,.03,.05,.065,.07,.12,.1675,.20,.27,.40,.53,.655,.78,.89,1]){
 const seconds=growth*cropSpec('maiz').growth_seconds,sample=batch.sample('maiz',seconds);
 batch.update([{id:'qa17',species:'maiz',growth:seconds,x:0,z:0}],1.75,()=>0);
 if(sample.phase==='morph'){rows.push({growth,phase:'morph',status:'BRIDGE_DEFORMATION_NOT_EVALUATED',bridge:sample.bridge});continue;}
 const item=sample.items[0],mesh=scene.children.find(o=>o.isMesh&&o.name===json.nodes.find(n=>n.extras?.cropIndex===0&&n.extras?.stage===item.index+1)?.name);
 if(!mesh||mesh.count!==1)throw Error('Missing actual stage instance');
 const geo=mesh.geometry,p=geo.getAttribute('position'),ix=geo.index,ig=Array.from(geo.getAttribute('iGrowth').array.subarray(0,4)),height=json.nodes.find(n=>n.name===mesh.name).extras.height,labels=bridge.models[item.index].faceLabels;
 const negativeFaces=[],uncertainFaces=[];let minDet=Infinity,maxDet=-Infinity,nondegenerate=0;
 for(let face=0;face<ix.count/3;face++){
  const vertices=[0,1,2].map(c=>{const v=ix.getX(face*3+c);return[p.getX(v),p.getY(v),p.getZ(v)];});
  const cross=new THREE.Vector3().fromArray(vertices[1]).sub(new THREE.Vector3().fromArray(vertices[0])).cross(new THREE.Vector3().fromArray(vertices[2]).sub(new THREE.Vector3().fromArray(vertices[0])));if(cross.lengthSq()===0)continue;nondegenerate++;
  const center=[0,1,2].map(axis=>vertices.reduce((s,v)=>s+v[axis],0)/3),d1=determinant(center,ig,height,1e-6),d2=determinant(center,ig,height,5e-7);minDet=Math.min(minDet,d1);maxDet=Math.max(maxDet,d1);
  if((d1<0)!==(d2<0)||Math.abs(d1-d2)>1e-5||Math.abs(d1)<1e-8)uncertainFaces.push(face);
  else if(d1<0)negativeFaces.push({face,label:labels[face],centroid:center,determinant:d1});
 }
 rows.push({growth,phase:sample.phase,mesh:mesh.name,actualFloat32IGrowth:ig,nondegenerateFaces:nondegenerate,minCentroidDeterminant:minDet,maxCentroidDeterminant:maxDet,negativeCoreFaces:negativeFaces.filter(f=>f.label<2).length,negativeLeafFaces:negativeFaces.filter(f=>f.label>=2).length,negativeFaces,uncertainFaces});
}
batch.dispose();
const report={status:'GROWTH_LOCAL_ORIENTATION_DIAGNOSTIC_NOT_APPROVAL',sourceSha256:sha(raw),bridgeDataSha256:sha(bridgeRaw),cropBatchSha256:sha(source),growthShaderSha256:sha(shader),growthShader:shader,clock:1.75,seed:17,rows,limitations:['Actual stageSample and uploaded Float32 iGrowth from production createCropBatch, but formula evaluated in CPU Float64.', 'Finite-difference Jacobian at face centroid diagnoses local orientation only; not a discrete triangle raster winding or Front coverage proof.', 'Bridge deformation excluded explicitly. No geometry, growth shader, asset, material side or production path modified.', 'Negative local orientation can invalidate a rest-pose volume assumption; it does not authorize indiscriminate reverse faces or geometry promotion.']};
await writeFile(folder+'maize-growth-local-orientation-diagnostic.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows.map(({negativeFaces,...r})=>r)));
