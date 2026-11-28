from pathlib import Path
import hashlib,json
rows=[]
for file,pairs in [
 ('src/rendering/webgpu-world-surface.js',[("if(starting&&participants.length===1&&participants[0].withSourcePresentation)","if(participants.length===1&&participants[0].withSourcePresentation)")]),
 ('tests/helpers/native-task-consequence-graphics.js',[("export async function nativeTaskConsequenceGraphicsFixture({idle=false}={}){","export async function nativeTaskConsequenceGraphicsFixture({idle=false,alert=false,...nativeOptions}={}){"),("const native=nativeTaskConsequenceFixture(),initialState=", "const native=nativeTaskConsequenceFixture(nativeOptions),initialState="),("nativeWorkerGraphicsFixture(native,{idle,initialState})","nativeWorkerGraphicsFixture(native,{idle,alert,initialState})")])]:
 raw=Path(file).read_bytes();s=raw.decode().replace('\r\n','\n')
 for a,b in pairs:assert s.count(a)==1,(file,a,s.count(a));s=s.replace(a,b)
 out='.cache/native-settled-idle-consumer-draft-'+Path(file).name;Path(out).write_bytes(s.encode());rows.append({'path':file,'sha256':hashlib.sha256(raw).hexdigest(),'draft':out})
Path('.cache/native-settled-idle-consumer-connections-draft.json').write_text(json.dumps({'scope':'UNRUN draft only. No original Surface/test helper changed. Single-participant source picking; multi-participant gates must receive explicit coverage before global acceptance.','files':rows},indent=2)+'\n')
print('Prepared Surface/source-view and fixture-option draft, no original changes.')
