// QA opt-in only: this producer increments attribute versions on every rebuild.
export function patchVersionedShadow(source){
 const a='function attribute(attribute, count) {',b='const active = Math.min(attribute.count, Math.ceil(count / (data.meshPerAttribute || 1)));',c='attribute(geometry.attributes[name], count);';
 for(const anchor of [a,b,c])if(!source.includes(anchor))throw Error('Shadow patch anchor missing: '+anchor);
 return source.replace(a,'function attribute(attribute, count, versioned=false) {').replace(b,`if(versioned){put(data.array);put(data.version);put(attribute.count);put(data.stride);put(attribute.offset);put(data.meshPerAttribute);return;}
      ${b}`).replace(c,"attribute(geometry.attributes[name], count, geometry.userData.qaVersionedShadow===true && ['coverageAnchor','coverageData','coverageSlope'].includes(name));");
}
