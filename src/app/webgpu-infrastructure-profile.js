// Resolve once per startup/attachment using the same product policy. Each
// feature has an explicit opt-out; none depends on DEV or a diagnostic URL.
export function webGpuInfrastructureProfile({enabled,env={}}={}){
 if(typeof enabled!=='boolean'||!env||typeof env!=='object')throw TypeError('Invalid infrastructure profile');
 const setting=key=>{const value=env[key];if(value!==undefined&&!['true','false',''].includes(value))throw TypeError('Invalid infrastructure setting: '+key);return value;};
 const recovery=setting('VITE_HISTORICAL_PRESENTATION_RECOVERY'),events=setting('VITE_HISTORICAL_EVENT_BOUNDARIES'),far=setting('VITE_WEBGPU_FAR_VISUAL');
 if(!enabled)return Object.freeze({historicalRecovery:false,historicalEvents:false,farVisualQueries:false});
 if(recovery==='false'&&events==='true')throw Error('Historical events require temporal recovery');
 const historicalRecovery=recovery!=='false';
 return Object.freeze({historicalRecovery,historicalEvents:historicalRecovery&&events!=='false',farVisualQueries:far!=='false'});
}
