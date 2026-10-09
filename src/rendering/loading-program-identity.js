// Smoke-only metadata from Three's already-created programs and materials.
// No compile, custom cache-key callback or WebGL query is invoked here.
export function loadingProgramIdentityWitness(renderer,onSubmit,now=()=>performance.now()){
 if(globalThis.__desktopSmokeLoadingPollWitness!==true||!onSubmit)return null;
 const seen=new Set();
 return (materials,objects=[])=>{
  const start=now(),identities=[];
  try{for(const material of materials){
   const properties=renderer.properties.get(material),programs=properties.programs?.size?properties.programs.values():[properties.currentProgram];
   for(const program of programs){
    if(!program)continue;const identity=String(program.id)+':'+material.uuid;if(seen.has(identity))continue;seen.add(identity);
    const cacheKey=typeof program.cacheKey==='string'?program.cacheKey:null;
    const defines=Object.fromEntries(Object.entries(material.defines??{}).filter(([,value])=>value===null||['string','number','boolean'].includes(typeof value)));
    identities.push({programId:Number.isInteger(program.id)?program.id:null,programName:program.name??null,programType:program.type??null,cacheKey:cacheKey?.slice(0,65536)??null,cacheKeyLength:cacheKey?.length??null,cacheKeyTruncated:(cacheKey?.length??0)>65536,materialUuid:material.uuid??null,materialName:material.name??null,materialType:material.type??null,currentProgram:program===properties.currentProgram,side:material.side??null,transparent:material.transparent??null,defines,objects:objects.filter(object=>Array.isArray(object.material)?object.material.includes(material):object.material===material).map(object=>({uuid:object.uuid??null,name:object.name??null,type:object.type??null,geometryType:object.geometry?.type??null,attributes:Object.keys(object.geometry?.attributes??{}),castShadow:object.castShadow??null,receiveShadow:object.receiveShadow??null}))});
   }
  }}catch(error){identities.push({unavailable:String(error)});}
  const end=now();try{onSubmit({label:'loading-program-identity',start,end,duration:end-start,identities,scope:'CPU metadata copy from already-created Three program/material properties; no additional compile/isReady/WebGL query. Cache key records existing recipe, not independent compile/link status.'});}catch{}
 };
}
