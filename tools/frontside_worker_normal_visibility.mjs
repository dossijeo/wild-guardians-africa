// CPU training-view guidance only. No GPU draw, maps, pixel coverage or acceptance.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readGlb,writeGlb} from './glb-container.mjs';
import {sampleFixedPose} from '../src/rendering/fixed-pose.js';
import {syncWorkerToolVisibility} from '../src/rendering/worker-tool-visibility.js';
const folder='docs/qa/frontside-model-pilot/',library=JSON.parse(await readFile('public/content/worker-actions.json','utf8')).youngMale;
const raw=await readFile('public'+library.url);
if(createHash('sha256').update(raw).digest('hex')!==library.sha256)throw Error('Source hash mismatch');
const {json,bin}=readGlb(raw),diagnostic=JSON.parse(await readFile(folder+'worker-zero-normal-diagnostics.json','utf8'));
if(diagnostic.sourceSha256!==library.sha256)throw Error('Normal diagnostic source mismatch');
// Textures are omitted in this in-memory CPU clone only, avoiding DOM/image loads.
// Positions/indices/rig/animations/material side stay original; no export is saved.
function omitTextures(o){if(!o||typeof o!=='object')return;for(const key of Object.keys(o)){if(key.endsWith('Texture'))delete o[key];else omitTextures(o[key]);}}
omitTextures(json.materials);delete json.images;delete json.textures;
const bytes=writeGlb(json,bin),gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');
const model=gltf.scene,data={model,mixer:new THREE.AnimationMixer(model),action:null},target=model.getObjectByName('Can_badge_geometry_5');
if(!target?.isMesh||target.isSkinnedMesh)throw Error('Expected rigid Badge5 accessory');
const affected=diagnostic.meshes.find(m=>m.mesh===target.name).affectedFaces,rows=[];
const closeup=process.argv.includes('--closeup');if(process.argv.slice(2).some(a=>a!=='--closeup'))throw Error('Unknown guidance option');
const camera=new THREE.PerspectiveCamera(42,1,.01,100),ray=new THREE.Raycaster(),point=new THREE.Vector3(),normal=new THREE.Vector3();
const corners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
for(const fraction of [.40625,.90625]){
 data.action?.stop();const clip=gltf.animations.find(c=>c.name==='Water');
 data.action=data.mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce,1).play();data.action.paused=true;data.action.clampWhenFinished=true;
 sampleFixedPose(data,clip.duration*fraction,true);syncWorkerToolVisibility(data,true);model.updateMatrixWorld(true);
 const meshes=[];model.traverseVisible(o=>{if(o.isMesh){if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();}meshes.push(o);}});
 const box=new THREE.Box3().setFromObject(closeup?target:model),center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()*.5;
 for(const elevation of [37.5,67.5])for(const azimuth of [54.375,144.375,234.375,324.375]){
  const a=azimuth*Math.PI/180,e=elevation*Math.PI/180;camera.position.copy(center).add(new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)).multiplyScalar(radius*3));camera.lookAt(center);camera.updateMatrixWorld(true);
  const visible=[];
  for(const face of affected){
   for(let c=0;c<3;c++)target.getVertexPosition(target.geometry.index.getX(face*3+c),corners[c]).applyMatrix4(target.matrixWorld);
   normal.copy(corners[1]).sub(corners[0]).cross(point.copy(corners[2]).sub(corners[0]));const area=normal.length()*.5;if(area===0)continue;
   point.copy(corners[0]).add(corners[1]).add(corners[2]).multiplyScalar(1/3);
   ray.set(camera.position,point.clone().sub(camera.position).normalize());const hit=ray.intersectObjects(meshes,false)[0];
   if(hit?.object===target&&hit.faceIndex===face){const projected=corners.map(v=>v.clone().project(camera)),twiceArea=Math.abs((projected[1].x-projected[0].x)*(projected[2].y-projected[0].y)-(projected[1].y-projected[0].y)*(projected[2].x-projected[0].x));visible.push({face,projectedTriangleAreaPixels:twiceArea*1024*1024/8,worldArea:area});}
  }
  rows.push({clip:'Water',fraction,elevation,azimuth,centroidRayVisibleFaces:visible,projectedAreaPixels:visible.reduce((n,f)=>n+f.projectedTriangleAreaPixels,0)});
 }
}
const report={status:'CPU_CENTROID_GUIDANCE_NOT_RENDER_COVERAGE',sourceSha256:library.sha256,mesh:target.name,closeup,views:rows,rankedViews:[...rows].sort((a,b)=>b.projectedAreaPixels-a.projectedAreaPixels),limitations:['Only triangle centroid rays; neither raster sample coverage nor exact visibility guarantee.', 'Original raw GLB geometry/rig/animation with textures omitted only in memory; runtime web/WorldScene and shaders still require native ID coverage.', '16 existing V6 views inspected for training guidance. No candidate or pixel-quality gate evaluated.']};
await writeFile(folder+(closeup?'worker-badge-cpu-closeup-guidance.json':'worker-badge-cpu-visibility-guidance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.rankedViews.slice(0,4)));
