import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const species=process.argv[2]??'hyena',label=({hyena:'Hiena',warthog:'Facóquero',buffalo:'Búfalo'})[species];if(!label)throw Error('Unsupported review species');
const out=`docs/qa/${species}-replacement`,fps=30,base=process.env.WG_QA_URL??'http://127.0.0.1:5194';
await mkdir(out,{recursive:true});
const library=JSON.parse(await readFile('content/manifests/animal-actions.json','utf8')).animals[species];
const labels={restpose:'Postura de referencia',Walking:'Marcha',Running:'Carrera',Charged_Upward_Slash:'Tajo ascendente cargado',Right_Hand_Sword_Slash:'Tajo derecho',Weapon_Combo:'Combo 1',Weapon_Combo_2:'Combo 2'};
const segments=[];
function add(clip,light,view='front',loops=1){const duration=library.clips[clip].duration,loop=['Walking','Running'].includes(clip);segments.push({clip,label:labels[clip],light,view,clipDuration:duration,loop,seconds:clip==='restpose'?1.5:loop?duration*loops:duration+.75});}
if(library.clips.restpose)add('restpose','day');add('Walking','day','front',3);add('Running','day','front',4);
for(const name of ['Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'])add(name,'day');
add('Walking','day','back',2);add('Running','day','back',3);
add('Walking','night','front',2);add('Running','night','front',3);
for(const name of ['Charged_Upward_Slash','Right_Hand_Sword_Slash','Weapon_Combo','Weapon_Combo_2'])add(name,'night');
let totalFrames=0;for(const s of segments){s.frames=Math.ceil(s.seconds*fps);s.start=totalFrames/fps;totalFrames+=s.frames;s.end=totalFrames/fps;}
const output=resolve(out,`${species}-animations.mp4`),browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
let encoder,encoderLog='';const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+`/tests/browser/beast-replacement.html?species=${species}&biome=sabana`,{waitUntil:'commit'});
 await page.waitForFunction(()=>window.beastQA,null,{timeout:240000});
 const ready=await page.evaluate(()=>({ready:beastQA.ready,error:beastQA.error}));if(!ready.ready)throw Error(JSON.stringify(ready));
 await page.evaluate(label=>{
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d',{alpha:false});
  window.beastVideo={canvas,ctx,draw(segment,t,frame,totalFrames){
   const q=beastQA,phase=segment.clip==='restpose'?0:segment.loop?(t%segment.clipDuration)/segment.clipDuration:Math.min(1,t/segment.clipDuration);
   q.state.elapsed=350+frame/30;q.pose(segment.clip,phase);ctx.drawImage(q.world.renderer.domElement,0,0,1280,720);
   ctx.fillStyle='rgba(14,21,18,.88)';ctx.fillRect(0,0,1280,87);
   ctx.fillStyle='#f7ebd3';ctx.font='600 27px system-ui';ctx.fillText(label.toUpperCase()+' · '+segment.label,26,36);
   ctx.font='18px system-ui';ctx.fillStyle='#c9ccb9';ctx.fillText(`${segment.clip}  ·  ${segment.light==='day'?'Día':'Noche'}  ·  ${segment.view==='back'?'Vista trasera':'Vista frontal'}  ·  velocidad real`,26,66);
   ctx.fillStyle='rgba(14,21,18,.8)';ctx.fillRect(0,688,1280,32);ctx.fillStyle='#d6b878';ctx.fillRect(0,688,1280*(frame+1)/totalFrames,3);
   ctx.fillStyle='#f7ebd3';ctx.font='15px system-ui';ctx.fillText('Wild Guardians · modelo integrado · animaciones y apoyo de pies',26,710);
   ctx.textAlign='right';ctx.fillText(`${(frame/30).toFixed(1)} / ${(totalFrames/30).toFixed(1)} s`,1254,710);ctx.textAlign='left';
   return canvas.toDataURL('image/jpeg',.94).split(',')[1];
  }};
 },label);
 encoder=spawn(process.env.WG_FFMPEG??'ffmpeg',['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
 encoder.stderr.on('data',d=>encoderLog+=d.toString());const finished=once(encoder,'close');let frame=0;
 for(const segment of segments){
  await page.evaluate(async s=>{beastQA.state.time=s.light==='day'?150:350;await beastQA.setView(s.view,6.2,1.5)},segment);
  for(let i=0;i<segment.frames;i++,frame++){
   const jpeg=await page.evaluate(({segment,t,frame,totalFrames})=>beastVideo.draw(segment,t,frame,totalFrames),{segment,t:i/fps,frame,totalFrames});
   if(!encoder.stdin.write(Buffer.from(jpeg,'base64')))await once(encoder.stdin,'drain');
  }
  console.log(segment.clip,segment.light,segment.view,frame+'/'+totalFrames);
 }
 const state=await page.evaluate(()=>({errors:beastQA.capture().errors,glError:beastQA.world.renderer.getContext().getError()}));
 if(errors.length||state.errors.length||state.glError)throw Error(JSON.stringify({errors,state}));
 encoder.stdin.end();const [code]=await finished;if(code!==0)throw Error('FFmpeg failed: '+encoderLog);
 await writeFile(resolve(out,'video.json'),JSON.stringify({file:`${species}-animations.mp4`,resolution:[1280,720],fps,frames:totalFrames,duration:totalFrames/fps,model:library.url,modelSha256:library.sha256,scope:'Deterministic native WorldScene frames at 30 fps; production animal controller, full attacks followed by 0.75 s held final pose. Walking/running repeat at original speed; restpose is included only when present in the source library. Silent animation review, not a performance recording.',segments,errors,glError:state.glError},null,2)+'\n');
 console.log(output);
}catch(error){encoder?.kill();throw error;}finally{await browser.close();}
