// Summarizes observed rectangles only; missing levels are never equality.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const file=process.argv[2],raw=await readFile(file),report=JSON.parse(raw),frames=report.sourceDrawAudit?.frames.filter(frame=>frame.mesh==='Mesh0'&&frame.colorTexels);
if(!report.sourceColorTexels||!frames?.length||report.samples.length)throw Error('Expected source-only texel diagnostic with no candidate samples');
const rows=[];
for(const source of frames[0].colorTexels.rows){
 const captured=frames.map(frame=>frame.colorTexels.rows.find(row=>row.uniform===source.uniform));
 if(captured.some(row=>!row))throw Error('Missing sampler record');
 const levels=source.levels.map(level=>({level:level.level,status:level.status,rectangle:[level.width,level.height],readType:level.readType,readBytes:level.fingerprint?.bytes??null,
  observedCaptureCount:captured.filter(row=>row.levels.find(other=>other.level===level.level)?.status==='COLOR_RECTANGLE_READ').length,
  distinctObservedFingerprints:new Set(captured.flatMap(row=>{const other=row.levels.find(other=>other.level===level.level);return other?.status==='COLOR_RECTANGLE_READ'?[JSON.stringify(other.fingerprint)]:[];})).size,
  nonfiniteReadValues:captured.reduce((sum,row)=>sum+(row.levels.find(other=>other.level===level.level)?.nonfiniteValues??0),0)}));
 rows.push({uniform:source.uniform,status:source.status,width:source.width,height:source.height,expectedLevels:source.expectedLevels,requestedFirstLevel:source.requestedFirstLevel??0,totalReadBytesPerCapture:source.totalReadBytes,levels,
  meaning:'Only COLOR_RECTANGLE_READ captures counted; unsupported/absent levels are unobserved. One distinct FNV is not cryptographic equality or causal/quality proof.'});
}
console.log(JSON.stringify({status:'SOURCE_COLOR_TEXEL_DIAGNOSTIC_NOT_APPROVAL',file,reportSha256:createHash('sha256').update(raw).digest('hex'),sourceSha256:report.sourceSha256,captures:frames.length,sameFramebufferReadbacks:report.sameFramebufferReadbacks,sourceOnlyControls:report.sourceOnlyDiagnosis.controls,sourceControlMetrics:report.sourceOnlyDiagnosis.controlMetrics,rows,limitations:['Dimensions/mip count are CPU metadata; actual sampler texture identity and readable FBO checked, not GPU storage extent.', 'FNV32 collisions are possible; unobserved levels/depth/compressed/cube remain explicitly unobserved.', 'Readbacks alter scheduling/timing; no source cause identified, candidate sampled or GPU benchmark.']},null,2));
