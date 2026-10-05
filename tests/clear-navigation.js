// Flat, unconditionally clear test double for domain-only tests. It cannot
// certify native terrain, physical door clearance or real navigation routes.
export function clearNavigation(){
 return {placement:()=>({valid:true,suppress:[]}),wallPlacement:()=>({valid:true,suppress:[]}),
  field:{canyon:false},obstacles:[],suppressed:new Set(),propsAt:()=>[],
  forBuildingPlacement(){return {...this};},segmentClear:()=>true,
  setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
}
