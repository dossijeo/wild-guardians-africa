import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {globalCurrentReviewQuery} from './global-current-review-recipe.mjs';
const root='docs/qa/global-visual-lab/current-review-20261025/';
const dirs=['manglares-resident-mask-low','desierto-clearance-corrected-motion','volcanes-step16-motion-low','canyon-handoff-integrated-low'];
const reports=[];
for(const directory of dirs){
 const bytes=await readFile(root+directory+'/active-play.json'),j=JSON.parse(bytes);
 const records=j.records.map(r=>{
  const actual=new URL(r.captureUrl).searchParams,expected=new URLSearchParams(globalCurrentReviewQuery(r.biome));
  const differences=[...new Set([...actual.keys(),...expected.keys()])].filter(k=>actual.get(k)!==expected.get(k)).map(k=>({key:k,recorded:actual.get(k),current:expected.get(k)}));
  return {biome:r.biome,quality:r.quality,phase:r.phase,groundStep:r.groundStep??null,differences,frames:r.frames.length,errors:r.errors,finalGlError:r.finalGlError,motionPath:r.motionPath??null};
 });
 reports.push({directory,sha256:createHash('sha256').update(bytes).digest('hex'),records});
}
await writeFile(root+'motion-recipe-reconciliation.json',JSON.stringify({scope:'Query and metadata reconciliation only. Does not establish source equivalence across commits or visual correctness.',reports},null,2)+'\n');
