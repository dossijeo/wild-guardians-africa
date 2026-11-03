import * as T from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const query=new URLSearchParams(location.search),biome=query.get('biome')??'savanna',slot=query.get('slot')??'tree_01';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#a3b8c5');scene.add(new T.HemisphereLight(0xc8dcff,0x87744c,2));
const sun=new T.DirectionalLight(0xffe4af,3);sun.position.set(-6,12,8);scene.add(sun);
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.1,1000),controls=new OrbitControls(camera,renderer.domElement);
const assets=new Assets();assets.visualSearch='?noNativeAO';const ktx=query.get('qa-ktx2-atlas');if((['etc1s','uastc','bc7'].includes(ktx))&&biome==='savanna'&&slot==='tree_01')assets.experimentalKtx={renderer,variant:ktx,asset:'tree01'};
try{
 const pack=await fetch(`/content/biome-${biome}.json`).then(r=>r.json());
 // This isolated side-by-side view compares full texture endpoints at any
 // framing distance. The integrated far-world fixture tests the actual blend.
 for(const asset of pack.assets)if(asset.nearTextures)Object.assign(asset.nearTextures,{blendStart:1e6,blendEnd:1e6+1});
 const index=pack.assets.findIndex(a=>a.slot===slot),prototypes=await assets.biome(pack),levels=prototypes[index];
 if(!levels[0].userData.nearTextureDistance)throw Error('Missing near variant');
 const box=levels[0].geometry.boundingBox,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),gap=size.x*1.2;
 for(const [i,source]of [levels[1],levels[0]].entries()){
  if(query.has('doubleSide')){source.material.side=T.DoubleSide;source.material.needsUpdate=true;}
  const mesh=new T.Mesh(source.geometry,source.material);mesh.position.set((i-.5)*gap-center.x,-box.min.y,-center.z);scene.add(mesh);
 }
 const floor=new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshStandardMaterial({color:0x9d9465}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
 const angle=Number(query.get('angle')??0),distance=Number(query.get('distance')??Math.max(size.y*2.6,size.x*3.5));
 if(Math.cos(angle)<0)document.querySelector('#labels').innerHTML='<b>Near texture</b><b>Original</b>';
 controls.target.set(0,size.y*.48,0);camera.position.set(Math.sin(angle)*distance,size.y*.65,Math.cos(angle)*distance);controls.update();
 document.querySelector('#status').textContent=`${biome} / ${slot} — native materials, original normals; distance ${distance.toFixed(1)} m`;
 window.review={ready:true,biome,slot,size:size.toArray(),distance,texture:{compressed:!!levels[0].material.map?.isCompressedTexture,channel:levels[0].material.map?.channel,mipLevels:levels[0].material.map?.mipmaps?.length??0,configured:!!assets.experimentalKtx,keys:[...assets.cache.keys()].filter(k=>k.includes('tree_01'))},renderer:renderer.info};
}catch(error){document.querySelector('#status').textContent=error.stack;window.review={error:String(error)};}
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
