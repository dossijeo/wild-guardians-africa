// Native ToolSafe clips use this scale for the hidden tool state in all four
// authored worker rigs. Keep intermediate scales during transitions visible.
const HIDDEN_SCALE=1e-5;
const NAMES=['Prop_WateringCan','Can_Nozzle','Can_badge','Prop_Hoe','Prop_FruitCrate','Prop_HarvestSack'];
const tools=new WeakMap();
export function syncWorkerToolVisibility(data,enabled=true){
 const root=data.model??data.mixer.getRoot();
 let record=tools.get(data);
 if(!record||record.root!==root){record={root,nodes:NAMES.map(name=>root.getObjectByName(name)).filter(Boolean).map(node=>({node,visible:node.visible}))};tools.set(data,record);}
 for(const {node,visible} of record.nodes){
  const hidden=Math.max(Math.abs(node.scale.x),Math.abs(node.scale.y),Math.abs(node.scale.z))<=HIDDEN_SCALE;
  node.visible=visible&&(!enabled||!hidden);
 }
}
