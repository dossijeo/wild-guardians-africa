# Generator default-equivalence proof isolated from all tracked inputs/outputs.
import json,pathlib,shutil,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='wild-guardian-attraction-default-') as tmp:
 target=pathlib.Path(tmp);(target/'tools').mkdir();(target/'content/balance').mkdir(parents=True);(target/'src/simulation').mkdir(parents=True)
 shutil.copyfile(root/'tools/generate_balance.py',target/'tools/generate_balance.py')
 shutil.copyfile(root/'content/balance/balance_confirmado.json',target/'content/balance/balance_confirmado.json')
 original=json.loads(subprocess.check_output(['git','show','8541cbf0:content/balance/player_revisions.json'],cwd=root))
 (target/'content/balance/player_revisions.json').write_text(json.dumps(original),encoding='utf-8')
 subprocess.run(['python',str(target/'tools/generate_balance.py')],check=True)
 generated=(target/'src/simulation/balance.js').read_text(encoding='utf-8')
 actual=json.loads(generated.split('export const BALANCE = ',1)[1].strip().removesuffix(';'))
 expected=json.loads(subprocess.check_output(['git','show','8541cbf0:src/simulation/balance.js'],cwd=root).decode().split('export const BALANCE = ',1)[1].strip().removesuffix(';'))
 for c in actual['crops']:assert c.pop('base_attraction_value')==c['base_harvest_value']
 assert actual==expected
 print('PASS: default generator retains all baseline values; added attraction equals previous effective income for all eight species')
