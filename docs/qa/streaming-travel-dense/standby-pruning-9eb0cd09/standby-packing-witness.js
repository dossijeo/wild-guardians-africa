// Read-only QA outside measured frames. Checks every submitted matrix/proof;
// only descriptive row samples are capped. Checksums describe Float32 bytes.
export function standbyPackingWitness(adapters,{sampleLimit=8}={}){
 if(!Number.isInteger(sampleLimit)||sampleLimit<0||sampleLimit>32)throw Error('Invalid standby witness sample limit');
 const result={scope:'All submitted rows checked; descriptive samples capped per LOD. CPU/resource witness, not GPU completion proof.',sampleLimit,submittedRows:0,invalidRows:0,adapters:[]};
 for(const adapter of adapters??[]){
  const entry={stats:{...adapter.stats.standby,errors:[...(adapter.stats.standby?.errors??[])]},levels:[]};
  for(const draw of adapter.standbyDraws()){
   const {mesh,level,drawRows,preparedRows,preparedMatrices,isPrepared}=draw,capacity=mesh.instanceMatrix.array.length/16,count=mesh.count;
   let actualHash=2166136261,preparedHash=2166136261,invalid=0;const samples=[],validCount=Number.isInteger(count)&&count>=0&&count<=capacity&&count<=drawRows.length;
   const actualBytes=new Uint8Array(mesh.instanceMatrix.array.buffer,mesh.instanceMatrix.array.byteOffset,mesh.instanceMatrix.array.byteLength),expectedBytes=new Uint8Array(preparedMatrices.buffer,preparedMatrices.byteOffset,preparedMatrices.byteLength);
   for(let row=0;row<(validCount?count:0);row++){
    const data=drawRows[row],preparedIndex=preparedRows.indexOf(data),visibility=mesh.geometry.attributes.nativeVisibility.getX(row),ready=isPrepared(data.id);let exact=preparedIndex>=0;
    for(let byte=0;byte<64;byte++){const actual=actualBytes[row*64+byte],expected=expectedBytes[preparedIndex*64+byte];actualHash=Math.imul(actualHash^actual,16777619)>>>0;preparedHash=Math.imul(preparedHash^(expected??0),16777619)>>>0;if(actual!==expected)exact=false;}
    if(!exact||!ready||!(visibility>0))invalid++;
    if(samples.length<sampleLimit)samples.push({id:data.id,key:data.key,drawIndex:row,preparedIndex,matrixExact:exact,isPrepared:ready,visibility,matrix:Array.from(mesh.instanceMatrix.array.subarray(row*16,row*16+16))});
   }
   if(!validCount)invalid++;result.submittedRows+=count;result.invalidRows+=invalid;
   entry.levels.push({level,count,capacity,validCount,drawRows:drawRows.length,preparedRows:preparedRows.length,visible:mesh.visible,castShadow:mesh.castShadow,matrixVersion:mesh.instanceMatrix.version,visibilityVersion:mesh.geometry.attributes.nativeVisibility.version,invalidRows:invalid,actualFloat32Checksum:actualHash.toString(16),preparedFloat32Checksum:preparedHash.toString(16),sampledRows:samples.length,samples});
  }
  result.adapters.push(entry);
 }
 return result;
}
