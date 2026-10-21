// Call synchronously at the Engine chunk-payload boundary, while its selected
// chunk still owns props_ptr. The snapshot survives selection and memory growth.
export function capturePackedProps(wasm,cx,cz){
 const count=wasm.spatial_prop_count(),pointer=wasm.spatial_props_ptr();
 if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(pointer)||pointer<0)
  throw RangeError('Invalid Engine prop export');
 const bytes=count*40,buffer=wasm.memory.buffer;
 if(!Number.isSafeInteger(bytes)||pointer+bytes>buffer.byteLength)
  throw RangeError('Engine prop export outside memory');
 return {format:'wild-engine-props-v1',stride:40,cx,cz,count,
  records:new Uint8Array(buffer,pointer,bytes).slice()};
}
