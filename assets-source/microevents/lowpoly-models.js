import * as T from 'three';
const materials=new Map();
function mat(color,opacity=1){const key=color+opacity;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.86,metalness:0,flatShading:true,transparent:opacity<1,opacity,depthWrite:opacity>=1}));return materials.get(key);}
function mesh(g,geometry,color,p=[0,0,0],scale=[1,1,1],opacity=1){const m=new T.Mesh(geometry,mat(color,opacity));m.position.set(...p);m.scale.set(...scale);m.castShadow=m.receiveShadow=opacity>=1;g.add(m);return m;}
const ball=(g,color,p,s=[1,1,1],detail=0,opacity=1)=>mesh(g,new T.IcosahedronGeometry(1,detail),color,p,s,opacity);
function rod(g,a,b,r,color,sides=5){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),m=mesh(g,new T.CylinderGeometry(r,r,delta.length(),sides),color,from.clone().add(to).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
function cone(g,p,r,h,color,rotation=[0,0,0]){const m=mesh(g,new T.ConeGeometry(r,h,5),color,p);m.rotation.set(...rotation);return m;}
function plate(g,points,color,depth=.08){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color);}
function leaf(g,color,p=[0,0,0],scale=1,angle=0){const vertices=[0,.7,0,-.36,.02,0,0,-.6,0,.36,.02,0,0,.02,.16],indices=[0,1,4,1,2,4,2,3,4,3,0,4,0,3,2,0,2,1],geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const m=mesh(g,geo,color,p,[scale,scale,scale]);m.rotation.z=angle;rod(g,[p[0],p[1]-.55*scale,p[2]+.1],[p[0],p[1]+.53*scale,p[2]+.1],.018*scale,'#c9bd8a');return m;}
function cloud(g,color,opacity=1){for(const [x,y,z,r] of [[-.48,-.12,0,.38],[-.14,.08,0,.5],[.31,-.05,0,.43],[.49,-.15,.05,.3],[.08,-.24,.2,.4]])ball(g,color,[x,y,z],[r,r*.85,r*.75],1,opacity);}
function bug(g,type,frame=0){const gold=type==='beetle',ant=type==='ants',termite=type==='termite',fly=type==='fly',locust=type==='locust',body=gold?'#d5ab4e':ant?'#8d6546':termite?'#b18d61':'#8ca468';
 ball(g,body,[0,-.16,0],[gold?.43:.25,gold?.5:.42,.25],1);ball(g,body,[0,.26,.05],[.23,.22,.2],1);if(ant||termite)ball(g,body,[0,.04,.02],[.17,.19,.16],0);
 for(const side of [-1,1]){for(let i=0;i<3;i++)rod(g,[side*.14,.13-i*.2,0],[side*(.43+i*.035),.25-i*.27,.08],.025,'#6b6949');rod(g,[side*.11,.42,.03],[side*.26,.61,.02],.02,'#6b6949');ball(g,'#344c3c',[side*.1,.33,.22],[.035,.045,.035],0);}
 if(gold){rod(g,[0,-.52,.23],[0,.12,.23],.015,'#a47e36');ball(g,'#f0ce74',[-.16,-.1,.19],[.13,.25,.12],0);}
 if(fly||locust||type==='firefly'){const flap=locust?[.48,.15,-.15][frame]:.35;for(const side of [-1,1]){const wing=leaf(g,'#c9dcca',[side*.3,flap,.02],.55,side*1.1);wing.material=mat('#d6e7d8',.76);}if(type==='firefly')ball(g,'#ebdf89',[0,-.4,.18],[.2,.2,.19],1);}
}
function drop(g,color){const points=[new T.Vector2(0,-.62),new T.Vector2(.34,-.46),new T.Vector2(.43,-.12),new T.Vector2(.34,.2),new T.Vector2(.14,.53),new T.Vector2(0,.82)];mesh(g,new T.LatheGeometry(points,9),color);ball(g,'#eef5e1',[-.12,.03,.33],[.065,.14,.035],0);}
function twig(g,big=false){rod(g,[-.6,-.5,0],[.45,.55,0],big?.12:.08,'#9e8058');rod(g,[-.05,.03,0],[-.35,.55,.03],big?.08:.06,'#ae8b60');rod(g,[.08,.2,0],[.6,.15,.03],big?.085:.055,'#99794e');}
function wind(g,color,heat=false){for(let j=0;j<3;j++){const points=[];for(let i=0;i<12;i++){const t=i/11;points.push(heat?new T.Vector3(j*.35-.35+Math.sin(t*8+j)*.07,t*1.3-.65,0):new T.Vector3(t*1.5-.75,j*.28-.28+Math.sin(t*5)*.1,0));}mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points),15,.025,4,false),color,[0,0,0],[1,1,1],.72);}}
function gem(g,color){const m=mesh(g,new T.OctahedronGeometry(.55),color);m.scale.set(.65,1.25,.65);m.rotation.z=.18;}
export const SPRITE_SLOTS=[['seed',0,1],['firefly',1,1],['bird',2,4],['sparkle',7,1],['butterfly',8,4],['beetle',12,1],['locust',13,3],['termite',16,1],['cloud',17,1],['raindrop',18,1],['flame',19,5],['smoke',24,1],['lightning',25,3],['stormcloud',28,1],['feather',32,1],['dew',33,1],['flower',34,1],['spirit',35,1],['goldenleaves',36,1],['star',37,1],['pollen',38,1],['rainbow',39,1],['rareseed',40,1],['weeds',41,1],['ants',42,1],['mound',43,1],['burrow',44,1],['dustdevil',45,1],['fog',46,1],['pathleaves',47,1],['spores',48,1],['debris',49,1],['web',50,1],['insects',51,1],['grain',52,1],['sack',53,1],['snake',54,1],['snakebody',55,1],['thornseeds',56,1],['hail',57,1],['gust',58,1],['branch',59,1],['fallingdebris',60,1],['heat',61,1],['rainbowAqua',62,1],['rainbowGold',63,1]];
export function createSprite(id,frame=0){const g=new T.Group();
 if(id==='firefly'){
  // A dark thorax frames the lantern; short translucent wings keep it insect-like at 20px.
  ball(g,'#405546',[0,.08,0],[.21,.4,.18],1);
  ball(g,'#778851',[0,.42,.04],[.19,.18,.17],0);
  const lantern=ball(g,'#f2f6a2',[0,-.34,.09],[.24,.29,.21],1);
  lantern.material=new T.MeshStandardMaterial({color:'#edf6a1',emissive:'#c5ed70',emissiveIntensity:.65,roughness:.8,flatShading:true});
  for(const side of [-1,1]){
   const wing=leaf(g,'#aabfa1',[side*.24,.1,-.03],.37,side*.9);wing.material=mat('#c2d4af',.58);
   rod(g,[side*.09,.45,.05],[side*.2,.65,.03],.025,'#66754c');
   for(let i=0;i<2;i++)rod(g,[side*.14,.2-i*.2,.02],[side*.3,.1-i*.23,.02],.025,'#66754c');
  }
 }
 else if(id==='termite'){
  // Pale segmented abdomen and ochre head separate from the warm wooden palisade.
  ball(g,'#e1c49a',[0,-.3,0],[.19,.34,.18],1);
  ball(g,'#69432b',[0,.08,.03],[.13,.17,.13],0);
  ball(g,'#744426',[0,.4,.04],[.24,.24,.2],1);
  for(const side of [-1,1]){
   for(let i=0;i<3;i++)rod(g,[side*.12,.18-i*.18,.02],[side*.43,.29-i*.29,.04],.045,'#423624');
   rod(g,[side*.12,.53,.02],[side*.25,.72,.02],.027,'#59462c');
   ball(g,'#3e3928',[side*.12,.45,.2],[.045,.045,.03],0);
  }
 }
 else if(['beetle','locust','ants','insects'].includes(id))bug(g,id==='insects'?'fly':id,frame);
 else if(id==='bird'){
  ball(g,'#97b3bd',[0,-.12,0],[.32,.5,.28],1);ball(g,'#e5d7ad',[0,-.22,.2],[.22,.32,.16],1);ball(g,'#6d91a4',[0,.4,.04],[.29,.27,.25],1);
  for(const side of [-1,1]){const wing=plate(g,[[side*.18,.13],[side*.85,[.65,.2,-.4,.12][frame]],[side*.65,-.23],[side*.2,-.32]],'#6e93a5');wing.position.z=-.08;ball(g,'#263d42',[side*.15,.46,.24],[.035,.04,.03]);rod(g,[side*.1,-.48,.03],[side*.13,-.62,.1],.025,'#b28b55');}cone(g,[0,.32,.39],.1,.24,'#e4b267',[Math.PI/2,0,0]);
 }
 else if(id==='butterfly'){
  const width=[.62,.35,.11,.4][frame];for(const side of [-1,1]){ball(g,side<0?'#e3ad7b':'#c59ac2',[side*width*.55,.25,0],[width*.65,.43,.1],1);ball(g,side<0?'#e1c684':'#b493b5',[side*width*.43,-.28,.02],[width*.53,.29,.12],1);rod(g,[side*.06,.5,.08],[side*.2,.72,.08],.018,'#6e6656');}ball(g,'#6d7855',[0,0,.1],[.065,.48,.07],1);
 }
 else if(['cloud','stormcloud','smoke','fog','dustdevil'].includes(id))cloud(g,{cloud:'#d4dfe0',stormcloud:'#8196ad',smoke:'#a8b1ad',fog:'#e0e8dc',dustdevil:'#d2be97'}[id],['smoke','fog','dustdevil'].includes(id)?.6:1);
 else if(id==='raindrop'||id==='dew')drop(g,id==='dew'?'#9bcac3':'#8ab8d0');
 else if(id==='flame'){
  const points=[new T.Vector2(0,-.62),new T.Vector2(.35,-.48),new T.Vector2(.47,-.15),new T.Vector2(.29,.18),new T.Vector2(.16,.43),new T.Vector2(0,.85)],geo=new T.LatheGeometry(points,7),position=geo.getAttribute('position');
  for(let i=0;i<position.count;i++){const y=position.getY(i);position.setX(i,position.getX(i)+Math.max(0,y)*Math.sin(frame*1.4)*.28);}geo.computeVertexNormals();mesh(g,geo,'#d8843e');
  const inner=new T.LatheGeometry([new T.Vector2(0,-.5),new T.Vector2(.25,-.35),new T.Vector2(.22,-.06),new T.Vector2(.1,.2),new T.Vector2(0,.53)],6);mesh(g,inner,'#f1ca73',[0,-.03,.25]);
  const side=mesh(g,geo.clone(),'#e6a34f',[-.3,-.22,.1],[.5,.65,.5]);side.rotation.z=.28;
 }
 else if(id==='lightning'){const m=plate(g,[[.15,.8],[-.4,-.05],[-.03,-.05],[-.18,-.8],[.5,.18],[.1,.18],[.38,.8]],frame===1?'#f9edbc':'#e4cb86',.12);m.rotation.z=(frame-1)*.04;}
 else if(id==='seed'||id==='rareseed'){
  ball(g,id==='seed'?'#b78b58':'#d8b766',[0,-.24,0],[.22,.44,.22],1);
  if(id==='seed'){rod(g,[0,-.1,0],[0,.6,0],.018,'#d6cba8');for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(g,[0,.35,0],[Math.cos(a)*.46,.6+Math.sin(a)*.2,Math.sin(a)*.22],.014,'#f3e6c5');}}
  else{rod(g,[0,-.1,0],[0,.55,0],.025,'#759956');leaf(g,'#91ad69',[-.23,.4,0],.48,.8);leaf(g,'#a0ba78',[.24,.48,0],.48,-.8);}
 }
 else if(id==='feather'){leaf(g,'#e0dbc4',[0,0,0],1.1,-.3);for(let i=0;i<6;i++)for(const side of [-1,1])rod(g,[0,-.4+i*.17,.12],[side*(.22-Math.abs(i-2.5)*.025),-.5+i*.17,.02],.012,'#b8b7a2');}
 else if(id==='flower'){rod(g,[0,-.8,0],[0,.25,0],.035,'#749959');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(g,'#ce9dbd',[Math.sin(a)*.3,.28+Math.cos(a)*.3,.04],[.21,.24,.1],1);}ball(g,'#e7c97b',[0,.28,.15],[.18,.18,.1],1);leaf(g,'#8ca666',[-.2,-.45,0],.4,.9);}
 else if(id==='spirit'){drop(g,'#b4d7df');for(const x of [-.13,.13])ball(g,'#4c6f81',[x,.02,.37],[.04,.06,.025]);}
 else if(['goldenleaves','pathleaves'].includes(id))leaf(g,id==='goldenleaves'?'#d5b56b':'#ab946b',[0,0,0],1,.25);
 else if(id==='sparkle'||id==='star'){const points=[],n=id==='star'?5:4;for(let i=0;i<n*2;i++){const a=i*Math.PI/n+Math.PI/2,r=i%2?.25:.7;points.push([Math.cos(a)*r,Math.sin(a)*r]);}plate(g,points,'#f1d99d',.12);}
 else if(['rainbow','rainbowAqua','rainbowGold'].includes(id))gem(g,{rainbow:'#ba9ec7',rainbowAqua:'#8fbdc8',rainbowGold:'#dcc583'}[id]);
 else if(id==='pollen'||id==='grain'){for(const [x,y,a] of [[-.3,.25,.4],[.25,.03,-.25],[-.05,-.35,1]]){const m=ball(g,id==='pollen'?'#dbbf75':'#d1b16a',[x,y,0],[.13,.27,.14],0);m.rotation.z=a;}}
 else if(id==='weeds'){for(const [x,a] of [[-.28,.45],[0,-.08],[.28,-.4]])leaf(g,'#849c5d',[x,0,0],.8,a);for(const x of [-.12,.1,.23])rod(g,[x,-.4,.02],[x*.8,-.7,.08],.028,'#ad9269');}
 else if(id==='mound'){ball(g,'#a88b65',[0,-.16,0],[.8,.48,.55],1);ball(g,'#655a43',[0,-.13,.45],[.37,.27,.05],1);}
 else if(id==='burrow'){ball(g,'#a98c6b',[0,-.05,0],[.48,.53,.36],1);ball(g,'#d3bb97',[0,-.18,.3],[.28,.22,.15],1);for(const x of [-.22,.22])ball(g,'#33483f',[x,.13,.32],[.05,.06,.04]);ball(g,'#947367',[0,-.06,.44],[.08,.05,.04]);for(const x of [-.43,.43])ball(g,'#c0a784',[x,-.4,.24],[.17,.11,.14],0);}
 else if(id==='spores'){for(const side of [-1,1]){leaf(g,'#c5bbaf',[side*.28,.2,0],.5,side*.9);rod(g,[side*.08,.12,0],[side*.18,-.45,0],.02,'#b7a78e');ball(g,'#d7caad',[side*.18,-.48,0],[.09,.14,.09]);}}
 else if(id==='debris'||id==='branch')twig(g,id==='branch');
 else if(id==='web'){for(let j=0;j<8;j++){const a=j*Math.PI/4;rod(g,[0,0,0],[Math.cos(a)*.75,Math.sin(a)*.75,0],.012,'#e0ddc6',4);}for(const r of [.3,.62])for(let j=0;j<8;j++){const a=j*Math.PI/4,b=(j+1)*Math.PI/4;rod(g,[Math.cos(a)*r,Math.sin(a)*r,0],[Math.cos(b)*r,Math.sin(b)*r,0],.012,'#e0ddc6',4);}}
 else if(id==='sack'){const points=[new T.Vector2(0,-.6),new T.Vector2(.38,-.53),new T.Vector2(.49,-.12),new T.Vector2(.22,.34),new T.Vector2(.26,.58)];mesh(g,new T.LatheGeometry(points,8),'#b99e70');mesh(g,new T.TorusGeometry(.22,.035,4,8),'#887c55',[0,.32,0]).rotation.x=Math.PI/2;}
 else if(id==='snake'||id==='snakebody'){ball(g,id==='snake'?'#9cae72':'#90a46b',[0,0,0],[.35,.56,.27],1);ball(g,'#bac38b',[0,-.2,.2],[.24,.25,.1],0);if(id==='snake'){for(const x of [-.16,.16])ball(g,'#334f3a',[x,.22,.24],[.055,.07,.04]);rod(g,[0,.5,.14],[0,.76,.12],.014,'#bd8174');}}
 else if(id==='thornseeds'){ball(g,'#b8a574',[0,0,0],[.45,.48,.43],0);for(let i=0;i<9;i++){const a=i*Math.PI*2/9,m=cone(g,[Math.cos(a)*.48,Math.sin(a)*.48,0],.1,.35,'#a59865');m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(Math.cos(a),Math.sin(a),0));}}
 else if(id==='fallingdebris'){
  // Uneven chipped planes, without fine details that disappear in the runtime sprite.
  const geo=new T.IcosahedronGeometry(1,0),positions=geo.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),scale=1+.16*Math.sin(x*7+y*4+z*5);
   positions.setXYZ(i,x*.59*scale+y*.12,y*.66*scale,z*.43*scale);
  }
  geo.computeVertexNormals();const m=mesh(g,geo,'#ac9473');m.rotation.set(.25,.1,.3);
  ball(g,'#d1b994',[-.28,.22,.28],[.24,.17,.16],0);
 }
 else if(id==='hail'){const m=ball(g,'#c4d8dd',[0,0,0],[.57,.63,.5],0);m.rotation.set(.25,.1,.3);}
 else if(id==='gust'||id==='heat')wind(g,id==='heat'?'#e0c69a':'#e0ddc8',id==='heat');
 return g;
}
