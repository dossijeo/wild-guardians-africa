export function patchCoveragePrefix(source){
 const old="for(const name of ['coverageAnchor','coverageData','coverageSlope'])g.attributes[name].needsUpdate=true;";
 if(source.split(old).length!==2)throw Error('Coverage upload anchor changed');
 return source.replace(old,"for(const name of ['coverageAnchor','coverageData','coverageSlope']){const a=g.attributes[name];a.clearUpdateRanges();if(count>0){a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=true;}}");
}
