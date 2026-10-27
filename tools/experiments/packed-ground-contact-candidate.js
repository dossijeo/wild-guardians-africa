// QA candidate only. Reuses the exact final index buffer; no terrain resampling.
export function packGroundContacts(ground){
 if(!ground?.contactCells)return ground;
 const count=ground.nx*ground.nz,offsets=new Uint32Array(count+1),active=new Uint8Array(count);
 let cursor=0;
 for(let z=0;z<ground.nz;z++)for(let x=0;x<ground.nx;x++){
  const cell=z*ground.nx+x,patch=ground.contactCells[x+':'+z];offsets[cell]=cursor;
  if(patch){active[cell]=1;for(const triangle of patch){if(triangle.length!==3)throw Error('Invalid contact triangle');for(const index of triangle){if(ground.indices[cursor++]!==index)throw Error('Contact topology differs from final indices');}}}
  else cursor+=6;
 }
 offsets[count]=cursor;if(cursor!==ground.indices.length)throw Error('Contact index count differs');
 const {contactCells,contactAnchors,...result}=ground;
 return {...result,packedContacts:{offsets,active}};
}
export function hasPackedContact(data,x,z){return !!data.packedContacts?.active[z*data.nx+x];}
export function* packedContactTriangles(data,x,z){
 const cell=z*data.nx+x,{offsets}=data.packedContacts;
 for(let i=offsets[cell];i<offsets[cell+1];i+=3)yield [data.indices[i],data.indices[i+1],data.indices[i+2]];
}
export function packedContactTransferables(ground){return ground?.packedContacts?[ground.packedContacts.offsets.buffer,ground.packedContacts.active.buffer]:[];}
