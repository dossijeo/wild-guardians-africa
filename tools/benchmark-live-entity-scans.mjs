import {performance} from 'node:perf_hooks';
import {activeCrops} from '../src/simulation/active-crops.js';
import {activeCrates} from '../src/simulation/active-crates.js';

const history=Number(process.argv[2]??20000),live=Number(process.argv[3]??500),iterations=Number(process.argv[4]??1000);
const plants=[...Array.from({length:history},(_,i)=>({id:i,alive:false,x:i,z:0})),...Array.from({length:live},(_,i)=>({id:history+i,alive:true,x:i,z:0}))];
const crates=[...Array.from({length:history},(_,i)=>({id:i,delivered:true})),...Array.from({length:live},(_,i)=>({id:history+i,delivered:false}))];
const variants={
  scan:()=>plants.filter(p=>p.alive&&Math.hypot(p.x,p.z)<140).length+crates.filter(c=>!c.delivered).length,
  indexed:()=>activeCrops(plants).filter(p=>Math.hypot(p.x,p.z)<140).length+activeCrates(crates).length
};
for(const variant of Object.values(variants))for(let i=0;i<100;i++)variant();
const runs=[];
for(const name of ['scan','indexed','indexed','scan','scan','indexed','indexed','scan']){
  const start=performance.now();let checksum=0;
  for(let i=0;i<iterations;i++)checksum+=variants[name]();
  runs.push({name,ms:Number((performance.now()-start).toFixed(2)),checksum});
}
console.log(JSON.stringify({history,live,iterations,runs},null,2));
