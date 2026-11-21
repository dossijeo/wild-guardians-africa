import {createHash} from 'node:crypto';

// Evidence retains the exact curve and a digest of authored geometry, rather
// than serializing every typed-array index as a separate JSON property.
export function nativeGateResourceReceipt(resources){
 if(resources.capture==='geometry-sha256-and-exact-curve')return resources;
 const describe=(value,Type)=>{const values=Type.from(Object.values(value));return {componentType:Type.name,length:values.length,sha256:createHash('sha256').update(Buffer.from(values.buffer)).digest('hex')};};
 return {...resources,capture:'geometry-sha256-and-exact-curve',gates:resources.gates.map(gate=>({...gate,positions:describe(gate.positions,Float32Array),leafFlags:describe(gate.leafFlags,Uint8Array),rows:Object.values(gate.rows)}))};
}
