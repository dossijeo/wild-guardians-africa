import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const binary=readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url));
const module=new WebAssembly.Module(binary);
const samples=[];
for(const seed of [712,28,123]){
  const core=createSpatialSavannaPrototype(module);
  core.generate(seed,0,0);
  core.buildNavigation(.28,true);
  core.buildNavigation(1.1,false);
  const barriers=[];
  for(const count of [0,16,64,256]){
    const addStart=performance.now();
    while(barriers.length<count){
      const i=barriers.length,x=-22+(i%16)*3,z=-22+Math.floor(i/16)*3;
      const id=core.addBarrier(x,z,.22,.22,0);
      if(id<=0)throw Error(`Barrier ${i} was rejected`);
      barriers.push(id);
    }
    const addMs=performance.now()-addStart;
    const routeStart=performance.now();
    let routes=0;
    for(let i=0;i<24;i++){
      const x=-19+(i%8)*5,z=-19+Math.floor(i/8)*12;
      if(core.route({x,z},{x:x+1,z}).status==='found')routes++;
    }
    const routeMs=performance.now()-routeStart;
    const editStart=performance.now();
    const last=barriers.at(-1);
    if(last){
      if(core.setBarrierPassability(last,1)!==1||core.setBarrierPassability(last,0)!==1)
        throw Error('Barrier passability edit failed');
    }
    const editMs=performance.now()-editStart;
    samples.push({seed,count,addMs,routeMs,editMs,routes,metrics:core.metrics()});
  }
}
const report={kind:'isolated-spatial-barrier-scaling',samples};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
else process.stdout.write(JSON.stringify(report,null,2)+'\n');
