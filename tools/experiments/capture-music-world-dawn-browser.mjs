import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const output=resolve(process.argv[2]??'test-results/music-world-dawn-audible.webm');
const reportPath=output.replace(/\.webm$/i,'.json');
const modulePath=process.env.WG_QA_PLAYWRIGHT_MODULE;
const {chromium}=await import(modulePath?
  modulePath.startsWith('file:')?modulePath:pathToFileURL(modulePath).href:
  'playwright');
const url=new URL('/tests/browser/music-world-dawn.html?days=1&audible=1',
  process.env.WG_QA_URL??'http://127.0.0.1:5219');
const browser=await chromium.launch({headless:true,
  ...(process.env.WG_QA_CHROME?{executablePath:process.env.WG_QA_CHROME}:
    {channel:'chrome'}),args:['--autoplay-policy=no-user-gesture-required']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),
    browserErrors=[];
  page.on('pageerror',error=>browserErrors.push(String(error)));
  await page.goto(url.href);
  await page.waitForFunction(()=>document.querySelector('#run')?.disabled===false||
    document.querySelector('#status')?.textContent?.startsWith('FAIL:'),
  null,{timeout:120000});
  const ready=await page.locator('#status').textContent();
  if(ready.startsWith('FAIL:'))throw Error(`Fixture setup: ${ready}`);
  await page.locator('#run').click();
  await page.waitForFunction(()=>window.__wildMusicQaAudio?.musicGain&&
    window.__wildMusicQaAudio?.sfxGain,null,{timeout:60000});
  await page.evaluate(()=>{
    const audio=window.__wildMusicQaAudio;
    if(!MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
      throw Error('Chrome cannot record the native world audio as Opus');
    const destination=audio.context.createMediaStreamDestination(),chunks=[];
    audio.musicGain.connect(destination);audio.sfxGain.connect(destination);
    const recorder=new MediaRecorder(destination.stream,
      {mimeType:'audio/webm;codecs=opus'});
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.start(1000);
    window.__wildMusicQaRecord={recorder,chunks,
      startedAt:audio.context.currentTime};
  });
  const deadline=Date.now()+Number(process.env.WG_QA_MAX_MS??900000);
  let progress;
  for(;;){
    const status=await page.locator('#status').textContent();
    progress=JSON.parse(await page.locator('#report').textContent());
    if(/^(Completada|FAIL:)/.test(status))break;
    if(Date.now()>deadline)throw Error(`Audible dawn deadline: ${status}`);
    console.error(`${progress.phase}: day ${progress.day}, steps ${progress.steps}`);
    await page.waitForTimeout(15000);
  }
  const recording=await page.evaluate(async()=>{
    const {recorder,chunks,startedAt}=window.__wildMusicQaRecord;
    const stopped=new Promise(resolve=>{recorder.onstop=resolve;});
    recorder.stop();await stopped;
    const blob=new Blob(chunks,{type:recorder.mimeType});
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=reject;
      reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
    return {base64,startedAt,bytes:blob.size,mimeType:recorder.mimeType};
  });
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,Buffer.from(recording.base64,'base64'));
  const report={url:url.href,browserVersion:browser.version(),
    startedAt:recording.startedAt,bytes:recording.bytes,
    mimeType:recording.mimeType,browserErrors,fixture:progress};
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  if(progress.phase!=='complete'||progress.errors?.length||browserErrors.length)
    throw Error(`Audible native dawn failed: ${JSON.stringify({
      phase:progress.phase,errors:progress.errors,browserErrors})}`);
  console.log(JSON.stringify({output,reportPath,steps:progress.steps,
    packs:progress.history.map(item=>item.pack),bytes:recording.bytes,
    context:progress.context,browserErrors}));
}finally{await browser.close();}
