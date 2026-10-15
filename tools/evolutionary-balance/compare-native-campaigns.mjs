// Compare observed game outcomes across laboratory versions without treating
// concurrent wall-clock measurements as game-state differences.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function comparableNativeOutcome(report){
 if(report.status!=='completed')throw Error('A complete native campaign report is required');
 return {status:report.status,biome:report.biome,seed:report.seed,days:report.days,
  strategy:report.strategy,genes:report.genes,completedNights:report.completedNights,
  result:report.result,policy:report.policy,defense:report.defense,
  rows:report.rows.map(({wallTime,...row})=>row),raid:report.raid};
}
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compareNativeCampaigns(left,right){
 const a=comparableNativeOutcome(left),b=comparableNativeOutcome(right);
 const sections=['status','biome','seed','days','strategy','genes','completedNights',
  'result','policy','defense','rows','raid'];
 return {equal:isDeepStrictEqual(a,b),leftHash:hash(a),rightHash:hash(b),
  mismatchedSections:sections.filter(key=>!isDeepStrictEqual(a[key],b[key])),
  comparedRows:a.rows.length,comparedRaids:a.raid.length};
}
const load=path=>JSON.parse(path.endsWith('.gz')?
 gunzipSync(readFileSync(path)):readFileSync(path,'utf8'));
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [left,right]=process.argv.slice(2);
 if(!left||!right)throw Error('Usage: compare-native-campaigns.mjs <left.json[.gz]> <right.json[.gz]>');
 const result=compareNativeCampaigns(load(left),load(right));
 console.log(JSON.stringify(result,null,2));
 if(!result.equal)process.exitCode=1;
}
