import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/grass-translucency-native/motion-river';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['media'])for(const biome of ['gran-rio']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});



 await page.evaluate(async()=>{const w=window.qaCampaignWorld;await(await import('/tools/experiments/qa-grass-translucency.js')).applyMaterialStudy(w,'original');const origin=w.controls.target.clone();origin.x+=50;origin.z+=30;const p=[...w.groundDetails.chunks.values()].flat().sort((a,b)=>(a.x-origin.x)**2+(a.z-origin.z)**2-((b.x-origin.x)**2+(b.z-origin.z)**2))[0];if(!p)throw Error('No grass group');w.controls.target.set(p.anchorX,w.nav.field.surface(p.anchorX,p.anchorZ)+.15,p.anchorZ);w.camera.position.copy(w.controls.target).add({x:3,y:2,z:4});w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();});
 for(const phase of ['day'])for(const variant of ['original','translucent']){
 await page.evaluate(async({phase,variant})=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;await (await import('/tools/experiments/qa-grass-translucency.js')).applyMaterialStudy(w,variant);}, {phase,variant});await page.waitForTimeout(700);
 const folder=`.codex-tmp/translucency-river-motion/${phase}-${variant}`;await mkdir(folder,{recursive:true});const poses=[];
 for(let frame=0;frame<72;frame++){
 const result=await page.evaluate(frame=>{const w=window.qaCampaignWorld,t=frame/71;w.camera.position.copy(w.controls.target).add({x:5*Math.sin(.64+.65*Math.sin(t*Math.PI*2)),y:2,z:5*Math.cos(.64+.65*Math.sin(t*Math.PI*2))});w.render(.016);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};},frame);
 const bytes=Buffer.from(result.data,'base64');await writeFile(`${folder}/${String(frame).padStart(3,'0')}.png`,bytes);if([0,18,36,54,71].includes(frame))await writeFile(`${out}/motion-${phase}-${variant}-${String(frame).padStart(3,'0')}.png`,bytes);poses.push({frame,camera:result.camera,target:result.target});
 }
 records.push({phase,variant,poses,frames:72,fps:20,errors:[...errors]});await writeFile(out+'/motion.json',JSON.stringify({note:'Deterministic camera samples rendered in the real game. Playback 20 fps is NOT a performance measurement; GPU timing is separate.',records},null,2)+'\n');console.log('motion',phase,variant,errors.length);
 }
 await page.close();
}}finally{await browser.close()}
for(const phase of ['day'])for(const variant of ['original','translucent']){
 const result=spawnSync('C:/ffmpeg/bin/ffmpeg.exe',['-y','-loglevel','error','-framerate','20','-i',`.codex-tmp/translucency-river-motion/${phase}-${variant}/%03d.png`,'-c:v','libvpx-vp9','-crf','30','-b:v','0','-pix_fmt','yuv420p',`${out}/motion-${phase}-${variant}.webm`],{windowsHide:true,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);console.log('encoded',phase,variant);
}
