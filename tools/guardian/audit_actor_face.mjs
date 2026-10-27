import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,LoopOnce,Vector3,Quaternion} from 'three';
function geometryOnly(bytes){
 const n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n));
 for(const m of g.materials??[]){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;delete m.extensions;}
 const json=Buffer.from(JSON.stringify(g)),size=Math.ceil(json.length/4)*4,bin=bytes.subarray(20+n),out=Buffer.alloc(20+size+bin.length,32);bytes.copy(out,0,0,20);out.writeUInt32LE(out.length,8);out.writeUInt32LE(size,12);json.copy(out,20);bin.copy(out,20+size);return out.buffer.slice(out.byteOffset,out.byteOffset+out.length);
}
const [source,edited,output]=process.argv.slice(2);if(!source||!edited||!output)throw Error('source.glb edited.glb report.json');
const loader=new GLTFLoader(),a=await loader.parseAsync(geometryOnly(fs.readFileSync(source)),''),b=await loader.parseAsync(geometryOnly(fs.readFileSync(edited)),''),am=new AnimationMixer(a.scene),bm=new AnimationMixer(b.scene),bones=[];
a.scene.traverse(o=>{if(o.isBone){const copy=b.scene.getObjectByName(o.name);if(!copy?.isBone)throw Error('Missing bone '+o.name);bones.push([o,copy]);}});
const report={source,edited,bones:bones.length,samples:0,maxPosition:0,maxAngle:0,clips:[]},ap=new Vector3(),bp=new Vector3(),aq=new Quaternion(),bq=new Quaternion();
for(const clip of a.animations){
 const other=b.animations.find(c=>c.name===clip.name);if(!other)throw Error('Missing clip '+clip.name);if(Math.abs(clip.duration-other.duration)>1e-6)throw Error('Duration changed');
 am.stopAllAction();bm.stopAllAction();const aa=am.clipAction(clip).reset().setLoop(LoopOnce,1),ba=bm.clipAction(other).reset().setLoop(LoopOnce,1);aa.clampWhenFinished=ba.clampWhenFinished=true;aa.play();ba.play();
 for(let i=0;i<=40;i++){const time=clip.duration*i/40;am.setTime(time);bm.setTime(time);a.scene.updateMatrixWorld(true);b.scene.updateMatrixWorld(true);for(const [x,y] of bones){report.maxPosition=Math.max(report.maxPosition,x.getWorldPosition(ap).distanceTo(y.getWorldPosition(bp)));report.maxAngle=Math.max(report.maxAngle,x.getWorldQuaternion(aq).normalize().angleTo(y.getWorldQuaternion(bq).normalize()));}report.samples++;}
 report.clips.push(clip.name);
}
report.pass=report.maxPosition<.001&&report.maxAngle<.002;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(report);if(!report.pass)process.exitCode=1;
