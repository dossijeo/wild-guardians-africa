import fs from 'node:fs';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {sharedLeafGpuReportPrefix} from './lib/frontside-shared-leaf-gpu-report.mjs';import {analysePairedGpu} from './lib/frontside-paired-gpu-analysis.mjs';
const folder=process.argv[2];if(!folder)throw Error('Usage: GPU archive directory');const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),manifest=JSON.parse(fs.readFileSync(folder+'/manifest.json')),zipped=fs.readFileSync(folder+'/report.json.gz'),raw=gunzipSync(zipped),png=fs.readFileSync(folder+'/last-frame.png');
for(const [field,bytes] of [['gzipSha256',zipped],['rawJsonSha256',raw],['pngSha256',png]])if(sha(bytes)!==manifest[field])throw Error('Digest mismatch '+field);
const report=JSON.parse(raw);sharedLeafGpuReportPrefix(report);if(png.readUInt32BE(16)!==1280||png.readUInt32BE(20)!==720)throw Error('Capture dimensions changed');
let analysis=null;
if(report.campaign==='timing'){try{analysis=analysePairedGpu(report.blocks);}catch(error){if(!manifest.analysisError)throw error;}if(JSON.stringify(analysis)!==JSON.stringify(manifest.analysis))throw Error('Manifest analysis differs from replay');}
else if(report.bufferAudit.liveBytes!==0||report.bufferAudit.liveBuffers.length!==0)throw Error('Observed buffer cleanup incomplete');
console.log(JSON.stringify({status:'NATIVE_GPU_ARCHIVE_VERIFIED_NOT_CATEGORY_APPROVAL',runId:manifest.runId,samples:report.blocks.reduce((n,b)=>n+(b.gpu?.samples?.length??0),0),savedPercent:analysis?.savedPercent??null,cleanup:report.cleanup,contextLost:report.contextLost}));
