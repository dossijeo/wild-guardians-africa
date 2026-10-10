// Predictive geometry experiment only. No purchases or accepted defense plans.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

const [input,output]=process.argv.slice(2);
assert.ok(input&&output&&!existsSync(output),'Use retained diagnostic and fresh output');
const prior=JSON.parse(readFileSync(input)),bytes=readFileSync(prior.input);
const state=deserialize(gunzipSync(bytes).toString()),before=serialize(state);
const profilePath=`public/content/biome-${BIOME_IDS[state.biome]}.json`;
const nav=new Navigation(state.seed,state.biome,JSON.parse(readFileSync(profilePath)).profile);nav.setState(state);
const failed=prior.rows.find(r=>r.proof?.checks?.some(c=>c.services?.reason==='native-service-origin-unproven'));
assert.ok(failed);
const check=failed.proof.checks.find(c=>c.services?.reason==='native-service-origin-unproven');
const {point,targetId}=check.services,radius=check.radius;
assert.ok(nav.walkable(point.x,point.z,radius,null,false));
const rows=[];
for(let iz=-2;iz<=2;iz++)for(let ix=-2;ix<=2;ix++)for(let angleIndex=0;angleIndex<4;angleIndex++){
 const angle=angleIndex*Math.PI/4,c={x:point.x+ix*.5,z:point.z+iz*.5};
 const dx=Math.cos(angle)*.545,dz=Math.sin(angle)*.545;
 const points=[[c.x-dx,c.z-dz],[c.x+dx,c.z+dz]];
 const quote=Game.quoteWallChain(state,'zarzas',points,nav,{smooth:false,snap:false});
 const view=nav.forBuildingPlacement({id:'qa-local-defense-only',x:1e12,z:1e12,radius:0,kind:'house'});
 const updates=new Map(quote.updates.map(u=>[u.id,u]));
 view.obstacles=[...nav.obstacles.map(w=>updates.has(w.id)?{...w,...updates.get(w.id)}:w),...quote.pieces];
 const blocksPose=quote.pieces.length>0&&!view.walkable(point.x,point.z,radius,null,false);
 rows.push({points,pieces:quote.pieces.length,cost:quote.cost,blocksPose,gate:quote.pieces.some(p=>p.gate),quotedPieces:blocksPose?quote.pieces:undefined});
}
assert.equal(serialize(state),before,'Predictive quotes must not mutate state/RNG/ledger');
assert.deepEqual(readFileSync(prior.input),bytes,'Original checkpoint must remain unchanged');
const accepted=rows.filter(r=>r.blocksPose&&!r.gate);
const result={input:prior.input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),targetId,point,radius,attempts:rows.length,legal:rows.filter(r=>r.pieces).length,blockingCandidates:accepted.length,rows,stateUnchanged:true,scope:'Native legal local wall quotes that block one unproven hostile pose. No payment, worker-route or complete-perimeter certification; not economic acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({attempts:rows.length,legal:result.legal,blockingCandidates:accepted.length,stateUnchanged:true}));
