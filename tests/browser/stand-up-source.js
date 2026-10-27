import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#343d39');scene.add(new T.HemisphereLight(0xffffff,0x635748,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.01,1000),controls=new OrbitControls(camera,renderer.domElement),$=id=>document.getElementById(id);
const gltf=await new GLTFLoader().loadAsync('/content/source/animations/stand-up/source.glb');scene.add(gltf.scene);
const clip=gltf.animations.find(c=>c.name==='Stand_Up1');if(!clip)throw Error('Falta Stand_Up1');
const mixer=new T.AnimationMixer(gltf.scene),action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
const bounds=new T.Box3();for(let i=0;i<=40;i++){mixer.setTime(clip.duration*i/40);gltf.scene.updateMatrixWorld(true);bounds.union(new T.Box3().setFromObject(gltf.scene,true));}
const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),radius=Math.max(size.x,size.y,size.z);
const floor=new T.GridHelper(radius*3,30,0x839080,0x566257);floor.position.y=bounds.min.y;scene.add(floor);
function view(side){controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(side?radius*2.2:radius*.25,radius*.35,side?radius*.2:radius*2.2));controls.update();}
view(false);$('front').onclick=()=>view(false);$('side').onclick=()=>view(true);
let playing=false,time=0,previous=performance.now();$('time').max=clip.duration;$('time').oninput=()=>{playing=false;time=Number($('time').value);};$('play').onclick=()=>{if(time>=clip.duration)time=0;playing=!playing;};
function frame(now){if(playing)time=Math.min(clip.duration,time+Math.min(.1,(now-previous)/1000));previous=now;action.paused=false;mixer.setTime(time);$('time').value=time;$('status').textContent=JSON.stringify({clip:clip.name,time:Number(time.toFixed(3)),duration:clip.duration,tracks:clip.tracks.length,bounds:size.toArray()},null,2);renderer.render(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
