// Isolated local QA server. Only the fixed pilot report artifact may be written.
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const server=await createServer({server:{host:'127.0.0.1',port:5284,strictPort:true},plugins:[{
  name:'frontside-pilot-report',configureServer(server){server.middlewares.use('/__frontside_report',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    try{let body='';for await(const chunk of req){body+=chunk;if(body.length>20_000_000)throw Error('Report limit');}
      const report=JSON.parse(body);if(!['SELECTION_ONLY_NOT_APPROVED','VISUAL_SCREEN_NOT_APPROVED'].includes(report.status))throw Error('Unexpected report');
      const prefix=report.status==='SELECTION_ONLY_NOT_APPROVED'?(report.cropOnly?'runtime-visibility-crop-pairs':report.workerOnly?'runtime-visibility-worker1024':'runtime-visibility'):'worker-runtime-visual';
      await mkdir('docs/qa/frontside-model-pilot',{recursive:true});
      if(report.capturePng){if(!/^data:image\/png;base64,/.test(report.capturePng))throw Error('Invalid capture');
        await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-last-frame.png',Buffer.from(report.capturePng.split(',')[1],'base64'));
        delete report.capturePng;report.capture=prefix+'-last-frame.png';}
      await writeFile('docs/qa/frontside-model-pilot/'+prefix+'-selection.json',JSON.stringify(report,null,2)+'\n');
      res.setHeader('Content-Type','application/json');res.end('{"saved":true}');
    }catch(error){res.statusCode=400;res.end(String(error));}
  });server.middlewares.use('/__frontside_candidate',async(req,res)=>{
    if(req.method!=='GET'||req.url!=='/youngMale'){res.statusCode=404;res.end();return;}
    try{const file=await import('node:fs/promises').then(fs=>fs.readFile('.cache/frontside-model-pilot/candidates/youngMale-selective-reverse-NOT-APPROVED-web.glb'));res.setHeader('Content-Type','model/gltf-binary');res.end(file);}catch(error){res.statusCode=500;res.end(String(error));}
  });}
}]});await server.listen();server.printUrls();
