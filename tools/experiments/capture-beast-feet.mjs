import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
const species=process.argv[2]??'lion',out=process.env.WG_BEAST_QA_OUT??`docs/qa/beast-integration-20261025/${species}/feet`;
const base=process.env.WG_QA_URL??'http://127.0.0.1:5218';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 let replacements=0;
 if(process.env.WG_BEAST_FOOT_CANDIDATE){const library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species],body=await readFile(process.env.WG_BEAST_FOOT_CANDIDATE);await page.route('**/'+library.url.split('/').at(-1),route=>{replacements++;return route.fulfill({status:200,contentType:'model/gltf-binary',body});});}
 await page.goto(`${base}/tests/browser/beast-replacement.html?species=${species}`,{waitUntil:'commit',timeout:90000});await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});
 const frames=[];
 for(const view of ['front','side']){
  await page.evaluate(async view=>{const q=beastQA;if(!q.ready)throw Error(q.error);q.state.time=150;await q.setView('front',3.3,.4);const t=q.world.controls.target;t.y=q.capture().position[1]+.6;const a=.4+(view==='side'?Math.PI/2:0);q.world.camera.position.set(t.x+Math.sin(a)*3.3,t.y+.5,t.z+Math.cos(a)*3.3);q.world.camera.lookAt(t);q.world.camera.updateMatrixWorld();},view);
  for(const clip of ['Walking','Running']){
   const tiles=[];
   for(let i=0;i<12;i++){
    const result=await page.evaluate(async({clip,phase})=>{
     const {Vector3}=await import('/node_modules/three/build/three.module.js');beastQA.pose(clip,phase);const result=beastQA.capture(),data=beastQA.world.mixers.get('qa-new-beast'),feet={};
     data.model.updateMatrixWorld(true);data.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,w=mesh.geometry.attributes.skinWeight,s=mesh.geometry.attributes.skinIndex;
      for(const name of ['LeftFoot','RightFoot']){const joint=mesh.skeleton.bones.findIndex(b=>b.name===name);let bottom=Infinity;for(let k=0;k<p.count;k++)if(s.getX(k)===joint&&w.getX(k)>.999)bottom=Math.min(bottom,p.getY(k));
       const points=[];for(let k=0;k<p.count;k++)if(s.getX(k)===joint&&w.getX(k)>.999&&Math.abs(p.getY(k)-bottom)<.00001){const v=mesh.getVertexPosition(k,new Vector3()).applyMatrix4(mesh.matrixWorld);points.push({x:v.x,y:v.y,z:v.z,ground:beastQA.world.nav.actorSurface(v.x,v.z)});}if(points.length)feet[name]=points;
      }
     });result.feet=feet;return result;
    },{clip,phase:i/12});const file=`${view}-${clip}-${String(i).padStart(2,'0')}.png`,bytes=Buffer.from(result.png,'base64');await writeFile(out+'/'+file,bytes);delete result.png;frames.push({view,clip,phase:i/12,file,...result});
    tiles.push({input:await sharp(bytes).extract({left:350,top:130,width:600,height:570}).resize(300,285).toBuffer(),left:i%6*300,top:Math.floor(i/6)*285});
   }
   await sharp({create:{width:1800,height:570,channels:3,background:'#172019'}}).composite(tiles).jpeg({quality:92}).toFile(`${out}/${view}-${clip}-sequence.jpg`);
  }
 }
 if(process.env.WG_BEAST_FOOT_CANDIDATE&&!replacements)throw Error('Candidate not loaded');
 await writeFile(out+'/report.json',JSON.stringify({species,candidate:process.env.WG_BEAST_FOOT_CANDIDATE??null,replacements,errors,frames,scope:'Production WorldScene, 12 evenly spaced phases per locomotion clip, close front/profile. Candidate model override is recorded explicitly; no movement override.'},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(species,'feet captured');
}finally{await browser.close();}
