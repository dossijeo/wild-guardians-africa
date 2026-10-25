import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {readGlb} from '../glb-container.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const species=process.argv[2]??'lion',degrees=Number(process.argv[3]??15);
const out=`docs/qa/beast-integration-20261025/${species}/head-${degrees}`;await mkdir(out,{recursive:true});
const library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const candidate=await readFile(`.codex-tmp/beast-head/${species}-${degrees}.glb`);
const source=readGlb(candidate).json.asset.extras.wildHeadPosture.source;
if(!/^\/assets\/[a-f0-9]{64}\.glb$/.test(source))throw Error('Unexpected baseline path');
const baseline=execFileSync('git',['show','3c1db05fd:public'+source],{maxBuffer:150*1024*1024});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
const errors=[],captures=[];
try{for(const variant of ['before','after']){
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 let replacements=0;
 // Same source texture encoding in A and B; runtime compressed assets are
 // verified independently in the final animation and real-raid recordings.
 await page.route('**/'+library.url.split('/').at(-1),route=>{replacements++;return route.fulfill({status:200,contentType:'model/gltf-binary',body:variant==='after'?candidate:baseline});});
 await page.goto(`http://127.0.0.1:5218/tests/browser/beast-replacement.html?species=${species}`,{waitUntil:'commit',timeout:90000});
 await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});
 for(const view of ['front','side']){
  await page.evaluate(async view=>{const q=beastQA;if(!q.ready)throw Error(q.error);q.state.time=150;await q.setView('front',3.7,.35);if(view==='side'){const t=q.world.controls.target,a=.4+Math.PI/2;q.world.camera.position.set(t.x+Math.sin(a)*3.7,t.y+.35,t.z+Math.cos(a)*3.7);q.world.camera.lookAt(t);q.world.camera.updateMatrixWorld();}},view);
  for(const clip of ['Walking','Running','Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'])for(const phase of [.2,.55,.85]){
   const result=await page.evaluate(({clip,phase})=>{beastQA.pose(clip,phase);return beastQA.capture();},{clip,phase});
   const file=`${variant}-${view}-${clip}-${phase}.png`;await writeFile(out+'/'+file,Buffer.from(result.png,'base64'));delete result.png;captures.push({variant,view,phase,file,...result});
  }
 }
 if(!replacements)throw Error('Comparison model was not loaded');
 const pose=await page.evaluate(()=>{const data=beastQA.world.mixers.get('qa-new-beast');return {head:data.model.getObjectByName('Head').quaternion.toArray(),track:data.clips.find(c=>c.name==='Walking').tracks.find(t=>t.name==='Head.quaternion')?.values.slice(0,4)};});
 console.log(species,variant,'captured',replacements,pose);await page.close();
}await writeFile(out+'/report.json',JSON.stringify({species,degrees,errors,captures},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));}finally{await browser.close();}
