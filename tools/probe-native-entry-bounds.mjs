// Read-only diagnostic: every probe copies the retained state and keeps the
// complete pending wave. Expanded selection bounds are not render residency.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import {animalSpec,randomInt} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
const [directory,output]=process.argv.slice(2);
assert(directory&&output&&!existsSync(output),'Requires retained failed campaign and fresh output');
const file=directory+'/partial-state.json.gz',raw=readFileSync(file);
const partial=JSON.parse(readFileSync(directory+'/partial.json'));
const context=JSON.parse(partial.entryTransport.waits.at(-1).key);
const originalBounds=context[7],view=context[8],group=context[6];
const sha=b=>createHash('sha256').update(b).digest('hex');
const paths=['tools/probe-native-entry-bounds.mjs','src/simulation/raids.js','src/simulation/raid-exterior-entry.js','src/simulation/raid-exterior-connectivity.js','src/simulation/raid-exterior-detour.js','src/world/navigation.js'];
const sourceHashes=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]));
const rows=[];
for(const padding of [0,24,48,96]){
 const s=deserialize(gunzipSync(raw).toString());
 assert.deepEqual(s.nightPlan.group,group);
 const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`)).profile;
 const bounds=originalBounds.map((v,i)=>v+(i<2?-padding:padding));
 const nav=new Navigation(s.seed,s.biome,profile);
 nav.setState(s);nav.setActiveBounds(bounds);nav.setRaidView(view.eye,view.target);
 const specs=group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
 const began=performance.now(),entry=chooseRaidEntry(s,specs,bounds,randomInt(s,0,3),nav);
 rows.push({padding,bounds,actors:entry?.entries.length??0,entry,milliseconds:performance.now()-began});
 console.log(JSON.stringify({padding,actors:entry?.entries.length??0,milliseconds:rows.at(-1).milliseconds}));
}
assert.equal(sha(readFileSync(file)),sha(raw));
for(const p of paths)assert.equal(sha(readFileSync(p)),sourceHashes[p]);
writeFileSync(output,JSON.stringify({input:file,inputSha256:sha(raw),sourceHashes,group,originalBounds,view,rows,
 scope:'Read-only copied-state native complete-wave selection. Bounds expansion is diagnostic only, not resident chunks, actual spawn, GPU/frame time or campaign completion.'},null,2)+'\n');
