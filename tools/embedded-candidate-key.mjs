export function embeddedCandidateKey(originalGlbSha256,index){
 if(!/^[a-f0-9]{64}$/.test(originalGlbSha256)||!Number.isSafeInteger(index)||index<0)throw Error('Invalid candidate model/image identity');
 return originalGlbSha256+'-'+index;
}
