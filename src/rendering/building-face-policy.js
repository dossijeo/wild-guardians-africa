// Prepared once per template. 0 = ordinary two-sided face, 1 = authored front
// only (opposite face supplies its own UVs), 2 = redundant same-winding copy.
export function buildingFacePolicyFromInterleaved(data){
 if(data.length%36)throw Error('Expected complete building triangles with stride 12');
 return buildingFacePolicy({count:data.length/12,getX:i=>data[i*12],getY:i=>data[i*12+1],getZ:i=>data[i*12+2]});
}
export function buildingFacePolicy(position){
 const policy=new Float32Array(position.count),groups=new Map();
 for(let i=0;i+2<position.count;i+=3){
  const points=[0,1,2].map(k=>[position.getX(i+k),position.getY(i+k),position.getZ(i+k)].map(v=>Math.round(v*1e6)).join(','));
  if(new Set(points).size<3)continue;
  const sorted=[...points].sort(),key=sorted.join('|'),order=points.map(p=>sorted.indexOf(p));
  const winding=((order[0]>order[1])+(order[0]>order[2])+(order[1]>order[2]))%2;
  let group=groups.get(key);if(!group){group=[[],[]];groups.set(key,group);}group[winding].push(i);
 }
 for(const group of groups.values()){
  const paired=group[0].length>0&&group[1].length>0;
  for(const faces of group)for(let j=0;j<faces.length;j++)policy.fill(j?2:paired?1:0,faces[j],faces[j]+3);
 }
 return policy;
}

export function buildingFaceShaders(vertex,fragment){
 return {
  vertex:vertex.replace('void main(){','in float aFacePolicy;flat out float vFacePolicy;\nvoid main(){\n vFacePolicy=(uMode==0&&uInner<.5&&uDamage<=.79)?aFacePolicy:0.;'),
  fragment:fragment.replace('void main(){','flat in float vFacePolicy;\nvoid main(){\n if(vFacePolicy>1.5||(vFacePolicy>.5&&!gl_FrontFacing))discard;')
 };
}
