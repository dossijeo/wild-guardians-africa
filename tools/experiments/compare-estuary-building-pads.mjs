import fs from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {centerFootprint} from '../../src/world/centers.js';
const base='docs/qa/mangrove-magic-20261026/';
const input=JSON.parse(await fs.readFile(process.env.WG_PAD_REPORT??base+'current-cut-pixel-audit/report.json','utf8'));
const state=JSON.parse(input.data.snapshot);
const module=new WebAssembly.Module(await fs.readFile('src/world/wild-engine/spatial-savanna.wasm'));
const natural=createSpatialWorld(module),settled=createSpatialWorld(module),fitted=createSpatialWorld(module);
for(const core of [natural,settled,fitted])core.generate(state.seed,1,0,'mangrove',{mangroveNetwork:true});
const sites=state.villages.map(v=>{const points=[...v.buildings.filter(b=>b.kind!=='Zona comÃºn').map(b=>b.footprint),centerFootprint(v.center,state).footprint].flat();return {x:v.x,z:v.z,hx:Math.max(...points.map(p=>Math.abs(p.x-v.x)))+1.25,hz:Math.max(...points.map(p=>Math.abs(p.z-v.z)))+1.25};});
for(const s of sites)settled.addSettlement(s.x,s.z,s.hx,s.hz);
const fittedSites=state.villages.flatMap(v=>[...v.buildings.filter(b=>b.kind!=='Zona común').map(b=>b.footprint),centerFootprint(v.center,state).footprint].map(points=>{const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);return {x:(minX+maxX)/2,z:(minZ+maxZ)/2,hx:(maxX-minX)/2+1.25,hz:(maxZ-minZ)/2+1.25};}));
const fitStart=performance.now();for(const s of fittedSites)fitted.addSettlement(s.x,s.z,s.hx,s.hz);const fitMs=performance.now()-fitStart;
const footprintSamples=state.villages.flatMap(v=>[...v.buildings.filter(b=>b.kind!=='Zona común').map(b=>b.footprint),centerFootprint(v.center,state).footprint]).flatMap(points=>points.flatMap((p,i)=>{const q=points[(i+1)%points.length];return Array.from({length:9},(_,j)=>({x:p.x+(q.x-p.x)*j/8,z:p.z+(q.z-p.z)*j/8}));}));
const wetFootprintSamples=footprintSamples.filter(p=>fitted.wetlandMaskAnywhere(p.x,p.z)>.61).length;
if(wetFootprintSamples)throw Error('Building perimeter flooded');
const pixels=JSON.parse(await fs.readFile(process.env.WG_PAD_PIXELS??base+'current-cut-targeted/pixel-audit.json','utf8'));
const probes=pixels.map(p=>{const h=p.hits.find(h=>h.tags.regional);const [x,,z]=h.point;return {pixel:p.pixel,x,z,runtime:h.field.mask,natural:natural.wetlandMaskAnywhere(x,z),settled:settled.wetlandMaskAnywhere(x,z),fitted:fitted.wetlandMaskAnywhere(x,z)};});
if(probes.some(p=>Math.abs(p.runtime-(state.mangroveSettlementVersion===1?p.fitted:p.settled))>1e-5))throw Error('Recreated settlement does not match runtime');
let removed=0,wet=0,fittedRemoved=0;const panels=[];
for(const [label,core] of [['Natural',natural],['Poblado real',settled],['Por edificio',fitted]]){let cells='';for(let z=-60;z<60;z+=.5)for(let x=0;x<120;x+=.5){const a=natural.wetlandMaskAnywhere(x,z),b=core.wetlandMaskAnywhere(x,z);if(label==='Poblado real'){if(a>.61)wet++;if(a>.61&&b<=.61)removed++;}if(label==='Por edificio'&&a>.61&&b<=.61)fittedRemoved++;const color=b>.61?'#386b81':b>.25?'#9a8762':'#77895d';cells+=`<rect x="${x*4}" y="${(z+60)*4}" width="2" height="2" fill="${color}"/>`;}
for(const p of probes)cells+=`<circle cx="${p.x*4}" cy="${(p.z+60)*4}" r="2.5" fill="#ff6655"/>`;
panels.push(`<g transform="translate(${panels.length*500+10},40)">${cells}<text x="0" y="-12" fill="white">${label}</text></g>`);}
const out=process.env.WG_PAD_OUT??base+'building-pad-experiment';await fs.mkdir(out,{recursive:true});
const report={seed:state.seed,sites,fittedSites,fitMs,fittedRemoved,footprintSamples:footprintSamples.length,wetFootprintSamples,probes,naturalWetSamples:wet,removedWetSamples:removed,step:.5,bounds:[0,-60,120,60],runtimeMatched:true};
await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
await fs.writeFile(out+'/map.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="540"><rect width="1500" height="540" fill="#20252a"/>${panels.join('')}<text x="10" y="530" fill="white">Native WASM mask; red dots: screenshot probes; same seed, only settlement differs</text></svg>`);
console.log(JSON.stringify({sites,fittedSites:fittedSites.length,fitMs,removed,wet,fittedRemoved}));
