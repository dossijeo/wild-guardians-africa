import * as THREE from 'three';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {prepareNaturalWater} from '../../src/rendering/natural-water-edges.js';
const baseline='4c8cf15fb';
let source=execFileSync('git',['show',baseline+':src/rendering/natural-water-edges.js'],{encoding:'utf8'});
source=source.replace("from 'three'",'from '+JSON.stringify(pathToFileURL(resolve('node_modules/three/build/three.module.js')).href));
const old=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).prepareNaturalWater;
const results=[];
for(let i=0;i<40;i++){
 const positions=[];const n=5+i%13,radius=3+i*.43;
 for(let j=0;j<n;j++)positions.push(0,0,0,Math.cos(j/n*Math.PI*2)*radius,0,Math.sin(j/n*Math.PI*2)*radius,Math.cos((j+1)/n*Math.PI*2)*radius,0,Math.sin((j+1)/n*Math.PI*2)*radius);
 const field={canyon:false,wetland:true,wetlandLevel:()=>.42,waterInfo:(x,z)=>({mask:.65+.2*Math.sin(x*.37)*Math.cos(z*.21)})};
 const w={state:{biome:'manglares'},nav:{field}};
 const run=fn=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const m=new THREE.MeshBasicMaterial();fn(w,g,i%5-2,Math.floor(i/5)-4,m);const shader={uniforms:{},fragmentShader:'vec3 base=uInk0*.72;\n#include <opaque_fragment>',vertexShader:''};m.onBeforeCompile(shader,null);const data=new Uint8Array(shader.uniforms.qaBed.value.image.data);const metadata=g.userData.naturalWaterBed;m.dispose();g.dispose();return {data,metadata};};
 const a=run(old),b=run(prepareNaturalWater);let differences=0;for(let j=0;j<a.data.length;j++)differences+=a.data[j]!==b.data[j];if(a.data.length!==b.data.length||JSON.stringify(a.metadata)!==JSON.stringify(b.metadata)||differences)throw Error('Water bed mismatch '+i+' channels '+differences);results.push({case:i,channels:a.data.length,differences});
}
const out={baseline,cases:results.length,channels:results.reduce((s,r)=>s+r.channels,0),results};
writeFileSync('docs/qa/global-visual-lab/mangrove-water-distance-squared-20261023/byte-equivalence.json',JSON.stringify(out,null,2)+'\n');console.log(out.cases,'cases;',out.channels,'identical channels');
