// Adapted from the supplied 200% overlay lab (provenance.json). Canvas-only presentation.
export function createOverlayPainter(ctx){
let w=960,h=540;const prefs={particles:true};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const ease=t=>1-(1-t)**3;
const alphaColor=(rgb,a)=>`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(a)})`;
function seedRandom(seed){return ()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
const seeds = Array.from({length:72},(_,i)=>{const rand=seedRandom(14321+i*713);return {x:rand(),y:rand(),a:rand()*Math.PI*2,r:rand(),speed:.5+rand(),size:.45+rand(),phase:rand(),sign:rand()>.5?1:-1}});
const glowCache=new Map();
function glowSprite(rgb){const key=rgb.join(',');if(glowCache.has(key))return glowCache.get(key);const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');const r=g.createRadialGradient(48,48,0,48,48,48);r.addColorStop(0,alphaColor(rgb,.85));r.addColorStop(.17,alphaColor(rgb,.54));r.addColorStop(.52,alphaColor(rgb,.12));r.addColorStop(1,alphaColor(rgb,0));g.fillStyle=r;g.fillRect(0,0,96,96);glowCache.set(key,c);return c}
function glow(x,y,r,rgb,a,sx=1,sy=1){if(a<.001||r<=0)return;ctx.save();ctx.globalAlpha=clamp(a);ctx.drawImage(glowSprite(rgb),x-r*sx,y-r*sy,r*2*sx,r*2*sy);ctx.restore()}
function ellipse(cx,cy,rx,ry,rgb,a,width=1,start=0,end=Math.PI*2){if(a<.001||rx<0||ry<0)return;ctx.strokeStyle=alphaColor(rgb,a);ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,start,end);ctx.stroke()}
function diamond(x,y,s,rgb,a,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=alphaColor(rgb,a);ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.52,0);ctx.lineTo(0,s);ctx.lineTo(-s*.52,0);ctx.closePath();ctx.fill();ctx.restore()}
function spark(x,y,s,rgb,a,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.strokeStyle=alphaColor(rgb,a);ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.moveTo(0,-s);ctx.lineTo(0,s);ctx.stroke();ctx.restore()}
function leaf(x,y,s,rot,rgb,a){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=alphaColor(rgb,a*.5);ctx.strokeStyle=alphaColor(rgb,a);ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,-s);ctx.bezierCurveTo(s,-s*.5,s,s*.4,0,s);ctx.bezierCurveTo(-s,s*.4,-s,-s*.5,0,-s);ctx.fill();ctx.beginPath();ctx.moveTo(0,-s*.75);ctx.lineTo(0,s*.8);ctx.stroke();ctx.restore()}
function hexagon(x,y,r,rgb,a,angle=0){ctx.strokeStyle=alphaColor(rgb,a);ctx.lineWidth=.8;ctx.beginPath();for(let i=0;i<7;i++){const ang=angle+i*Math.PI/3;const px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.stroke()}
function borderEnergy(p,rgb,A,kind){
 const rings=kind==='shield'?3:2;
 for(let k=0;k<rings;k++){
  const phase=p*2.2+k*1.7;
  ctx.beginPath();
  for(let j=0;j<=112;j++){
   const a=j/112*Math.PI*2;
   const r=1+.028*Math.sin(a*5+phase*2)+.018*Math.sin(a*9-phase);
   const rx=w*(.515+k*.035),ry=h*(.535+k*.036);
   const x=w*.5+Math.cos(a)*rx*r,y=h*.51+Math.sin(a)*ry*r;
   j?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.strokeStyle=alphaColor(rgb,A*.035);ctx.lineWidth=14;ctx.stroke();
  ctx.strokeStyle=alphaColor(rgb,A*.14);ctx.lineWidth=1.6;ctx.stroke();
 }
}
function rays(p,rgb,A,strong=false){
 const cx=w*.49,cy=h*(strong?.18:-.09),len=Math.hypot(w,h)*1.4;
 ctx.save();ctx.globalCompositeOperation='screen';
 const grad=ctx.createRadialGradient(cx,cy,2,cx,cy,len*.64);
 grad.addColorStop(0,alphaColor(rgb,.21*A));grad.addColorStop(.36,alphaColor(rgb,.12*A));grad.addColorStop(1,alphaColor(rgb,0));
 ctx.fillStyle=grad;
 for(let i=0;i<(strong?15:11);i++){
  const angle=(i/(strong?15:11))*Math.PI*2+p*.11+Math.sin(i*4.7)*.13;
  const width=.018+.016*(.5+.5*Math.sin(i*1.9+p*1.2));
  ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(angle-width)*len,cy+Math.sin(angle-width)*len);ctx.lineTo(cx+Math.cos(angle+width)*len,cy+Math.sin(angle+width)*len);ctx.closePath();ctx.fill();
 }
 glow(cx,cy,w*(strong?.55:.44),rgb,A*.23,1,.64);ctx.restore();
}
function drawDanger(e,p,A){
 const critical=e.id==='critical';
 const pulse=critical?1:1-.16*smooth(.12,.43,p);
 // Una base carmesí oscura mantiene el aviso legible incluso sobre el cañón naranja.
 ctx.save();ctx.translate(w*.5,h*.5);ctx.scale(w*.5,h*.5);
 const shade=ctx.createRadialGradient(0,0,.45,0,0,1.35);
 shade.addColorStop(0,'rgba(94,12,16,0)');shade.addColorStop(.42,'rgba(94,12,16,0)');
 shade.addColorStop(.77,alphaColor([136,23,24],A*.13));shade.addColorStop(1,alphaColor([75,8,15],A*(critical?.33:.25)));
 ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore();
 for(let side=0;side<2;side++)glow(side?w*1.05:-w*.05,h*(.52+.08*Math.sin(p*3)),w*.28,e.rgb,A*.38*pulse,.55,1.65);
 const burst=ease(p);
 if(prefs.particles)for(let i=0;i<(critical?18:26);i++){
  const s=seeds[i],side=i%2,edge=side?w:0;
  const x=edge+(side?-1:1)*w*(.01+s.r*.18)*burst;
  const y=h*(s.y+.045*Math.sin(p*2+s.a));
  const length=(critical?16:23)*(w/960)*s.size*(1-p*.5);
  const dir=side?-1:1;
  ctx.strokeStyle=alphaColor(e.rgb,A*(critical?.3:.18)*(1-p*.5));ctx.lineWidth=1.15;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dir*length,y+(y-h*.5)*.035);ctx.stroke();
  glow(x,y,7*s.size,e.rgb,A*.4);
 }
 if(critical){
  const q=smooth(0,.65,p);
  ellipse(w*.5,h*.52,w*(.58-q*.075),h*(.67-q*.085),e.rgb,A*.14,2.5);
  for(let k=0;k<4;k++){
   const sx=k%2?w:0,sy=k>1?h:0,dx=sx?-1:1,dy=sy?-1:1;
   ctx.strokeStyle=alphaColor(e.rgb,A*.28);ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+dx*w*.045,sy+dy*h*.12);ctx.lineTo(sx+dx*w*.032,sy+dy*h*.19);ctx.lineTo(sx+dx*w*.073,sy+dy*h*.28);ctx.stroke();
  }
 }
}
function drawGold(e,p,A){
 const victory=e.id==='victory';rays(p,e.rgb,A,victory);
 const r=ease(p),ringA=A*(1-smooth(.45,.92,p));
 ellipse(w*.5,h*.52,w*(.1+r*.6),h*(.15+r*.8),e.rgb,ringA*.13,1.6);
 if(victory){
  const rot=p*.16;
  ellipse(w*.5,h*.45,w*.31,h*.42,e.rgb,A*.065,.8);
  if(prefs.particles)for(let i=0;i<20;i++){const a=i/20*Math.PI*2+rot;diamond(w*.5+Math.cos(a)*w*.31,h*.45+Math.sin(a)*h*.42,2.5,e.rgb,A*.35,a)}
 }
 if(prefs.particles)for(let i=0;i<(victory?58:32);i++){
  const s=seeds[i],q=clamp(p*1.25-s.phase*.3),life=smooth(0,.16,q)*(1-smooth(.65,1,q));
  const side=i%2, x=w*(side?.68+s.x*.29:.03+s.x*.29)+Math.sin(s.a+q*3)*w*.014;
  const y=h*(1.03-s.y*.4-q*(.22+s.speed*.17));
  const a=A*life*(.25+s.r*.4),r0=(1.6+s.r*2.2)*Math.max(.6,w/1000);
  glow(x,y,r0*5,e.rgb,a*.75);diamond(x,y,r0,e.rgb,a,s.a+q*.8);
  if(i%7===0)spark(x,y,r0*2.4,[255,241,181],a*.55,q*.25);
 }
}
function drawGrowth(e,p,A){
 borderEnergy(p,e.rgb,A,'growth');
 const spread=ease(p);
 ellipse(w*.5,h*.66,w*(.06+spread*.62),h*(.04+spread*.46),e.rgb,A*(1-smooth(.35,.92,p))*.23,1.8);
 for(let k=0;k<6;k++){
  const side=k%2,baseX=w*(side?.92-k*.008:.08+k*.008),phase=p*3.7+k*.8;
  const lift=h*(.12+.73*p);
  const x2=baseX+(side?-1:1)*w*(.02+.03*Math.sin(phase));
  ctx.beginPath();ctx.moveTo(baseX,h*1.07);ctx.bezierCurveTo(baseX+(side?-1:1)*w*.11,h*.77,x2-(side?-1:1)*w*.09,h-lift*.7,x2,h-lift);
  ctx.strokeStyle=alphaColor(e.rgb,A*.022);ctx.lineWidth=18;ctx.stroke();
  ctx.strokeStyle=alphaColor(e.rgb,A*.17);ctx.lineWidth=1.2;ctx.stroke();
  glow(x2,h-lift,w*.045,e.rgb,A*.35,1,1.6);
 }
 if(prefs.particles)for(let i=0;i<26;i++){
  const s=seeds[i],q=clamp(p*1.25-s.phase*.28),a=A*smooth(0,.13,q)*(1-smooth(.6,1,q))*.66;
  const side=i%2,x=w*(side?.74+s.x*.22:.04+s.x*.22)+Math.sin(s.a+q*4)*w*.018;
  const y=h*(1.02-s.y*.23-q*(.35+s.speed*.15));
  leaf(x,y,(3+s.size*2)*Math.max(.65,w/1000),s.a+q*2,e.rgb,a);glow(x,y,12,e.rgb,a*.23);
 }
}
function drawMultiply(e,p,A){
 borderEnergy(p,e.rgb,A*.6,'multiply');
 for(let k=0;k<2;k++){
  const q=clamp((p-k*.14)/(1-k*.14)),r=ease(q),a=A*smooth(0,.12,q)*(1-smooth(.37,.88,q));
  ellipse(w*.5,h*.5,w*(.03+r*.61),h*(.06+r*.63),e.rgb,a*.24,1.1);
 }
 for(let side=0;side<2;side++)glow(w*(side?.95:.05),h*.6,w*.3,e.rgb,A*.25,.5,1.5);
 if(prefs.particles)for(let i=0;i<24;i++){
  const s=seeds[i],q=clamp(p*1.24-s.phase*.3),x=w*(s.x<.5?.05+s.x*.48:.71+(s.x-.5)*.48),y=h*(s.y*.8+.15-q*.16);
  const a=A*smooth(0,.12,q)*(1-smooth(.7,1,q))*.65,spread=7+q*26;
  diamond(x-spread,y,2.1+s.size*1.4,e.rgb,a,s.a+q*.4);diamond(x+spread,y-q*15,1.8+s.size,e.rgb,a*.72,-s.a-q*.4);
  glow(x,y,18,e.rgb,a*.45);
 }
}
function drawShield(e,p,A){
 borderEnergy(p,e.rgb,A,'shield');
 const q=ease(p),radius=.04+q*.7;
 for(let k=0;k<2;k++)ellipse(w*.5,h*.5,w*(radius+k*.018),h*(radius+k*.035)*1.32,e.rgb,A*(1-smooth(.7,1,p))*(k?.1:.27),k?4:1.5);
 for(let side=0;side<2;side++)glow(side?w*.99:w*.01,h*.53,w*.31,e.rgb,A*.35,.35,1.7);
 if(prefs.particles)for(let i=0;i<26;i++){
  const s=seeds[i],angle=s.a+p*.08,rx=w*(.43+s.r*.17),ry=h*(.43+s.x*.17);
  const x=w*.5+Math.cos(angle)*rx,y=h*.5+Math.sin(angle)*ry,life=smooth(0,.17,p)*(1-smooth(.62,1,p));
  hexagon(x,y,(9+s.size*9)*Math.max(.5,w/1000),e.rgb,A*life*.25,Math.PI/6);glow(x,y,17,e.rgb,A*life*.15);
 }
}
function drawNight(e,p,A){
 const x=lerp(-w*.65,w*1.55,p);
 const g=ctx.createLinearGradient(x-w*.7,0,x+w*.6,h);
 g.addColorStop(0,alphaColor([35,36,96],0));g.addColorStop(.44,alphaColor([53,50,136],A*.13));g.addColorStop(.60,alphaColor([150,135,243],A*.065));g.addColorStop(1,alphaColor(e.rgb,0));
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 for(let side=0;side<2;side++)glow(w*(side?.92:.08),h*(.18+p*.13),w*.4,e.rgb,A*.23,1,.52);
 if(prefs.particles)for(let i=0;i<28;i++){
  const s=seeds[i],sx=w*(s.x<.5?s.x*.53:.735+(s.x-.5)*.53),sy=h*(.04+s.y*.39-p*.022);
  const tw=.5+.5*Math.sin(s.a+p*5),a=A*tw*(.2+s.r*.25);
  glow(sx,sy,6+s.size*3,[186,188,255],a*.75);if(i%3===0)spark(sx,sy,1.6+s.size,[206,212,255],a);
 }
}
function drawDefeat(e,p,A){
 const shade=ctx.createRadialGradient(w*.5,h*.48,h*.13,w*.5,h*.48,w*.66);
 shade.addColorStop(0,'rgba(12,10,12,0)');shade.addColorStop(.52,`rgba(25,10,15,${clamp(A*.1)})`);shade.addColorStop(1,`rgba(17,8,12,${clamp(A*.46)})`);ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 for(let k=0;k<6;k++){
  const side=k%2,x=w*(side?1.05:-.05),y=h*(.05+k*.19+p*.04);glow(x,y,w*(.20+p*.045),[48,14,25],A*.8,.8,1.4);
 }
 if(prefs.particles)for(let i=0;i<22;i++){
  const s=seeds[i],x=w*(i%2?.79+s.x*.18:.03+s.x*.18)+Math.sin(s.a+p*3)*w*.011;
  const y=h*(s.y*.7+.05+p*(.2+s.r*.12)),a=A*(1-p*.65)*(.2+s.r*.25);
  glow(x,y,7+s.size*3,[219,88,54],a*.7);diamond(x,y,1.1+s.r,e.rgb,a,s.a-p*.4);
 }
}

const colors={raid:[249,83,54],dawn:[255,200,100],critical:[244,71,52],growth:[93,232,151],multiply:[255,192,74],shield:[78,218,237],nightfall:[120,109,216],victory:[255,207,111],defeat:[180,62,48]},effects=Object.fromEntries(Object.entries(colors).map(([id,rgb])=>[id,{id,rgb}]));
return {draw(id,width,height,p,A,particles){w=width;h=height;prefs.particles=particles;const e=effects[id];
if(id==='raid'||id==='critical')drawDanger(e,p,A);else if(id==='dawn'||id==='victory')drawGold(e,p,A);else if(id==='growth')drawGrowth(e,p,A);else if(id==='multiply')drawMultiply(e,p,A);else if(id==='shield')drawShield(e,p,A);else if(id==='nightfall')drawNight(e,p,A);else if(id==='defeat')drawDefeat(e,p,A);
},dispose(){glowCache.clear();}};
}
