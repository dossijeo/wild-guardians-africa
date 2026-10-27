import {VISEMES} from '../../src/ui/guardian-face.js';
export async function checkGuardian(actor,audio,voices,resolve){
 const results=[],assert=(name,condition,detail=null)=>{results.push({name,pass:!!condition,detail});};
 const meshes=actor.face.meshes;const read=name=>Math.max(...meshes.map(m=>m.morphTargetInfluences[m.morphTargetDictionary[name]]??0));
 const old={...actor.manual};actor.manual.blink=0;
 for(const v of VISEMES){actor.manual.viseme=v;actor.draw({time:1});assert('viseme '+v,read('viseme_'+v)===1);}
 actor.manual.viseme=null;
 for(const value of [.5,1]){actor.manual.blink=value;actor.draw({time:1});assert('blink '+value,read('blink_L')===value&&read('blink_R')===value);}
 actor.manual.blink=0;
 const eyePos=[];for(const x of [-1,1]){actor.target.set(x,.3,1);actor.draw({time:1});eyePos.push(actor.eyes.map(e=>e.bone.quaternion.toArray()));}
 assert('two movable eyes',actor.eyes.length===2&&JSON.stringify(eyePos[0])!==JSON.stringify(eyePos[1]));actor.target.set(0,.27,2);
 const bones=[];actor.model.traverse(o=>{if(o.isBone)bones.push(o);});const head=bones.find(b=>b.name==='Head'),arm=bones.find(b=>/^Arm/.test(b.name)),mantle=bones.find(b=>/^Mantle/.test(b.name));
 actor.manual.clip='Invoke';actor.draw({time:.1});const first=[head.quaternion.toArray(),arm.quaternion.toArray(),mantle.position.toArray()];actor.draw({time:1.9});const second=[head.quaternion.toArray(),arm.quaternion.toArray(),mantle.position.toArray()];
 for(let i=0;i<3;i++)assert(['head rotation','arm rotation','baked mantle'][i],JSON.stringify(first[i])!==JSON.stringify(second[i]));
 actor.manual.clip=null;
 for(const id of ['ES_01','EN_01']){
  const record=voices.find(v=>v.id===id);await actor.setRecord({id,path:record.audio});
  const cue=actor.face.data.mouthCues.find(c=>c.value!=='X'&&c.end-c.start>.12),time=(cue.start+cue.end)/2;
  actor.draw({time:3,audio:{currentTime:time,ended:false,paused:true}});assert(id+' audio-time morph',read('viseme_'+cue.value)>.99);
  const before=meshes.map(m=>[...m.morphTargetInfluences]);actor.draw({time:100,audio:{currentTime:time,ended:false,paused:true}});assert(id+' paused mouth',VISEMES.every(v=>meshes.every((m,i)=>{const k=m.morphTargetDictionary['viseme_'+v];return k===undefined||m.morphTargetInfluences[k]===before[i][k];})));
  actor.draw({time:101,audio:{currentTime:actor.face.data.duration,ended:true}});assert(id+' ended neutral',read('viseme_X')===1);
 }
 actor.manual={viseme:'D',blink:.5,clip:'Explain',expression:{name:'joy',value:.4}};actor.draw({time:2});assert('simultaneous face, eyes, body, mantle',read('viseme_D')===1&&read('blink_L')===.5&&Number.isFinite(arm.quaternion.x));
 // Decode metadata using the real browser media pipeline for every recording.
 audio.pause();
 for(const voice of voices){
  await new Promise((ok,bad)=>{const timer=setTimeout(()=>bad(Error('Media timeout '+voice.id)),10000);audio.onloadedmetadata=()=>{clearTimeout(timer);ok();};audio.onerror=()=>{clearTimeout(timer);bad(Error('Media error '+voice.id));};audio.src=resolve(voice.audio);audio.load();});
  const data=await fetch(resolve(voice.cues)).then(r=>r.json());assert(voice.id+' browser duration',Math.abs(audio.duration-data.duration)<.04,{browser:audio.duration,data:data.duration});
 }
 for(const id of ['ES_01','EN_01']){
  const voice=voices.find(v=>v.id===id);await actor.setRecord({id,path:voice.audio});
  await new Promise((ok,bad)=>{audio.onloadedmetadata=ok;audio.onerror=bad;audio.src=resolve(voice.audio);audio.load();});
  await audio.play();const deadline=performance.now()+3000;while(audio.currentTime<.08&&performance.now()<deadline)await new Promise(requestAnimationFrame);assert(id+' real playback clock',audio.currentTime>0);audio.pause();
  const cue=actor.face.data.mouthCues.find(c=>c.value!=='X'&&c.end-c.start>.12);audio.currentTime=(cue.start+cue.end)/2;actor.manual={blink:0};actor.draw({time:10,audio});assert(id+' real paused seek',read('viseme_'+cue.value)>.99);
 }
 audio.pause();audio.onloadedmetadata=audio.onerror=null;
 actor.manual={viseme:'D',blink:.5,clip:'Explain',expression:{name:'joy',value:.4}};
 const times=[],frames=[];let last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-last);last=now;actor.draw({time:now/1000});times.push(actor.updateMs);}
 times.sort((a,b)=>a-b);frames.sort((a,b)=>a-b);const gl=actor.renderer.getContext();assert('WebGL error',gl.getError()===gl.NO_ERROR);
 const ext=gl.getExtension('WEBGL_debug_renderer_info');const metrics={...actor.metrics,cpuUpdateMedianMs:times[60],cpuUpdateP95Ms:times[114],frameMedianMs:frames[60],frameP95Ms:frames[114],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),viewport:[actor.canvas.width,actor.canvas.height],userAgent:navigator.userAgent};
 actor.manual=old;actor.draw({time:0});return {results,metrics,allPassed:results.every(r=>r.pass),note:'Automated runtime assertions; visual quality and perceptual speech alignment require separate review.'};
}
