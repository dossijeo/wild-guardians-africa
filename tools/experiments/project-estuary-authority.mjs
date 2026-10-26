import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import sharp from 'sharp';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
const base='docs/qa/mangrove-magic-20261026/';
const {fittedSites:sites}=JSON.parse(await fs.readFile(base+'building-pad-experiment/report.json','utf8'));
const measured=JSON.parse(await fs.readFile(base+'building-pad-lower-cut/pixel-audit.json','utf8'));
const cameraData=JSON.parse(await fs.readFile(base+'building-pad-lower-cut/elevated-coverage.json','utf8'));
const camera=new THREE.PerspectiveCamera(42,1280/720,.1,500);camera.position.fromArray(cameraData.camera);camera.lookAt(new THREE.Vector3().fromArray(cameraData.target));camera.updateMatrixWorld(true);
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-3.3399999141693115),point=new THREE.Vector3();
const at=(x,y)=>{ray.setFromCamera(new THREE.Vector2(x/1280*2-1,1-y/720*2),camera);return ray.ray.intersectPlane(plane,point);};
for(const p of measured){const h=p.hits.find(h=>h.tags.regional);assert(at(...p.pixel).distanceTo(new THREE.Vector3().fromArray(h.point))<1e-5,'Projection mismatch');}
const module=new WebAssembly.Module(await fs.readFile('src/world/wild-engine/spatial-savanna.wasm'));
const core=createSpatialWorld(module);core.generate(4096,1,0,'mangrove',{mangroveNetwork:true});core.applySettlements(sites);
const width=640,height=360,pixels=Buffer.alloc(width*height*3);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=at(x*2,y*2),mask=p?core.wetlandMaskAnywhere(p.x,p.z):0;const rgb=mask>.61?[42,125,170]:mask>.25?[163,133,83]:[103,120,71];pixels.set(rgb,(y*width+x)*3);}
const natural=createSpatialWorld(module);natural.generate(4096,1,0,'mangrove',{mangroveNetwork:true});
const probes=[];for(let x=690;x<=830;x+=10){const y=510-(x-690)*.625,p=at(x,y);probes.push({pixel:[x,y],x:p.x,z:p.z,mask:core.wetlandMaskAnywhere(p.x,p.z),natural:natural.wetlandMaskAnywhere(p.x,p.z),influences:sites.map((s,i)=>({index:i,edge:Math.max(Math.abs(p.x-s.x)-s.hx,Math.abs(p.z-s.z)-s.hz)})).filter(s=>s.edge<6)});}
const out=base+'building-pad-projected-authority';await fs.mkdir(out,{recursive:true});await sharp(pixels,{raw:{width,height,channels:3}}).resize(1280,720,{kernel:'nearest'}).png().toFile(out+'/projected.png');
await fs.writeFile(out+'/report.json',JSON.stringify({projectionChecks:measured.length,probes,scope:'Native mask projected at water height; excludes objects, depth occlusion, alpha shores and HUD.'},null,2));console.log(JSON.stringify(probes));
