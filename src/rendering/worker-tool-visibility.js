// Native ToolSafe clips use this scale for the hidden tool state in all four
// authored worker rigs. Keep intermediate scales during transitions visible.
const HIDDEN_SCALE=1e-5;
export const WORKER_TOOL_NAMES=Object.freeze(['Prop_WateringCan','Can_Nozzle','Can_badge','Prop_Hoe','Prop_FruitCrate','Prop_HarvestSack']);
const tools=new WeakMap();
const toolMeshVisibility=new WeakMap();
// Captured before the first native variant hides child meshes. All later
// presentations of this same model restore that canonical source visibility,
// even when their predecessor has already retired.
export function captureWorkerToolMeshVisibility(root){
 if(!root?.isObject3D)throw TypeError('Invalid worker tool root');
 let record=toolMeshVisibility.get(root);
 if(!record){const unique=new Set();for(const name of WORKER_TOOL_NAMES)root.getObjectByName(name)?.traverse(node=>{if(node.isMesh&&!node.isSkinnedMesh)unique.add(node);});record=[...unique].map(node=>({node,visible:node.visible}));toolMeshVisibility.set(root,record);}
 return ()=>{for(const {node,visible} of record)node.visible=visible;};
}
export function syncWorkerToolVisibility(data,enabled=true){
 const root=data.model??data.mixer.getRoot();
 let record=tools.get(data);
 if(!record||record.root!==root){record={root,nodes:WORKER_TOOL_NAMES.map(name=>root.getObjectByName(name)).filter(Boolean).map(node=>({node,visible:node.visible}))};tools.set(data,record);}
 for(const {node,visible} of record.nodes){
  const hidden=Math.max(Math.abs(node.scale.x),Math.abs(node.scale.y),Math.abs(node.scale.z))<=HIDDEN_SCALE;
  node.visible=visible&&(!enabled||!hidden);
 }
}
