// Native QA fixture: measure target selection before and after a real breach.
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {fixture} from '../probe-raid-reservation-saturation.mjs';
import {spawnRaid,updateRaid} from '../../src/simulation/raids.js';

const [output]=process.argv.slice(2);
if(!output)throw Error('Usage: node probe-enclosure-closure.mjs output.json');
const cases=[];
for(const breached of [false,true]){
  const {s,nav}=fixture('closed-walls');
  if(breached){
    for(const id of ['wall-2-4','wall-2-5']){
      const wall=s.structures.find(t=>t.id===id);wall.status='ruined';wall.hp=0;
    }
    nav.setState(s);
  }
  const paths={all:0,crops:0,structures:0,success:0},groups={all:0,rejected:0};
  const oldPath=nav.approachPath.bind(nav),oldGroup=nav.approachGroupBlocked.bind(nav);
  nav.approachPath=(start,end,...rest)=>{
    paths.all++;
    const plant=s.plants.some(p=>end.id?.startsWith(`approach-${p.id}-`));
    if(plant)paths.crops++;else paths.structures++;
    const result=oldPath(start,end,...rest);if(result)paths.success++;return result;
  };
  nav.approachGroupBlocked=(...args)=>{groups.all++;const result=oldGroup(...args);if(result)groups.rejected++;return result;};
  const started=performance.now();
  if(!spawnRaid(s,{group:Array(12).fill('warthog')},nav))throw Error('Native raid failed to spawn');
  updateRaid(s,0,nav);
  cases.push({breached,milliseconds:performance.now()-started,paths,groups,targets:s.raid.animals.map(a=>a.targetId),cropTargets:s.raid.animals.filter(a=>s.plants.some(p=>p.id===a.targetId)).length,wallTargets:s.raid.animals.filter(a=>s.structures.some(t=>t.id===a.targetId&&t.kind==='wall')).length});
}
const report={cases};writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
