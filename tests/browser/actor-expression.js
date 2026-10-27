import * as T from 'three';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ActorExpression} from '../../src/rendering/actor-expression.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#343d39');scene.add(new T.HemisphereLight(0xffffff,0x635748,2));for(const [x,y,z,p] of [[3,5,4,2],[-3,2,2,1]]){const light=new T.DirectionalLight(0xffffff,p);light.position.set(x,y,z);scene.add(light);}
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.01,50);camera.position.set(0,1.52,1.85);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.5,.48);controls.update();
const $=id=>document.getElementById(id),errors=[];let elapsed=20,previous=performance.now(),paused=false,automatic=false,action=null,actor={id:'qa-face',status:'walking'},frame=0;
const asset=new URLSearchParams(location.search).has('uncompressed')?'/test-results/hyena-face-candidate.glb':'/content/source/actors/hyena/expressive-candidate.glb';
const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset);scene.add(gltf.scene);const expression=new ActorExpression(gltf.scene,actor.id),mixer=new T.AnimationMixer(gltf.scene);
for(const clip of gltf.animations){const option=document.createElement('option');option.value=option.textContent=clip.name;$('clip').append(option);}
const manual=()=>{automatic=false;expression.setValues(Number($('left').value),Number($('right').value),Number($('mouth').value));};
for(const id of ['left','right','mouth'])$(id).oninput=manual;
function set(l,r,m){$('left').value=l;$('right').value=r;$('mouth').value=m;manual();}
$('neutral').onclick=()=>set(0,0,0);$('pain').onclick=()=>set(1,1,.85);$('half').onclick=()=>set(.5,.5,0);
$('otherSide').onclick=()=>{controls.target.set(0,1.5,.48);camera.position.set(-1.35,1.52,.48);controls.update();};$('quarter').onclick=()=>{controls.target.set(0,1.5,.48);camera.position.set(.9,1.52,1.5);controls.update();};$('body').onclick=()=>{controls.target.set(0,.9,0);camera.position.set(2,1.8,4);controls.update();};
$('side').onclick=()=>{controls.target.set(0,1.5,.48);camera.position.set(1.35,1.52,.48);controls.update();};$('front').onclick=()=>{controls.target.set(0,1.5,.48);camera.position.set(0,1.52,1.85);controls.update();};
$('clip').onchange=()=>{mixer.stopAllAction();action=null;const clip=gltf.animations.find(c=>c.name===$('clip').value);if(clip)action=mixer.clipAction(clip).reset().play();};
$('auto').onclick=()=>{automatic=true;actor.status='walking';};$('attack').onclick=()=>{automatic=true;actor.status='attacking';actor.attackDuration=2;actor.attackRemaining=2;};$('hit').onclick=()=>{automatic=true;actor.status='walking';actor.magicImpact={at:elapsed,impactAt:elapsed+.24};};$('pause').onclick=()=>paused=!paused;
addEventListener('error',e=>errors.push(e.message));
function render(now){requestAnimationFrame(render);const dt=paused?0:Math.min(.1,(now-previous)/1000);previous=now;elapsed+=dt;if(actor.status==='attacking'){actor.attackRemaining=Math.max(0,actor.attackRemaining-dt);if(!actor.attackRemaining)actor.status='walking';}if(action)mixer.update(dt);if(automatic)expression.update(actor,'animal',elapsed);renderer.render(scene,camera);if(++frame%10===0)$('status').textContent=JSON.stringify({ready:true,asset,elapsed,paused,automatic,state:actor.status,clips:gltf.animations.map(c=>c.name),morphs:expression.bindings.map(b=>({mesh:b.mesh.name,channel:b.channel,level:b.level,value:b.mesh.morphTargetInfluences[b.index]})),draws:renderer.info.render.calls,errors},null,2);}
requestAnimationFrame(render);
