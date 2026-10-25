"""Derive night fixtures without changing entities, camera, seed or elapsed."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2]
folders={'sabana':'sabana-populated-frozen-20261022','gran-rio':'gran-rio-populated-frozen-20261022','manglares':'manglares-populated-frozen-20261022','desierto':'desert-populated-closure-20261022','volcanes':'volcanes-populated-frozen-20261022','gran-canon':'gran-canon-populated-native-camera-20261022'}
out=root/'.codex-tmp/current-night-fixtures';out.mkdir(parents=True,exist_ok=True);rows=[]
for biome,folder in folders.items():
    src=root/'docs/qa/global-visual-lab'/folder/'native-fixture.json';data=json.loads(src.read_text());state=json.loads(data['timing']['navigationContext']['state']);before=dict(state)
    assert state['biome']==biome
    state['time']=350
    assert {k:v for k,v in state.items() if k!='time'}=={k:v for k,v in before.items() if k!='time'}
    data['timing']['navigationContext']['state']=json.dumps(state,separators=(',',':'))
    dest=out/(biome+'.json');dest.write_text(json.dumps(data)+'\n',encoding='utf-8')
    rows.append({'biome':biome,'source':str(src.relative_to(root)),'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'output':str(dest.relative_to(root)),'outputSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'originalTime':before['time'],'nightTime':350,'elapsed':state['elapsed']})
(root/'docs/qa/global-visual-lab/current-review-20261025/low-night-fixtures.json').write_text(json.dumps({'scope':'Only time changed to350. Active harness additionally skips tutorial as in day controls; render raid camera locked to preserve authored path.','fixtures':rows},indent=2)+'\n',encoding='utf-8')
print('Prepared six night fixtures')
