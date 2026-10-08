// Offline-only decorative landscape, independent of gameplay terrain/identity.
export const backdropBiomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
const colors={savanna:['#afa6a7','#b8a69c','#b19c82'],grand_river:['#96aaa0','#80988c','#759080'],mangrove:['#9db2ab','#8ca49a','#7d978b'],volcanoes:['#989b9c','#888e90','#727e82'],canyons:['#bfaa9c','#ae958b','#9d827a'],desert:['#c4b69d','#b2a28d','#a39381']};
function random(seed){return()=>{seed=Math.imul(seed^seed>>>15,1|seed);seed^=seed+Math.imul(seed^seed>>>7,61|seed);return ((seed^seed>>>14)>>>0)/4294967296;};}
export function backdropProfile(biome,layer,{savannaRidges=7}={}){
 if(!Number.isInteger(savannaRidges)||savannaRidges<7||savannaRidges>32)throw Error('Invalid savanna ridge count');
 const index=backdropBiomes.indexOf(biome);if(index<0||!Number.isInteger(layer)||layer<0||layer>2)throw Error('Invalid backdrop profile');
 const step=(biome==='savanna'||biome==='grand_river')?8:16,r=random(1471+index*193+layer*277),jitter=Array.from({length:2048/step},()=>r()*7),points=[];
 // Broad separated ridges and short mesa caps, independently composed per layer.
 // Avoid three phase-aligned sine waves that read as parallel horizontal bands.
 const riverRidges=biome==='grand_river'?Array.from({length:16},(_,i)=>({center:(i+.1+r()*.8)*2048/16,width:70+r()*70,height:185+r()*145-layer*14})):null;
 const ridges=biome==='savanna'?Array.from({length:savannaRidges},(_,i)=>({center:(i+.15+r()*.7)*2048/savannaRidges,width:(125+r()*110)*7/savannaRidges,height:105+r()*95-layer*12,cap:.10+r()*.17})):null;
 for(let x=0;x<=2048;x+=step){const wrap=x%2048;let height;
  if(ridges){let relief=0;for(const ridge of ridges){const dx=Math.min(Math.abs(wrap-ridge.center),2048-Math.abs(wrap-ridge.center)),p=dx/ridge.width;relief=Math.max(relief,ridge.height*(p<ridge.cap?1:Math.max(0,1-(p-ridge.cap)/(1-ridge.cap))));}height=315+layer*42-relief+Math.sin(wrap*Math.PI*2/2048*(5+layer)) * 3;}
  else if(riverRidges){let relief=0;for(const ridge of riverRidges){const dx=Math.min(Math.abs(wrap-ridge.center),2048-Math.abs(wrap-ridge.center)),p=dx/ridge.width;relief=Math.max(relief,p<1?ridge.height*(1+Math.cos(p*Math.PI))*.5:0);}height=345+layer*35-relief;}
  else if(biome==='canyons'||biome==='desert'){const mesa=Math.floor(wrap/64);height=170+(mesa%3)*43+jitter[Math.floor(wrap/step)]+layer*55;}
  else if(biome==='volcanoes'){let mountain=0;for(let peak=0;peak<8;peak++){const center=128+peak*256,dx=Math.min(Math.abs(wrap-center),2048-Math.abs(wrap-center));mountain=Math.max(mountain,Math.max(0,1-dx/150)*(140+20*Math.cos(peak)));}height=300-mountain+layer*34;}
  else height=220+Math.sin(wrap*Math.PI*2/2048)*46+Math.sin(wrap*Math.PI*2/512)*18+layer*45+jitter[Math.floor(wrap/step)];
  points.push([x,(biome==='savanna'||riverRidges)?Number(height.toFixed(3)):height]);
 }
 return points;
}
export function backdropSvg(biome,options={}){const paths=Array.from({length:3},(_,layer)=>{
 const profile=backdropProfile(biome,layer,options),base=`<path d="M 0,512 L ${profile.map(p=>p.join(',')).join(' L ')} L 2048,512 Z" fill="${colors[biome][layer]}"/>`;
 if(biome!=='savanna')return base;
 // Low contrast relief is baked offline. Every facet follows its actual skyline
 // segment before descending into the opaque body: no clipping masks or holes.
 const facets=[];
 for(let start=0;start<profile.length-1;start+=16){const contour=profile.slice(start,Math.min(start+17,profile.length));if(contour.length<2)continue;
 const left=contour[0][0],right=contour.at(-1)[0],tip=left+(right-left)*(.35+((start/16+layer)%3)*.13),shade=(start/16+layer)%2===0?'#69553e':'#eadbc4';
 facets.push(`<path d="M ${contour.map(p=>p.join(',')).join(' L ')} L ${tip},512 Z" fill="${shade}" opacity="${.065+layer*.015}"/>`);
 }
 return base+facets.join('');
 });return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512" viewBox="0 0 2048 512">${paths.join('')}</svg>`;}
