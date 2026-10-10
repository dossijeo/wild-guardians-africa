import hunks from './preflight-comparison-hunks.json' with {type:'json'};
export function undoPreflightQa(path,text){
 if(path==='src-tauri/src/main.rs')return text.replace(hunks.rust,'').replace(hunks.policyRust,'');
 if(path==='.github/workflows/windows.yml')return text.replace(hunks.policyWorkflowEnv,'').replace('WaitForExit(420000)','WaitForExit(240000)');
 if(path==='src-tauri/smoke.js')return text.replace(hunks.policyHeader,'').replace('worldStartedAt + worldTimeoutMs','worldStartedAt + 90000').replace(hunks.prefix,'').replace(hunks.suffix,'').replace(hunks.identity,'').replace(hunks.helper,'').replace(hunks.fixture,"    if (fixture) {localStorage.setItem('wild-guardians:slot:'+fixture.slotId,fixture.snapshot);send({action:'load-slot',slotId:fixture.slotId});}");
 return text;
}
