import {readFile,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const source=await readFile('tools/experiments/check-shield-repeat-render.mjs','utf8');
const anchor=' report.after=await inspect();';
if(source.split(anchor).length!==2)throw Error('Harness anchor changed');
const injected=`
 report.waterAttributePixels=await page.evaluate(async()=>{
  const w=qaMagicWorld;await w.whenChunksReady();
  const {verifyFarWaterAttribute}=await import('/tools/experiments/verify-far-water-attribute.js');
  const rows=[];
  for(const height of [20,60]){
   w.camera.position.copy(w.controls.target).add({x:25,y:height,z:90});w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);
   rows.push({height,...verifyFarWaterAttribute(w)});
  }
  return rows;
 });
 await page.screenshot({path:out+'/pixel-validation-scene.png'});
`;
const temporary='tools/experiments/.far-water-pixels-generated.mjs';
try{
 await writeFile(temporary,source.replace(anchor,injected+anchor),{flag:'wx'});
 const env={...process.env,WG_BEAST_QA_OUT:'docs/qa/residual-spikes-20261027/far-water-pixels',WG_QA_URL:'http://127.0.0.1:5220',WG_MAGIC_FIXTURE:'docs/qa/mangrove-magic-20261026/hydraulic-v2-agriculture/fixture.json',WG_MAGIC_PROFILE:'1',WG_MAGIC_CPU_SAMPLING:'0',WG_MAGIC_VIDEO:'0',WG_MAGIC_GPU:'0',WG_MAGIC_PHASES:'0',WG_MAGIC_CASTS:'0',WG_MAGIC_NO_CAST:'1',WG_MAGIC_STREAM:'0',WG_SPATIAL_RUNTIME_DIR:'',WG_SHADOW_SOURCE_DIR:'',WG_FAR_TRANSITION_SOURCE:''};
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[temporary],{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Pixel validation failed: '+code)));});
}finally{await unlink(temporary).catch(()=>{});}
