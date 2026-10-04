import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Node needs only the original hierarchy and animations, not texture decoding.
export function rigForSampling(buffer){
  const size=buffer.readUInt32LE(12),doc=JSON.parse(buffer.subarray(20,20+size));
  for(const material of doc.materials){
    delete material.normalTexture;delete material.occlusionTexture;delete material.emissiveTexture;
    delete material.pbrMetallicRoughness?.baseColorTexture;delete material.pbrMetallicRoughness?.metallicRoughnessTexture;
  }
  const json=Buffer.from(JSON.stringify(doc)),length=Math.ceil(json.length/4)*4,bin=buffer.subarray(20+size),output=Buffer.alloc(20+length+bin.length,32);
  buffer.copy(output,0,0,20);output.writeUInt32LE(output.length,8);output.writeUInt32LE(length,12);json.copy(output,20);bin.copy(output,20+length);
  return output.buffer.slice(output.byteOffset,output.byteOffset+output.length);
}

export function bakeWateringEmitter(model,animations){
  const nozzle=model.getObjectByName('Can_Nozzle'),clip=animations.find(c=>c.name==='Water');
  if(!nozzle||!clip)throw Error('Missing original watering nozzle/action');
  const mixer=new AnimationMixer(model),action=mixer.clipAction(clip).play(),frames=Math.ceil(clip.duration*60),positions=[],directions=[],point=new Vector3(),direction=new Vector3();action.paused=true;
  const append=(array,vector)=>array.push(...vector.toArray().map(n=>Number(n.toFixed(6))));
  for(let i=0;i<=frames;i++){
    action.time=i/frames*clip.duration;mixer.update(0);model.updateMatrixWorld(true);
    point.set(0,.023,0).applyMatrix4(nozzle.matrixWorld);model.worldToLocal(point);append(positions,point);
    direction.set(0,1,0).transformDirection(nozzle.matrixWorld);append(directions,direction);
  }
  action.stop();mixer.uncacheRoot(model);
  return {frames,duration:clip.duration,positions,directions};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const libraries=JSON.parse(readFileSync(new URL('../public/content/worker-actions.json',import.meta.url))),profiles={};
  for(const [profile,library] of Object.entries(libraries)){
    const bytes=readFileSync(new URL('../public'+library.url,import.meta.url)),sha256=createHash('sha256').update(bytes).digest('hex');
    if(sha256!==library.sha256)throw Error('Original rig hash changed: '+profile);
    const gltf=await new GLTFLoader().parseAsync(rigForSampling(bytes),'');
    profiles[profile]={sourceSha256:sha256,...bakeWateringEmitter(gltf.scene,gltf.animations)};
  }
  const data=JSON.stringify({version:1,frequency:60,nozzle:'Can_Nozzle',mouth:[0,.023,0],profiles})+'\n';
  writeFileSync(new URL('../public/content/watering-emitters.json',import.meta.url),data);
  process.stdout.write(`Prepared ${Object.keys(profiles).length} original nozzle paths / ${Buffer.byteLength(data)} bytes\n`);
}
