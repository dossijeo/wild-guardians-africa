import fs from 'node:fs';import z from 'node:zlib';import {createHash} from 'node:crypto';import {isDeepStrictEqual} from 'node:util';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function compareNativeTickData(a,b){
 const fixture=z.gunzipSync(fs.readFileSync(new URL('../docs/qa/hostile-approach-cache/normal-mid-query.json.gz',import.meta.url))),fixtureHash=hash(fixture);
 const inputHash=hash(JSON.stringify(JSON.parse(fixture).state));
 const checks={correctArms:a.report.mode==='baseline'&&b.report.mode==='candidate',
  sameKnownFixture:a.started.snapshotHash===fixtureHash&&b.started.snapshotHash===fixtureHash,
  sameKnownInput:a.report.inputHash===inputHash&&b.report.inputHash===inputHash,
  outputDigestsValid:a.report.outputHash===hash(a.bytes)&&b.report.outputHash===hash(b.bytes),
  byteIdenticalOutput:a.bytes.equals(b.bytes),valueIdenticalOutput:isDeepStrictEqual(JSON.parse(a.bytes),JSON.parse(b.bytes))};
 return {valid:Object.values(checks).every(Boolean),checks,fixtureHash,inputHash,baselineOutputHash:hash(a.bytes),candidateOutputHash:hash(b.bytes),baselineMilliseconds:a.report.ms,candidateMilliseconds:b.report.ms,
  scope:'Exact retained single-tick comparison only; no campaign, statistical balance, GPU or main-integration acceptance.'};
}
export function readNativeTick(prefix){return {report:JSON.parse(fs.readFileSync(prefix+'.json')),started:JSON.parse(fs.readFileSync(prefix+'-started.json')),bytes:z.gunzipSync(fs.readFileSync(prefix+'-state.json.gz'))};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [control,candidate,out,...extra]=process.argv.slice(2);if(!control||!candidate||!out||extra.length)throw Error('Pass completed baseline and candidate prefixes plus fresh comparison output');const result=compareNativeTickData(readNativeTick(control),readNativeTick(candidate));fs.writeFileSync(out,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));process.exitCode=result.valid?0:2;}catch(error){console.error(error.stack);process.exitCode=1;}
}
