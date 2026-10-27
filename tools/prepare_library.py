"""Package isolated native reference demos for lazy loading."""
import pathlib,json,shutil
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'content/manifests/assets.json').read_text(encoding='utf-8'))
crop_assets=json.loads((root/'content/manifests/crops-v4.json').read_text(encoding='utf-8'))
selected={'crops':'Bioma_Cultivos','walls':'Bastion_Lab','destruction':'BIOMA_Destruccion','sfx':'Wild_Guardians_SFX'}
result={}
for key,prefix in selected.items():
    source=next(s for s in manifest['sources'] if s['file'].startswith(prefix))
    folder=root/'public/library'/key;folder.mkdir(parents=True,exist_ok=True)
    result[key]={'markup':f'/library/{key}/markup.html','payloads':[],'scripts':[]}
    shutil.copyfile(root/source['markup'],folder/'markup.html')
    for payload in source['payloads']:
        data=dict(payload)
        # The crops lab decompresses assetData before parsing its GLB. Asset
        # extraction stores the decompressed resource, so restore that envelope.
        if key=='crops' and data['id']=='assetData':
            data['url']=crop_assets['steady']['url']
            data['encoding']='gzip-binary'
        if key=='crops' and data['id']=='bridgeData':
            data={'id':'bridgeData','path':'/content/crop-bridges.json','encoding':'gzip-json'}
        if 'path' in data:
            path=root/data.pop('path').lstrip('/');
            if path!=root/'content/crop-bridges.json':
                shutil.copyfile(path,folder/path.name);data['path']=f'/library/{key}/{path.name}'
            else:data['path']='/content/crop-bridges.json'
        result[key]['payloads'].append(data)
    if key=='crops':result[key]['payloads'].append({'id':'bakedBridges','url':crop_assets['bridges']['url'],'encoding':'gzip-binary'})
    for code in source['code']:
        path=root/code
        # The production crop asset adapter is maintained in public/library;
        # the archived V3 lab script remains untouched under references/.
        if key!='crops' or path.name!='script-4.js':shutil.copyfile(path,folder/path.name)
        result[key]['scripts'].append(f'/library/{key}/{path.name}')
(root/'public/library/manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(selected)} isolated original libraries prepared')
