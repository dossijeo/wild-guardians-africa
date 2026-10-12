// Run with the approved lab directory as the sole argument. Only art actually
// referenced by the 50 layered scenes and their streamed Opus voices ships.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const source=process.argv[2];
if(!source)throw new Error('Usage: node tools/build_campaign_cinematics.mjs <approved-lab-directory>');
const target=resolve('public/cinematics');
const original=JSON.parse(await readFile(join(source,'cinematics-manifest.json'),'utf8'));
if(original.acts.length!==10)throw new Error('Expected ten acts');
const files=new Set();
const acts=original.acts.map((act,index)=>{
  if(act.number!==index+1||act.afterNight!==(index+1)*10||act.scenes.length!==5)throw new Error(`Invalid act ${index+1}`);
  return {number:act.number,roman:act.roman,title:act.title,titleEN:act.titleEN,afterNight:act.afterNight,scenes:act.scenes.map(scene=>{
    const layers=scene.layers.map(layer=>{files.add(layer.image);return {image:layer.image,motion:layer.motion};});
    for(const language of ['ES','EN'])files.add(scene.audio[language].file);
    return {id:scene.id,scene:scene.scene,narrationRaw:scene.narrationRaw,narrationRawEN:scene.narrationRawEN,layers,audio:scene.audio};
  })};
});
if(files.size!==205)throw new Error(`Expected 205 unique referenced assets, received ${files.size}`);
await mkdir(join(target,'layers'),{recursive:true});await mkdir(join(target,'audio'),{recursive:true});
for(const path of files){
  if(!/^(layers|audio)\/[a-z0-9-]+\.(webp|opus)$/.test(path))throw new Error(`Unsafe asset path: ${path}`);
  await copyFile(join(source,path),join(target,path));
}
await writeFile(join(target,'manifest.json'),JSON.stringify({acts},null,2)+'\n');
console.log(`Copied ${files.size} approved cinematic assets for ${acts.length} acts.`);
