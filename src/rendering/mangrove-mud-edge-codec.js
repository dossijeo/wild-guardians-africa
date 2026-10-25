// Copy descriptors only here; postMessage clones the backing arrays once.
export function encodeMudEdgeInput(input){
 const result={origin:input.origin,outlines:input.outlines};
 for(const name of ['gp','gc','gn','p']){const a=input[name],array=a.isInterleavedBufferAttribute?a.data.array:a.array;if(!(array instanceof Float32Array)||a.normalized)throw Error('Unsupported mud edge input');result[name]={array,stride:a.isInterleavedBufferAttribute?a.data.stride:a.itemSize,offset:a.offset??0,count:a.count};}
 return result;
}
export function decodeMudEdgeInput(data){
 const input={...data};for(const name of ['gp','gc','gn','p']){const a=data[name],get=(i,k)=>a.array[i*a.stride+a.offset+k];input[name]={count:a.count,getX:i=>get(i,0),getZ:i=>get(i,2),getComponent:get};}return input;
}
