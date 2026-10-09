function repairGeometry(source,plan){
 const V=Array.from(source.attributes.position.array),N=Array.from(source.attributes.normal.array),U=Array.from(source.attributes.uv.array),F=Array.from(source.index.array);
 if(V.length/3!==plan.originalVertices||F.length/3!==plan.originalFaces)throw new Error('Los datos de reparación no corresponden a esta geometría');
 const faceSource=Array.from({length:F.length/3},(_,i)=>i),reverse=new Map(),backVerts=new Map();
 const pkey=i=>Math.round(V[i*3]*1e6)+','+Math.round(V[i*3+1]*1e6)+','+Math.round(V[i*3+2]*1e6);
 const edgeKey=(a,b)=>{const ka=pkey(a),kb=pkey(b);return ka<kb?ka+'|'+kb:kb+'|'+ka;};
 const addVertex=(p,n,u)=>{const i=V.length/3;V.push(...p);N.push(...n);U.push(...u);return i;};
 for(let c=0;c<plan.caps.length;c++){
  const cap=plan.caps[c],tri=[];for(let j=0;j<3;j++){const vi=cap.v[j];tri.push(addVertex(V.slice(vi*3,vi*3+3),cap.n,cap.uv.slice(j*2,j*2+2)));}
  F.push(...tri);faceSource.push(-c-1);
 }
 const reverseVertex=i=>{if(reverse.has(i))return reverse.get(i);const j=addVertex(V.slice(i*3,i*3+3),N.slice(i*3,i*3+3).map(x=>-x),U.slice(i*2,i*2+2));reverse.set(i,j);return j;};
 for(const fi of plan.flip){const a=F[fi*3],b=F[fi*3+1],c=F[fi*3+2];F.splice(fi*3,3,reverseVertex(a),reverseVertex(c),reverseVertex(b));}
 const edges=new Map(),offsets=new Map();
 for(let fi=0;fi<F.length/3;fi++)for(let j=0;j<3;j++){const a=F[fi*3+j],b=F[fi*3+(j+1)%3],key=edgeKey(a,b);const e=edges.get(key);if(e)e.count++;else edges.set(key,{count:1,a,b,fi});}
 // A common offset at coincident UV-seam vertices prevents small seam cracks.
 for(const fi of plan.back){
  const a=F[fi*3],b=F[fi*3+1],c=F[fi*3+2];
  const ab=[V[b*3]-V[a*3],V[b*3+1]-V[a*3+1],V[b*3+2]-V[a*3+2]],ac=[V[c*3]-V[a*3],V[c*3+1]-V[a*3+1],V[c*3+2]-V[a*3+2]];
  const nn=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  for(const vi of [a,b,c]){const key=pkey(vi),v=offsets.get(key)||[0,0,0];for(let k=0;k<3;k++)v[k]+=nn[k];offsets.set(key,v);}
 }
 const getBack=i=>{if(backVerts.has(i))return backVerts.get(i);const d=offsets.get(pkey(i))||N.slice(i*3,i*3+3),len=Math.hypot(...d)||1;
  const p=V.slice(i*3,i*3+3).map((x,k)=>x-plan.thickness*d[k]/len),n=N.slice(i*3,i*3+3).map(x=>-x),j=addVertex(p,n,U.slice(i*2,i*2+2));backVerts.set(i,j);return j;};
 let rimFaces=0;
 const addRim=(a,b,c,fi)=>{const ab=[V[b*3]-V[a*3],V[b*3+1]-V[a*3+1],V[b*3+2]-V[a*3+2]],ac=[V[c*3]-V[a*3],V[c*3+1]-V[a*3+1],V[c*3+2]-V[a*3+2]];
  const nn=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...nn);if(len<1e-13)return;
  const n=nn.map(v=>v/len),ids=[a,b,c].map(i=>addVertex(V.slice(i*3,i*3+3),n,U.slice(i*2,i*2+2)));F.push(...ids);faceSource.push(faceSource[fi]);rimFaces++;
 };
 for(const fi of plan.back){const a=F[fi*3],b=F[fi*3+1],c=F[fi*3+2];F.push(getBack(a),getBack(c),getBack(b));faceSource.push(faceSource[fi]);}
 const backSet=new Set(plan.back);
 for(const e of edges.values())if(e.count===1&&backSet.has(e.fi)){
  // Close only a genuinely open sheet edge, not an internal patch boundary.
  const a=e.a,b=e.b,aa=getBack(a),bb=getBack(b);addRim(b,a,aa,e.fi);addRim(b,aa,bb,e.fi);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(V,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(U,2));geo.setIndex(F);
 geo.setAttribute('iGrowth',source.getAttribute('iGrowth'));geo.computeBoundingSphere();geo.computeBoundingBox();
 geo.userData.faceSource=faceSource;geo.userData.repair={reversed:plan.flip.length,reverseFaces:plan.back.length,capFaces:plan.caps.length,rimFaces,originalFaces:plan.originalFaces,faces:F.length/3};return geo;
}
function protectBridgeBackfaces(geo,index){
 // Morph regions separate briefly and expose surfaces that were inside the
 // stable mesh. Add only reverses detected in offline multi-angle GPU tests.
 if(!REPAIR_MODES[repairMode].fixed)return;
 const faces=repairPlans.bridgeBackfaces?.[index];if(!faces?.length)return;
 const oldCount=geo.attributes.position.count,normal=geo.attributes.normal.array;
 for(const name of Object.keys(geo.attributes)){
  const old=geo.attributes[name],size=old.itemSize,data=new Float32Array((oldCount+faces.length*3)*size);data.set(old.array);let dst=oldCount*size;
  for(const fi of faces)for(const corner of [0,2,1]){
   const vi=fi*3+corner;
   for(let k=0;k<size;k++){
    let x=old.array[vi*size+k];
    if(name==='normal')x=-x;
    if(name==='position')x-=normal[vi*3+k]*0.000015;
    data[dst++]=x;
   }
  }
  geo.setAttribute(name,new THREE.BufferAttribute(data,size));
 }
 geo.userData.transitionReverseFaces=faces.length;
}

