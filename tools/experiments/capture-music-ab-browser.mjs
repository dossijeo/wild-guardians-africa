import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const output=resolve(process.argv[2]??'test-results/music-ab-continuity.webm');
const reportPath=output.replace(/\.webm$/i,'.json');
const short=process.env.WG_QA_SHORT_MUSIC==='1';
const staged=process.env.WG_QA_STAGED_MUSIC==='1';
const firstSeconds=short?Number(process.env.WG_QA_FIRST_SECONDS??4):37;
if(!Number.isInteger(firstSeconds)||firstSeconds<1||firstSeconds>37)
  throw Error('WG_QA_FIRST_SECONDS must be an integer from 1 to 37');
const playwrightPath=process.env.WG_QA_PLAYWRIGHT_MODULE;
const {chromium}=await import(playwrightPath?
  playwrightPath.startsWith('file:')?playwrightPath:
    pathToFileURL(playwrightPath).href:'playwright');
const url=new URL('/tests/browser/music-mixer.html',
  process.env.WG_QA_URL??'http://127.0.0.1:5219');
const browser=await chromium.launch({headless:true,
  ...(process.env.WG_QA_CHROME?{executablePath:process.env.WG_QA_CHROME}:
    {channel:'chrome'}),args:['--autoplay-policy=no-user-gesture-required']});
try{
  const page=await browser.newPage(),httpErrors=[],consoleErrors=[];
  page.on('response',response=>{if(response.status()>=400)
    httpErrors.push({status:response.status(),url:response.url()});});
  page.on('console',message=>{if(message.type()==='error'&&
    !message.location().url.endsWith('/favicon.ico'))
    consoleErrors.push({text:message.text(),url:message.location().url});});
  await page.goto(url.href,{waitUntil:'networkidle'});
  const capture=await page.evaluate(async({short,staged,firstSeconds})=>{
    const {AudioSystem}=await import('/src/audio/audio.js');
    const audio=new AudioSystem({music:1,sfx:0});
    audio.resources.stagedMusicHandoff=staged;
    await audio.unlock();
    if(!MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
      throw Error('Chrome cannot record the WebAudio output as Opus');
    const destination=audio.context.createMediaStreamDestination();
    audio.musicGain.connect(destination);
    await audio.gameplay(1);
    const state={day:1,time:100,raid:null,result:null},chunks=[],stages=[];
    const recorder=new MediaRecorder(destination.stream,
      {mimeType:'audio/webm;codecs=opus'});
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    const stopped=new Promise(resolve=>{recorder.onstop=resolve;});
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const runScene=async(scene,seconds)=>{
      state.time=scene==='day'?100:350;
      state.raid=scene==='attack'?{animals:[{}]}:null;
      const start=audio.context.currentTime;
      for(let i=0;i<seconds*10;i++){
        audio.updateMusic(state);await sleep(100);
      }
      stages.push({pack:audio.pack,scene,from:start,
        to:audio.context.currentTime,mixerScene:audio.mixer?.scene??null,
        voices:audio.active.length});
    };
    recorder.start(1000);
    await runScene('day',firstSeconds);
    if(!short){await runScene('night',12);await runScene('attack',12);}
    const switchStart=audio.context.currentTime;
    state.day=2;
    const switching=audio.gameplay(2);
    let handoffPolls=0;
    while(audio.pack!=='b'&&audio.context.currentTime-switchStart<10){
      audio.updateMusic(state);handoffPolls++;await sleep(20);
    }
    await switching;
    if(staged&&handoffPolls===0)throw Error('Staged transition was not pumped');
    stages.push({transition:'A-to-B',from:switchStart,
      to:audio.context.currentTime,pack:audio.pack,handoffPolls});
    await runScene('day',short?4:37);
    if(!short){await runScene('night',12);await runScene('attack',12);}
    recorder.stop();await stopped;
    const blob=new Blob(chunks,{type:recorder.mimeType});
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=reject;
      reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const report={sampleRate:audio.context.sampleRate,stages,short,staged,firstSeconds,
      bytes:blob.size,mimeType:recorder.mimeType,
      musicError:audio.musicError??null};
    audio.dispose();
    return {base64,report};
  },{short,staged,firstSeconds});
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,Buffer.from(capture.base64,'base64'));
  writeFileSync(reportPath,JSON.stringify({...capture.report,
    browserVersion:browser.version(),url:url.href,
    httpErrors,consoleErrors},null,2)+'\n');
  console.log(JSON.stringify({output,reportPath,...capture.report,
    httpErrors,consoleErrors}));
}finally{await browser.close();}
