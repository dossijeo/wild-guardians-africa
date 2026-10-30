import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
const status=document.querySelector('#status');
const base='/test-results/shared-glb-images/';
const report={scope:'Candidate browser decode and external-buffer loading; not rendered visual acceptance.',models:[],errors:[]};
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
try {
 const names=await (await fetch(base+'models.json')).json();
 for(const name of names){
  const gltf=await loader.loadAsync(base+name);let meshes=0,textures=new Set(),geometries=new Set(),materials=new Set();
  gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});
  for(const t of textures){const image=t.source.data;if(!(image?.width>0&&image?.height>0))throw Error('Undecoded image: '+name);}
  report.models.push({name,meshes,textures:textures.size,animations:gltf.animations.length});
  for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures){t.dispose();t.source.data?.close?.();}
  status.textContent=JSON.stringify(report,null,2);
 }
 report.passed=report.models.length===names.length;
} catch(e){report.errors.push(String(e.stack??e));report.passed=false;}
status.textContent=JSON.stringify(report,null,2);
