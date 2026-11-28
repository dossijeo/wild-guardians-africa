import * as T from 'three';
import {Assets} from '../../src/rendering/assets.js';
import {CharacterLod} from '../../src/rendering/character-lod.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const assets=new Assets();
const entries=await (await fetch('/tests/fixtures/character-lod-sources.json')).json();
const actor=document.querySelector('#actor'),clip=document.querySelector('#clip'),pixels=document.querySelector('#pixels'),status=document.querySelector('#status');
for(const e of entries)actor.add(new Option(e.id,e.id));
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#35473d');scene.add(new T.HemisphereLight(0xd9edff,0x60543d,2));const sun=new T.DirectionalLight(0xffe2b5,3);sun.position.set(5,8,5);scene.add(sun);
const camera=new T.OrthographicCamera(-10,10,6,-6,.01,100);camera.position.set(0,3,12);camera.lookAt(0,1,0);
let groups=[],mixers=[],lod,animations=[],height=3,paused=false,time=0,yaw=0,token=0;
function selectClip(){for(const m of mixers){m.stopAllAction();const c=animations.find(c=>c.name===clip.value);if(c)m.clipAction(c).play();}time=0;}
async function load(){const version=++token,e=entries.find(e=>e.id===actor.value);status.textContent='Cargando '+e.id;status.dataset.loaded='';const [a,b]=await Promise.all([assets.model(e.source.replace(/^public/,'')),assets.model(e.url)]);if(version!==token)return;lod?.dispose();for(const g of groups)scene.remove(g);groups=[];mixers=[];animations=a.animations;
 for(let i=0;i<2;i++){const group=new T.Group(),model=clone(a.scene);group.add(model);scene.add(group);groups.push(group);mixers.push(new T.AnimationMixer(model));if(i===1)lod=new CharacterLod(model,b.scene);}
 height=new T.Box3().setFromObject(groups[0]).getSize(new T.Vector3()).y;clip.replaceChildren();for(const c of animations)clip.add(new Option(c.name,c.name));clip.value=animations.find(c=>/walking|idle|walk_skip/i.test(c.name))?.name??animations[0]?.name;selectClip();layout();status.dataset.loaded=e.id;}
function layout(){const span=height*innerHeight/Number(pixels.value);camera.top=span/2;camera.bottom=-span/2;camera.left=-span*innerWidth/innerHeight/2;camera.right=-camera.left;camera.position.set(0,height*.55,12);camera.lookAt(0,height*.55,0);camera.updateProjectionMatrix();groups.forEach((g,i)=>{g.position.x=(i?1:-1)*span*.18;g.rotation.y=yaw;});}
actor.onchange=()=>load().catch(e=>status.textContent=e.stack);clip.onchange=selectClip;pixels.onchange=layout;document.querySelector('#pause').onclick=()=>paused=!paused;document.querySelector('#angle').onclick=()=>{yaw+=Math.PI/4;layout();};
await load();let last=performance.now();function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)time+=dt;lod?.beforePose();for(const m of mixers)m.setTime(time);lod?.update(camera,innerHeight,true);renderer.render(scene,camera);status.textContent=JSON.stringify({actor:actor.value,clip:clip.value,pixels:Number(pixels.value),yaw,paused,triangles:renderer.info.render.triangles,draws:renderer.info.render.calls},null,2);requestAnimationFrame(frame);}requestAnimationFrame(frame);
