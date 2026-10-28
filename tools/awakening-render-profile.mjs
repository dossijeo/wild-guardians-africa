import {writeFile} from 'node:fs/promises';

// Called inside the real visual harness after its comparable object captures.
export async function profileAwakeningRenderer(page,out){
  console.log('AWAKENING_QA profile-fixture');
  const fixture=await page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{cropSpec}=await import('/src/simulation/rules.js');
    s.time=120;s.pauses=[];
    const anchor=s.plants.find(p=>p.alive),before=s.plants.length;
    for(let dz=-12;dz<=12&&s.plants.filter(p=>p.alive).length<100;dz+=1.5)for(let dx=-12;dx<=12&&s.plants.filter(p=>p.alive).length<100;dx+=1.5){
      const p={x:anchor.x+dx,z:anchor.z+dz};
      if(s.plants.some(q=>q.alive&&Math.hypot(q.x-p.x,q.z-p.z)<1.2)||!w.nav.placement(p.x,p.z,.4).valid)continue;
      try{G.plant(s,`profile-crop-${dx}-${dz}`,'maiz',p.x,p.z,w.nav);}catch{}
    }
    for(const p of s.plants.filter(p=>p.alive)){p.growth=cropSpec(p.species).growth_seconds;for(const water of p.water)water.status='manual';}
    s.pauses=['qa-profile'];s.elapsed+=10;
    const x=anchor.x,z=anchor.z,y=w.nav.field.surface(x,z);
    w.controls.target.set(x,y+.6,z);w.camera.position.set(x+14,y+17,z+22);
    globalThis.__wildSpellFrameManual=false;w.syncChunks();await w.whenChunksReady();globalThis.__wildSpellFrameManual=true;
    w.render(0);return {before,livePlants:s.plants.filter(p=>p.alive).length,scope:'Paid native placement; QA maturity/charges/time. Fixed entity count/camera in all arms. Not campaign economy.'};
  });
  if(fixture.livePlants<64)throw Error('Profiling requires at least 64 real placed plants');
  const records=[];
  for(const time of [120,420])for(const count of [0,1,32,0]){
    console.log(`AWAKENING_QA profile-${time}-${count}`);
    const record=await page.evaluate(async({time,count})=>{
      const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{awakeningState}=await import('/src/simulation/awakenings.js'),{loseBlessing}=await import('/src/simulation/blessings.js');
      s.time=time;
      for(const target of [...s.plants,...s.structures])if(target.blessing){const loss=loseBlessing(s,target);G.emit(s,'BlessingRemoved',loss);}
      s.elapsed+=1;w.render(0); // Let outgoing effects retire before reusing fixture IDs.
      s.pauses=[];for(const [i,target] of s.plants.filter(p=>p.alive).slice(0,count).entries()){awakeningState(s).progress=100;G.bless(s,`profile-${time}-${count}-${i}-${s.elapsed}`,target.id);}
      s.pauses=['qa-profile'];s.elapsed+=10;
      const rebuildBefore={...w.awakeningRoots.stats},began=performance.now();w.render(0);const changeFrameMs=performance.now()-began;
      const rebuildAfter={...w.awakeningRoots.stats};
      const gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),gpu=[],cpu=[],pending=[];
      const wait=()=>new Promise(resolve=>requestAnimationFrame(resolve));
      const poll=()=>{for(let i=pending.length-1;i>=0;i--){const q=pending[i];if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){if(!gl.getParameter(ext.GPU_DISJOINT_EXT))gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);pending.splice(i,1);}}};
      for(let i=0;i<25;i++){await wait();w.render(0);}
      for(let i=0;i<80;i++){
        await wait();if(ext)poll();const q=ext?gl.createQuery():null;
        if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
        const start=performance.now();w.render(0);cpu.push(performance.now()-start);
        if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}
      }
      for(let i=0;i<30&&pending.length;i++){await wait();poll();}
      for(const q of pending)gl.deleteQuery(q);
      const stats=a=>{const v=a.slice().sort((a,b)=>a-b);return v.length?{n:v.length,median:v[Math.floor(v.length/2)],p95:v[Math.floor((v.length-1)*.95)]}:null;};
      return {time,count,cpuMs:stats(cpu),gpuMs:stats(gpu),gpuSupported:!!ext,changeFrameMs,rebuildBefore,rebuildAfter,idleEnd:{...w.awakeningRoots.stats},
        calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},sparks:{...w.blessingVfx.stats}};
    },{time,count});
    if(record.sparks.sources!==count)throw Error('Source observer mismatch: reload a fresh Vite process after edits; dynamic imports must share the application module instance');
    records.push(record);
    await writeFile(`${out}/performance.json`,JSON.stringify({fixture,records,scope:'Instrumented real desktop Chrome render, RAF paced, 25 warmup and 80 measured frames/arm. GPU elapsed queries when supported; total render cost, not isolated shader time. Cold event frame includes CPU masks/uploads. Desktop only.'},null,2)+'\n');
  }
  console.log('AWAKENING_QA clip');
  const bytes=await page.evaluate(async()=>{
    const {state:s,world:w}=globalThis.wildGuardiansSpatialQa(),G=await import('/src/simulation/game.js'),{awakeningState}=await import('/src/simulation/awakenings.js'),{applyCropImpact}=await import('/src/simulation/crop-impact-health.js');
    const target=s.plants.find(p=>p.alive&&!p.blessing),y=w.nav.field.surface(target.x,target.z);
    w.controls.target.set(target.x,y+.6,target.z);w.camera.position.set(target.x+5,y+4,target.z+7);s.time=420;
    const stream=w.renderer.domElement.captureStream(24),chunks=[];
    if(!MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))return null;
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:2400000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
    s.pauses=[];awakeningState(s).progress=100;G.bless(s,'profile-motion-bless',target.id);s.pauses=['qa-profile'];
    let last=performance.now(),start=last,hit=false;
    while(performance.now()-start<6000){await new Promise(resolve=>requestAnimationFrame(resolve));const now=performance.now();s.elapsed+=(now-last)/1000;last=now;
      if(!hit&&now-start>4000){hit=true;for(let i=0;i<2;i++){const result=applyCropImpact(s,target,1);G.emit(s,'CropHit',{targetId:target.id,...result});}G.emit(s,'CropDestroyed',{targetId:target.id});}w.render(0);}
    recorder.stop();await done;for(const t of stream.getTracks())t.stop();return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  });
  if(bytes)await writeFile(`${out}/awakening-motion.webm`,new Uint8Array(bytes));
}
