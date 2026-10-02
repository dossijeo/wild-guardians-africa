const CROP_TYPES=[
 {name:'Maíz',glyph:'corn',cost:25,value:80,color:'#f7c643',duration:48},
 {name:'Sorgo',glyph:'sorghum',cost:20,value:65,color:'#b76039',duration:44},
 {name:'Mijo',glyph:'millet',cost:15,value:50,color:'#e7bb66',duration:40},
 {name:'Arroz',glyph:'rice',cost:30,value:95,color:'#c3d970',duration:58},
 {name:'Yuca',glyph:'cassava',cost:35,value:110,color:'#a67544',duration:64},
 {name:'Batata',glyph:'yam',cost:25,value:85,color:'#bd725f',duration:52},
 {name:'Calabaza',glyph:'pumpkin',cost:40,value:130,color:'#f39233',duration:68},
 {name:'Judías',glyph:'beans',cost:20,value:70,color:'#72b665',duration:46}
];
function riverX(z){return -18+Math.sin(z*.04)*3+z*.06}
function groundHeight(x,z){let d=Math.abs(x-riverX(z)),far=clamp((Math.hypot(x*.85,z)-17)/23,0,1);let h=far*(.8+Math.sin(x*.085+z*.05)*.65+Math.cos(z*.1)*.45);if(d<3.3)return -.8;if(d<5.4)return mix(-.8,h,(d-3.3)/2.1);return h}
const earth=rgb('#b78b52'),wood=rgb('#865037'),roof=rgb('#dca74c'),foliage=rgb('#718d35');
function treeGeo(g,x,z,s=1,baobab=false){let y=groundHeight(x,z);const seed=rng(Math.floor((x+200)*83+(z+200)*7));let h=(2.8+seed()*1.4)*s;
 if(baobab){h=6.2*s;g.cylinder(x,y,z,1.05*s,.64*s,h,rgb('#a7714f'),9);g.ellipsoid(x,y+h*.43,z,1.13*s,h*.5,.9*s,rgb('#b17e59'),9,5);}
 else{g.branch([x,y,z],[x+.28*s,y+h*.57,z],.25*s,.17*s,wood);g.branch([x+.28*s,y+h*.57,z],[x-.1*s,y+h,z+.1*s],.17*s,.1*s,wood)}
 const n=baobab?5:6;for(let i=0;i<n;i++){let a=i/n*TAU+seed()*.3,r=(baobab?1.6:1.6+seed()*.35)*s;let p=[x+Math.cos(a)*r,y+h+(.3+seed()*.3)*s,z+Math.sin(a)*r];g.branch([x,y+h*.65,z],p,.10*s,.045*s,wood);g.ellipsoid(p[0],p[1]+.22*s,p[2],(1.3+seed()*.25)*s,.50*s,(1.1+seed()*.3)*s,tint(foliage,.9+seed()*.3),9,4)}
 g.ellipsoid(x,y+h+.6*s,z,1.6*s,.57*s,1.4*s,tint(foliage,1.12),10,4);
}
function hutGeo(scale=1,style=0){const g=new Geo(),r=1.05*scale,h=1.6*scale,base=style%2?rgb('#c48f5b'):rgb('#dca675');g.cylinder(0,0,0,r,r*.94,h,base,14);g.cylinder(0,.04,0,r*1.09,r*1.05,.17*scale,rgb('#b58052'),14);
 for(let i=0;i<3;i++){let y=h-.10*scale+i*.35*scale;let rr=r*1.4-i*.3*scale;g.cylinder(0,y,0,rr,rr-.51*scale,.55*scale,tint(roof,1+i*.035),15)}
 g.cylinder(0,h+1.1*scale,0,.13*scale,.08*scale,.15*scale,rgb('#af7938'),10);
 // A recessed arched doorway and terracotta rim face the camera.
 g.box(0,.13*scale,r*.98,.48*scale,.68*scale,.055*scale,rgb('#4b342b'));g.ellipsoid(0,.78*scale,r*.996,.24*scale,.25*scale,.045*scale,rgb('#4b342b'),10,5);
 g.box(-.55*scale,.67*scale,r*.85,.21*scale,.24*scale,.06*scale,rgb('#705036'),0);g.box(.59*scale,.68*scale,r*.83,.20*scale,.25*scale,.06*scale,rgb('#705036'));
 for(let i=0;i<4;i++)g.box(0,.04+i*.05,1.23*scale+i*.15,.9*scale-i*.10,.08,.32*scale,rgb('#b6a180'));
 return g}
function wallGeo(){const g=new Geo();g.box(0,0,0,2.1,.95,.52,rgb('#b48b60'));for(let i=0;i<5;i++){let x=-.85+i*.425;g.cylinder(x,.70,0,.125,.095,.69+(i%2)*.09,wood,6);g.cylinder(x,1.29+(i%2)*.09,0,.11,0,.22,rgb('#b68950'),6)}g.box(0,.83,.3,2.2,.17,.14,rgb('#a56a37'));return g}
function rubbleGeo(seed=5){let g=new Geo(),r=rng(seed);for(let i=0;i<13;i++){let x=(r()-.5)*2.2,z=(r()-.5)*1.5;g.ellipsoid(x,.15+r()*.24,z,.2+r()*.25,.13+r()*.24,.17+r()*.2,tint(rgb('#b99166'),.8+r()*.3),6,3)}g.box(.4,.1,.15,.12,.7,.13,wood,.7);return g}
function plantGeo(type){const g=new Geo(),r=rng(type*311+6),t=CROP_TYPES[type],green=rgb('#618744'),gold=rgb(t.color);for(let row=0;row<4;row++)for(let col=0;col<4;col++){let x=-.95+row*.60+(r()-.5)*.08,z=-.96+col*.6+(r()-.5)*.08,h=.58+r()*.25;
 if(type<4){g.cylinder(x,.04,z,.023,.013,h,green,4);for(let k=0;k<2;k++)g.leaf([x,h*.30+k*.1,z],[x+(k?-.32:.30),h*.58+k*.13,z+.16],.09,green);g.ellipsoid(x,h,z,type===0?.10:.055,type===0?.19:.16,.07,gold,6,4);if(type===3)g.leaf([x,h,z],[x+.19,h-.05,z+.08],.04,gold)}
 else if(type===6){g.ellipsoid(x,.23,z,.23,.2,.23,gold,8,4);g.cylinder(x,.39,z,.035,.027,.12,green,4);g.leaf([x,.07,z],[x+.34,.1,z+.21],.16,green)}
 else{for(let k=0;k<4;k++){let a=k/4*TAU;g.leaf([x,.06,z],[x+Math.cos(a)*.27,.38+Math.sin(a)*.1,z+Math.sin(a)*.27],.10,green)}if(type!==7)g.ellipsoid(x,.09,z,.14,.13,.19,gold,7,4);else{g.cylinder(x,.1,z,.035,.015,.58,green,5);g.ellipsoid(x+.06,.43,z,.048,.17,.052,gold,6,4)}}}
 return g}
function workerGeo(i){const g=new Geo(),skin=rgb('#79503c'),clothes=[rgb('#dd8754'),rgb('#51a39b'),rgb('#dfbd5e'),rgb('#877494')][i];g.cylinder(0,.30,0,.14,.13,.34,clothes,7);g.ellipsoid(0,.91,0,.22,.24,.21,skin,9,5);g.ellipsoid(0,1.07,-.01,.215,.095,.205,rgb('#3b3030'),8,4);g.branch([-.13,.6,0],[-.22,.38,.09],.05,.045,skin,5);g.branch([.13,.6,0],[.22,.39,.11],.05,.045,skin,5);g.branch([-.065,.34,0],[-.085,.04,.03],.07,.045,skin,5);g.branch([.065,.34,0],[.085,.04,-.03],.07,.045,skin,5);return g}
function beastGeo(){const g=new Geo(),c=rgb('#956951');g.ellipsoid(0,.66,0,.43,.42,.67,c,9,5);g.ellipsoid(0,.50,.70,.3,.32,.4,tint(c,.94),8,5);g.ellipsoid(0,.43,1.02,.22,.13,.10,rgb('#6e4d44'),7,3);for(let x of[-.28,.28])for(let z of[-.38,.40])g.cylinder(x,.04,z,.075,.09,.4,tint(c,.8),6);for(let x of[-.25,.25]){g.branch([x,.38,.83],[x*1.25,.69,1.01],.065,.012,rgb('#f0ddb5'),6);g.ellipsoid(x,.66,.79,.033,.035,.036,rgb('#1c2725'),5,3)}g.branch([0,.82,-.62],[0,1.04,-.81],.04,.01,c);g.box(0,1.02,-.15,.10,.18,.8,tint(c,.6));return g}
/* Recruitment tuning. Only the base wage, start time and baseline shift are
   demo values; all age/sex multipliers follow the requested game rules. */
const HIRING_RULES=Object.freeze({baseWage:100,youngCost:1.20,youngSpeed:1.50,maleYield:1.20,femaleHours:1.20,dawnMinute:7*60+5,maleShiftMinutes:10*60,maxPerType:99});
const NPC_TYPES=Object.freeze([
 {key:'young_man',name:'Hombre joven',young:true,male:true},
 {key:'young_woman',name:'Mujer joven',young:true,male:false},
 {key:'older_man',name:'Hombre mayor',young:false,male:true},
 {key:'older_woman',name:'Mujer mayor',young:false,male:false}
].map((p,i)=>Object.freeze({...p,index:i,wage:Math.round(HIRING_RULES.baseWage*(p.young?HIRING_RULES.youngCost:1)),speed:p.young?HIRING_RULES.youngSpeed:1,yield:p.male?HIRING_RULES.maleYield:1,shiftMinutes:HIRING_RULES.maleShiftMinutes*(p.male?1:HIRING_RULES.femaleHours),start:HIRING_RULES.dawnMinute,end:HIRING_RULES.dawnMinute+HIRING_RULES.maleShiftMinutes*(p.male?1:HIRING_RULES.femaleHours)})));

class DemoWorld{
 constructor(renderer){this.r=renderer;this.items=[];this.plots=[];this.towns=[];this.walls=[];this.extra=[];this.workers=[];this.particles=[];this.rings=[];this.uid=0;this.time=0;this.onReady=null;this.lastReady=0;this.buildNature();this.addTown(3,-6,'Sabana',1.18,true);this.addTown(-35,-25,'Ribera',.95,true);this.addTown(32,-28,'Baobabs',.95,true);
 for(let [x,z] of[[-3.5,-6.5],[9,-6]])this.addBuilding(x,z,.8);
 for(let x=-7;x<13;x+=2.2){this.addWall(x,-10,0);if(x<-1||x>4)this.addWall(x,9.2,0)}for(let z=-8;z<9;z+=2.2){this.addWall(-8.3,z,Math.PI/2);this.addWall(13,z,Math.PI/2)}
 for(let i=0;i<8;i++)this.addCrop(-4+(i%4)*3.5,1+Math.floor(i/4)*3.8,i,.18+rand()*.5);this.plots[0].progress=.88;
 for(let i=0;i<4;i++)this.workers.push({mesh:new GLMesh(renderer,workerGeo(i)),phase:i*1.5,x:i*2,z:-1});
 this.beast=new GLMesh(renderer,beastGeo());this.beast.visible=false;this.attack=null;this.dot=new GLMesh(renderer,new Geo().ellipsoid(0,0,0,1,1,1,[1,1,1],6,3),{unlit:1,blend:true});this.ringMesh=new GLMesh(renderer,new Geo().ring(0,0,0,1,.036,[1,1,1],48),{unlit:1,blend:true});this.dome=new GLMesh(renderer,new Geo().ellipsoid(0,0,0,1,1,1,rgb('#67daef'),24,12,Math.PI/2),{alpha:.17,blend:true,unlit:.7});this.shields=[];
 }
 buildNature(){const ground=new Geo(),nature=new Geo(),shadows=new Geo(),water=new Geo();const rr=rng(9091),S=110,N=86,step=S*2/N;for(let i=0;i<N;i++)for(let j=0;j<N;j++){let x=-S+i*step,z=-S+j*step,p=(xx,zz)=>[xx,groundHeight(xx,zz),zz],a=p(x,z),b=p(x+step,z),c=p(x+step,z+step),d=p(x,z+step);let patch=(Math.sin(x*.25+Math.cos(z*.15)*2)+Math.sin(z*.18))*.5;let col=rgb('#d9c080'),green=rgb('#b5b671'),t=clamp(patch*.34+.25,0,.48);col=col.map((v,k)=>mix(v,green[k],t));col=tint(col,.97+rr()*.045);ground.quad(a,d,c,b,col)}
 for(let z=-110;z<110;z+=2){let x=riverX(z),xx=riverX(z+2);water.quad([x-3.5,-.27,z],[x-3.5,-.27,z+2],[xx+3.5,-.27,z+2],[x+3.5,-.27,z],rgb('#429faa'),[0,1,0])}
 // Worn paths and soft contact shadows are part of the simulated environment.
 for(let i=0;i<15;i++)shadows.disc(2.2,groundHeight(2.2,-10+i*1.7)+.012,-10+i*1.7,1.8,1.8,[.55,.37,.18,.065],20,true);
 function blocked(x,z){return (x>-11&&x<16&&z>-14&&z<14)||Math.hypot(x+35,z+25)<5||Math.hypot(x-32,z+28)<5||Math.abs(x-riverX(z))<6}
 const trees=[[17,7,1.05],[-12,-11,.9],[14,-16,1.3],[-10,14,.86],[18,18,1.0]];for(let i=0;i<90;i++){let x=(rr()-.5)*140,z=(rr()-.5)*140;if(!blocked(x,z))trees.push([x,z,.65+rr()*.55])}for(let [x,z,s]of trees){treeGeo(nature,x,z,s);shadows.disc(x+1*s,groundHeight(x,z)+.025,z+.5*s,3.2*s,2.0*s,[.24,.31,.17,.32],28,true)}for(let[x,z]of[[25,-36],[42,-28],[-43,-10],[23,30]]){treeGeo(nature,x,z,1,true);shadows.disc(x+.8,groundHeight(x,z)+.02,z+.5,3,2,[.24,.31,.17,.25],24,true)}
 for(let i=0;i<170;i++){let x=(rr()-.5)*136,z=(rr()-.5)*136;if(blocked(x,z))continue;let y=groundHeight(x,z),s=.25+rr()*.65,col=rgb(i%4?'#9d9785':'#b27252');nature.ellipsoid(x,y+s*.29,z,s*.85,s*.52,s*.72,col,7,4);if(i%4===0)nature.box(x,y+.3*s,z,s*1.25,.6*s,s*.9,col,.3);shadows.disc(x,y+.013,z,s*1.2,s*.95,[.25,.27,.15,.20],16,true)}
 for(let i=0;i<550;i++){let x=(rr()-.5)*140,z=(rr()-.5)*140;if((x>-9&&x<14&&z>-11&&z<11)||Math.abs(x-riverX(z))<4.6)continue;let y=groundHeight(x,z),col=rgb(i%3?'#bbb568':'#a7af65');for(let k=0;k<4;k++){let xx=x+(rr()-.5)*.6,zz=z+(rr()-.5)*.6,h=.18+rr()*.34;nature.leaf([xx,y,zz],[xx+.12,y+h,zz+.09],.05,col)}}
 for(let i=0;i<100;i++){let z=(rr()-.5)*140,x=riverX(z)+(rr()>.5?1:-1)*(5.1+rr()*.6),y=groundHeight(x,z);for(let k=0;k<4;k++)nature.cylinder(x+rr()*.3,y,z+rr()*.2,.026,.008,.7+rr()*.3,rgb('#bda869'),4)}
 this.ground=new GLMesh(this.r,ground);this.water=new GLMesh(this.r,water,{water:1});this.nature=new GLMesh(this.r,nature);this.shadows=new GLMesh(this.r,shadows,{blend:true,unlit:.4});this.vertexCount=ground.v.length/10+nature.v.length/10;
 }
 makeItem(kind,x,z,geo,name,radius=1){let obj={id:++this.uid,kind,x,z,name,radius,hp:1,destroyed:false,mesh:new GLMesh(this.r,geo).at(x,groundHeight(x,z),z),rubble:null,flashUntil:0,buildUntil:0,yaw:0};this.items.push(obj);return obj}
 addTown(x,z,name,scale=1,initial=false){let o=this.makeItem('town',x,z,hutGeo(scale),name,1.7*scale);o.scale=scale;this.towns.push(o);return o}
 addBuilding(x,z,s=1){return this.makeItem('building',x,z,hutGeo(s,1),'Vivienda',1.4*s)}
 addWall(x,z,yaw=0){let o=this.makeItem('wall',x,z,wallGeo(),'Muralla',1.2);o.yaw=yaw;o.mesh.at(x,groundHeight(x,z),z,yaw);this.walls.push(o);return o}
 addCrop(x,z,type,progress=0){let g=new Geo();g.box(0,.02,0,2.95,.07,3.08,rgb('#86623d'));for(let k=0;k<4;k++)g.box(-.95+k*.6,.09,0,.14,.07,2.75,rgb('#a57a47'));let o=this.makeItem('crop',x,z,g,CROP_TYPES[type].name,1.9);o.type=type;o.progress=progress;o.ready=progress>=1;o.plants=new GLMesh(this.r,plantGeo(type));o.multiplier=1;o.notified=o.ready;this.plots.push(o);return o}
 damage(o,amount=.35){if(!o||o.kind==='crop')return;o.hp=Math.max(0,o.hp-amount);o.flashUntil=this.time+3;if(o.hp<=0){o.destroyed=true;o.mesh.visible=false;if(!o.rubble)o.rubble=new GLMesh(this.r,rubbleGeo(o.id)).at(o.x,groundHeight(o.x,o.z),o.z);o.rubble.visible=true}this.burst(o.x,.9,o.z,'#fbb24e',14)}
 repair(o){if(!o)return;o.hp=1;o.destroyed=false;o.mesh.visible=true;if(o.rubble)o.rubble.visible=false;this.mark(o.x,o.z,'#a8db67',2.5);this.burst(o.x,1.2,o.z,'#b7df78',14)}
 mature(o){if(!o||o.kind!=='crop')return;o.progress=1;o.ready=true;o.notified=true;this.mark(o.x,o.z,'#ffe077',2)}
 harvest(o){if(!o||!o.ready)return 0;const value=this.harvestValue(o);o.yieldFactor=1;o.workDone=0;o.maleWork=0;o.progress=.05;o.ready=false;o.notified=false;o.multiplier=1;this.burst(o.x,.9,o.z,'#ffcf59',18);return value}
 mark(x,z,color='#ffd06e',life=3,radius=1.7){this.rings.push({x,z,color:rgb(color),life,max:life,radius})}
 burst(x,y,z,color,count=12){for(let i=0;i<count;i++){let a=rand()*TAU,v=.6+rand();this.particles.push({x,y,z,vx:Math.cos(a)*v,vy:1+rand()*1.6,vz:Math.sin(a)*v,life:.7+rand()*.9,max:1.6,col:rgb(color),s:.03+rand()*.055})}this.particles=this.particles.slice(-110)}
 spawnAttack(target){target=target||this.walls[this.walls.length-5];if(target.destroyed)this.repair(target);this.attack={target,start:this.time,x:target.x+7,z:target.z+7,hit:false};this.beast.visible=true;return target}
 cast(type,x,z){this.mark(x,z,type===0?'#64daff':type===1?'#b7ec78':'#d49aff',4,4);this.burst(x,.9,z,type===0?'#72e8ef':type===1?'#b8f677':'#deb0ff',30);if(type===0){this.shields.push({x,z,life:12});if(this.attack&&Math.hypot(this.attack.target.x-x,this.attack.target.z-z)<7)this.attack.start=this.time-9;return 'Zona protegida'}
 let nearby=this.plots.filter(p=>Math.hypot(p.x-x,p.z-z)<6);if(!nearby.length){const p=this.nearestCrop(x,z);if(p)nearby=[p]}for(let p of nearby){if(type===1)this.mature(p);else{p.multiplier=2;p.multiplyUntil=this.time+35}}return nearby.length}
 nearestCrop(x,z){return [...this.plots].sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0]}
 pick(x,z){let best=null,d=Infinity;for(let o of this.items){let dd=Math.hypot(o.x-x,o.z-z);if(dd<o.radius&&dd<d){d=dd;best=o}}return best}
 /* A worker contributes to one unfinished plot at a time. Multiple workers
    share work; male yield is weighted by work done, not stacked per man. */
 setCrew(counts){
  for(const w of this.workers)w.mesh.dispose();
  this.workers=[];this.recruitmentEnabled=true;this.laborRates=new Map();
  const home=this.towns.find(t=>!t.destroyed)||this.towns[0];
  counts.forEach((count,i)=>{const profile=NPC_TYPES[i];for(let j=0;j<count;j++){
   const serial=this.workers.length,angle=serial*2.399963;
   this.workers.push({profile,mesh:new GLMesh(this.r,workerGeo(i)),phase:serial*1.5,
    x:home.x+Math.cos(angle)*(.7+serial%4*.24),z:home.z+Math.sin(angle)*(.7+serial%4*.24),
    home,job:null,active:false,walk:serial,serial});
  }});
  this.prepareLabor();this.updateHiredWorkers(0);
 }
 prepareLabor(){
  this.laborRates=new Map();
  const open=this.plots.filter(p=>!p.ready&&p.progress<1),assigned=new Map(open.map(p=>[p.id,0]));
  for(const w of this.workers){
   w.active=this.workMinute>=w.profile.start&&this.workMinute<w.profile.end;
   if(!w.active){w.job=null;continue}
   if(w.job&&!open.includes(w.job))w.job=null;
   if(w.job)assigned.set(w.job.id,(assigned.get(w.job.id)||0)+1);
  }
  for(const w of this.workers){
   if(!w.active)continue;
   if(!w.job&&open.length){w.job=open.reduce((a,b)=>assigned.get(a.id)<=assigned.get(b.id)?a:b);assigned.set(w.job.id,assigned.get(w.job.id)+1)}
   if(!w.job)continue;
   const entry=this.laborRates.get(w.job.id)||{rate:0,maleRate:0};
   entry.rate+=w.profile.speed;if(w.profile.male)entry.maleRate+=w.profile.speed;
   this.laborRates.set(w.job.id,entry);
  }
 }
 updateHiredWorkers(dt){
  for(const w of this.workers){
   let tx,tz;
   if(w.active&&w.job){tx=w.job.x+Math.cos(w.phase)*.55;tz=w.job.z+.75+Math.sin(w.phase)*.15}
   else{tx=w.home.x+Math.cos(w.phase)*1.1;tz=w.home.z+Math.sin(w.phase)*1.1}
   const dx=tx-w.x,dz=tz-w.z,distance=Math.hypot(dx,dz),step=Math.min(distance,dt*1.45*w.profile.speed);
   if(distance>.01){w.x+=dx/distance*step;w.z+=dz/distance*step}
   w.walk+=dt*w.profile.speed;
   w.mesh.visible=w.active||distance>.20;
   const bounce=(distance>.1?.045:w.job?.02:0)*Math.abs(Math.sin(w.walk*6));
   w.mesh.at(w.x,groundHeight(w.x,w.z)+.025+bounce,w.z,distance>.1?Math.atan2(dx,dz):w.phase,.86);
  }
 }
 harvestValue(o){return Math.round(CROP_TYPES[o.type].value*o.multiplier*(o.yieldFactor||1))}

 update(dt){this.time+=dt;if(this.recruitmentEnabled)this.prepareLabor();for(let o of this.plots){if(!o.ready){if(this.recruitmentEnabled){const labor=this.laborRates.get(o.id)||{rate:0,maleRate:0};const work=Math.min(1-o.progress,dt*labor.rate/CROP_TYPES[o.type].duration);o.workDone=(o.workDone||0)+work;o.maleWork=(o.maleWork||0)+(labor.rate?work*labor.maleRate/labor.rate:0);o.yieldFactor=o.workDone?1+(HIRING_RULES.maleYield-1)*o.maleWork/o.workDone:1;o.progress=Math.min(1,o.progress+work);o.working=labor.rate>0}else{o.progress=Math.min(1,o.progress+dt/CROP_TYPES[o.type].duration)}if(o.progress>=1){o.ready=true;if(this.time-this.lastReady>7){this.lastReady=this.time;o.notified=true;this.onReady?.(o)}}}let h=.25+o.progress*.75;o.plants.at(o.x,groundHeight(o.x,o.z)+.10,o.z,0,1,h,1);o.plants.tint=o.multiplier===2?[1.04,.9,1.08]:[1,1,1];if(o.multiplyUntil&&o.multiplyUntil<this.time)o.multiplier=1}
 for(let o of this.items){if(o.kind==='crop')continue;let sc=o.buildUntil>this.time?clamp(1-(o.buildUntil-this.time)/2,.05,1):1;let shake=o.flashUntil>this.time?Math.sin(this.time*45)*.035:0;o.mesh.at(o.x+shake,groundHeight(o.x,o.z),o.z,o.yaw,1,sc,1);o.mesh.tint=o.flashUntil>this.time?[1.05,.85,.73]:[1,1,1]}
 if(this.recruitmentEnabled)this.updateHiredWorkers(dt);else for(let i=0;i<this.workers.length;i++){let w=this.workers[i],a=this.time*.18+w.phase,wz=-2+Math.sin(a)*3.1,wx=-2+i*2.6+Math.sin(a*.7)*.5;w.mesh.at(wx,.025+Math.abs(Math.sin(this.time*5+i))*.055,wz,Math.cos(a)>0?0:Math.PI,.86)}
 if(this.attack){let a=this.attack,t=this.time-a.start;let f=t<4?clamp(t/4,0,1):t<9?1:clamp(1-(t-9)/3,0,1);let x=mix(a.x,a.target.x+1,f),z=mix(a.z,a.target.z+1,f),yaw=Math.atan2(a.target.x-a.x,a.target.z-a.z)+(t>9?Math.PI:0);this.beast.at(x,groundHeight(x,z)+Math.abs(Math.sin(t*9))*.04,z,yaw,.9);if(t>4&&!a.hit){a.hit=true;const protectedBy=this.shields.some(s=>Math.hypot(s.x-a.target.x,s.z-a.target.z)<5);if(!protectedBy)this.damage(a.target,.3);this.burst(x,.7,z,protectedBy?'#69dfff':'#ffb150',15)}if(t>12){this.attack=null;this.beast.visible=false}}
 this.shields=this.shields.filter(o=>(o.life-=dt)>0);this.rings=this.rings.filter(o=>(o.life-=dt)>0);this.particles=this.particles.filter(p=>{p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=1.8*dt;return p.life>0});
 }
 draw(time,night,selection,placement){let r=this.r;r.begin(time,night);r.draw(this.ground);r.draw(this.water);r.draw(this.shadows);r.draw(this.nature);for(let o of this.items){r.draw(o.mesh);if(o.rubble)r.draw(o.rubble);if(o.plants)r.draw(o.plants)}for(let w of this.workers)r.draw(w.mesh);r.draw(this.beast);
 const ring=(x,z,size,col,a)=>{this.ringMesh.at(x,groundHeight(x,z)+.15,z,0,size);this.ringMesh.tint=col;this.ringMesh.alpha=a;r.draw(this.ringMesh)};
 if(selection)ring(selection.x,selection.z,selection.radius*1.10,rgb('#fff1ad'),.9);if(placement?.point)ring(placement.point[0],placement.point[2],placement.kind==='spell'?4:1.7,placement.valid?rgb('#c9f295'):rgb('#f59b71'),.95);
 for(let o of this.rings)ring(o.x,o.z,o.radius*(1+.22*(1-o.life/o.max)),o.color,Math.min(1,o.life));for(let p of this.plots){if(p.ready){let pp=r.project([p.x,.9,p.z]);if(pp&&pp.x>0&&pp.x<r.width&&pp.y>0&&pp.y<r.height){this.dot.at(p.x,1+Math.sin(time*2+p.id)*.10,p.z,0,.052);this.dot.tint=rgb('#ffdf76');this.dot.alpha=.8;r.draw(this.dot)}}}
 for(let p of this.particles){this.dot.at(p.x,p.y,p.z,0,p.s);this.dot.tint=p.col;this.dot.alpha=clamp(p.life,0,1);r.draw(this.dot)}
 for(let s of this.shields){let scale=4*(Math.min(1,(12-s.life)*2));this.dome.at(s.x,groundHeight(s.x,s.z),s.z,0,scale,scale*.73,scale);this.dome.alpha=.11+Math.sin(time*3)*.025;r.draw(this.dome);ring(s.x,s.z,4,rgb('#74deff'),Math.min(1,s.life))}
 }
}
