import * as T from 'three';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ActorExpression} from '../../src/rendering/actor-expression.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#343d39');scene.add(new T.HemisphereLight(0xffffff,0x635748,2));for(const [x,y,z,p] of [[3,5,4,2],[-3,2,2,1]]){const light=new T.DirectionalLight(0xffffff,p);light.position.set(x,y,z);scene.add(light);}
const params=new URLSearchParams(location.search),lion=params.get('actor')==='lion',warthog=params.get('actor')==='warthog',buffalo=params.get('actor')==='buffalo',rhino=params.get('actor')==='rhino';
const faceTarget=new T.Vector3(0,rhino?2.43:buffalo?1.72:warthog?(params.get('view')==='mouth'?1.4:1.85):lion?1.57:1.5,rhino?.55:buffalo?.35:warthog?.4:lion?.20:.48),faceDistance=rhino?1.85:buffalo?1.15:warthog?(params.get('view')==='mouth'?1.7:1.25):lion?.65:1.35;
const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.01,50);camera.position.set(0,1.52,1.85);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.5,.48);controls.update();
const $=id=>document.getElementById(id),errors=[];let elapsed=20,previous=performance.now(),paused=false,automatic=false,action=null,actor={id:'qa-face',status:'walking'},frame=0;
const asset=rhino?'/test-results/rhino-face-candidate.glb':buffalo?(params.has('original')?'/assets/0c77a268cc0a7d22c66dedb7a471a66a414437f39e6bdfbc60c75dc36acf7920.glb':'/content/source/actors/buffalo/expressive-candidate.glb'):warthog?'/content/source/actors/warthog/expressive-candidate.glb':lion?(params.has('uncompressed')?'/test-results/lion-face-candidate.glb':'/content/source/actors/lion/expressive-candidate.glb'):params.has('uncompressed')?'/test-results/hyena-face-candidate.glb':'/content/source/actors/hyena/expressive-candidate.glb';
const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset);scene.add(gltf.scene);const expression=new ActorExpression(gltf.scene,actor.id),mixer=new T.AnimationMixer(gltf.scene);
const oralToggle=document.createElement('button');oralToggle.textContent='Ocultar interior oral';oralToggle.id='oralToggle';let oralVisible=true;
oralToggle.onclick=()=>{oralVisible=!oralVisible;gltf.scene.traverse(o=>{if(o.isMesh&&/Oral|Cavity/i.test(o.name))o.visible=oralVisible;});oralToggle.textContent=oralVisible?'Ocultar interior oral':'Mostrar interior oral';};$('body').after(oralToggle);
gltf.scene.updateMatrixWorld(true);const head=gltf.scene.getObjectByName('Head'),headAnchor=head?head.worldToLocal(faceTarget.clone()):null,headPoint=new T.Vector3(),cameraShift=new T.Vector3(),headRotation=new T.Quaternion(),restHeadInverse=head?head.getWorldQuaternion(new T.Quaternion()).invert():new T.Quaternion();let followFace=false;
$('follow').onclick=()=>followFace=!followFace;
$('clipTime').oninput=()=>{paused=true;if(action)mixer.setTime(Number($('clipTime').value));};
for(const clip of gltf.animations){const option=document.createElement('option');option.value=option.textContent=clip.name;$('clip').append(option);}
const manual=()=>{automatic=false;expression.setValues(Number($('left').value),Number($('right').value),Number($('mouth').value));};
for(const id of ['left','right','mouth'])$(id).oninput=manual;
function set(l,r,m){$('left').value=l;$('right').value=r;$('mouth').value=m;manual();}
$('neutral').onclick=()=>set(0,0,0);$('pain').onclick=()=>set(1,1,.85);$('half').onclick=()=>set(.5,.5,0);
function faceView(x,z){
 gltf.scene.updateMatrixWorld(true);
 const target=head?head.localToWorld(headAnchor.clone()):faceTarget;
 const offset=new T.Vector3(x*faceDistance,.02,z*faceDistance);
 if(head)offset.applyQuaternion(restHeadInverse).applyQuaternion(head.getWorldQuaternion(headRotation));
 controls.target.copy(target);camera.position.copy(target).add(offset);controls.update();
}
$('otherSide').onclick=()=>faceView(-1,0);$('quarter').onclick=()=>faceView(.7,.8);$('body').onclick=()=>{controls.target.set(0,.9,0);camera.position.set(2,1.8,4);controls.update();};
for(const [label,x,z] of [['Cuerpo frontal',0,4],['Cuerpo lateral',4,0],['Cuerpo posterior',0,-4]]){const button=document.createElement('button');button.textContent=label;button.onclick=()=>{controls.target.set(0,.95,0);camera.position.set(x,1.1,z);controls.update();};$('body').after(button);}
$('side').onclick=()=>faceView(1,0);$('front').onclick=()=>faceView(0,1);faceView(0,1);
$('candidateLabel').textContent=rhino?'RINOCERONTE: candidato local; boca y párpados en validación. No instalado.':buffalo?(params.has('original')?'BÚFALO ORIGINAL: comparación del rig; sin expresiones nuevas.':'BÚFALO: boca, interior y párpados integrados en la rama; revisión en curso.'):warthog?'JABALÍ: candidato facial local; revisar sus canales cargados. No integrado en el catálogo.':lion?'LEÓN: candidato de mandíbula, interior oral y párpados. Integrado en la rama; revisión visual en curso.':'HIENA: modelo expresivo. Controles de validación de boca y parpadeo.';
$('clip').onchange=()=>{mixer.stopAllAction();action=null;const clip=gltf.animations.find(c=>c.name===$('clip').value);$('clipTime').value=0;$('clipTime').max=clip?.duration??0;if(clip)action=mixer.clipAction(clip).reset().play();};
$('auto').onclick=()=>{automatic=true;actor.status='walking';};$('attack').onclick=()=>{automatic=true;actor.status='attacking';actor.attackDuration=2;actor.attackRemaining=2;};$('hit').onclick=()=>{automatic=true;actor.status='walking';actor.magicImpact={at:elapsed,impactAt:elapsed+.24};};$('pause').onclick=()=>paused=!paused;
addEventListener('error',e=>errors.push(e.message));
function render(now){requestAnimationFrame(render);const dt=paused?0:Math.min(.1,(now-previous)/1000);previous=now;elapsed+=dt;if(actor.status==='attacking'){actor.attackRemaining=Math.max(0,actor.attackRemaining-dt);if(!actor.attackRemaining)actor.status='walking';}if(action)mixer.update(dt);if(automatic)expression.update(actor,'animal',elapsed);if(followFace&&head){gltf.scene.updateMatrixWorld(true);headPoint.copy(headAnchor).applyMatrix4(head.matrixWorld);cameraShift.copy(headPoint).sub(controls.target);camera.position.add(cameraShift);controls.target.copy(headPoint);controls.update();}renderer.render(scene,camera);if(++frame%10===0)$('status').textContent=JSON.stringify({ready:true,asset,elapsed,paused,automatic,clip:action?.getClip().name??null,clipTime:action?.time??0,followFace,state:actor.status,clips:gltf.animations.map(c=>c.name),morphs:expression.bindings.map(b=>({mesh:b.mesh.name,channel:b.channel,level:b.level,value:b.mesh.morphTargetInfluences[b.index]})),draws:renderer.info.render.calls,errors},null,2);}
requestAnimationFrame(render);
