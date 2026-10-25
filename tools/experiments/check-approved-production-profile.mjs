// Compare production defaults with the reviewed recipe without injecting graphics.
// The shared harness only supplies the saved fixture, pauses at readiness and
// exposes observations. This is not a substitute for an untouched UI/build test.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sourceUrl=new URL('./check-spatial-thread-game.mjs',import.meta.url);
let source=await readFile(sourceUrl,'utf8');
const sourceSha256=createHash('sha256').update(source).digest('hex');
const mode=process.env.WG_PRODUCTION_PROFILE_MODE??'production';
if(!['production','review'].includes(mode))throw Error('Expected production or review mode');
function replace(anchor,replacement){if(source.split(anchor).length!==2)throw Error('Shared harness anchor changed: '+anchor.slice(0,70));source=source.replace(anchor,replacement);}
replace(' await page.goto(gameUrl.href);',` gameUrl.search=${mode==='production'?"''":"globalCurrentReviewQuery(biome)"};\n for(const [env,key]of [['WG_FRAME_SCHEDULER','frameScheduler'],['WG_MUD_EDGE_WORKER','mudEdgeWorker']])if(['0','1'].includes(process.env[env]))gameUrl.searchParams.set(key,process.env[env]);\n await page.goto(gameUrl.href);`);
const reportAnchor=" await writeFile(process.env.WG_THREAD_REPORT??'docs/qa/wild-engine-pthreads/thread-game.json',JSON.stringify({scope:";
replace(reportAnchor,` result.productionVisual=await page.evaluate(()=>({search:qaThreadWorld.visualSearch,coverage:qaThreadWorld.groundDetails?.audit?.(),cache:qaThreadWorld.mangroveMaterialCache?.stats??null,sky:qaThreadWorld.sky.atmosphere,globalLighting:qaThreadWorld.toon.globalVisualLighting}));\n result.productionHarness=${JSON.stringify({mode,sourceSha256})};\n${reportAnchor}`);
const temporary=new URL('./qa-production-profile-'+process.pid+'.mjs',import.meta.url);
try{await writeFile(temporary,source);await import(temporary.href);}finally{await unlink(fileURLToPath(temporary));}
