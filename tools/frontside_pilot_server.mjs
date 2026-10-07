// Isolated local QA server. Only the fixed pilot report artifact may be written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const server=await createServer({server:{host:'127.0.0.1',port:5284,strictPort:true},plugins:[{
  name:'frontside-pilot-report',configureServer(server){server.middlewares.use('/__frontside_report',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>20_000_000)throw Error('Report limit');}
      const report=JSON.parse(body);if(!['SELECTION_ONLY_NOT_APPROVED','VISUAL_SCREEN_NOT_APPROVED'].includes(report.status))throw Error('Unexpected report');
      const prefix=report.status==='SELECTION_ONLY_NOT_APPROVED'?(report.cropOnly?'runtime-visibility-crop-pairs':report.workerOnly?'runtime-visibility-worker1024':'runtime-visibility'):report.cropVisual?'crop-runtime-visual':'worker-runtime-visual';
      await mkdir('docs/qa/frontside-model-pilot',{recursive:true});
      if(report.capturePng){if(!/^data:image\/png;base64,/.test(report.capturePng))throw Error('Invalid capture');
        await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-last-frame.png',Buffer.from(report.capturePng.split(',')[1],'base64'));
        delete report.capturePng;report.capture=prefix+'-last-frame.png';}
      await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-selection.json',JSON.stringify(report,null,2)+'\n');
      res.setHeader('Content-Type','application/json');res.end('{"saved":true}');
    }catch(error){res.statusCode=400;res.end(String(error));}
  });server.middlewares.use('/__frontside_candidate',async(req,res)=>{
    const paths={'/youngMale':'.cache/frontside-model-pilot/candidates/youngMale-selective-reverse-NOT-APPROVED-web.glb','/youngMale-local-normal':'.cache/frontside-model-pilot/candidates/Can_Nozzle_geometry_4-local-normal-NOT-APPROVED-web.glb','/youngMale-badge-normal':'.cache/frontside-model-pilot/candidates/Can_badge_geometry_5-normals-cleanup-v2-NOT-APPROVED-web.glb'};
    if(req.method!=='GET'||!paths[req.url]){res.statusCode=404;res.end();return;}
    try{const file=await import('node:fs/promises').then(fs=>fs.readFile(paths[req.url]));res.setHeader('Content-Type','model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}
  });}
}]});await server.listen();server.printUrls();
