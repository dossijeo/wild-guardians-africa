"""Offline Rhubarb build. No recognition dependencies are shipped to the browser."""
import argparse, hashlib, json, pathlib, subprocess, tempfile, wave
ROOT=pathlib.Path(__file__).resolve().parents[2]
def run():
    p=argparse.ArgumentParser();p.add_argument('--rhubarb',required=True);p.add_argument('--ffmpeg',default='ffmpeg');p.add_argument('--only');args=p.parse_args()
    version=subprocess.check_output([args.rhubarb,'--version'],text=True).strip()
    records=[r for name in ['spirit-voices','agricultural-spirit-voices','awakening-spirit-voices'] for r in json.loads((ROOT/('content/manifests/'+name+'.json')).read_text(encoding='utf8'))['records']]
    if len({r['id'] for r in records})!=len(records):raise ValueError('Duplicate voice IDs')
    out=ROOT/'public/content/guardian/lipsync';out.mkdir(parents=True,exist_ok=True)
    for r in records:
        if args.only and r['id']!=args.only:continue
        source=ROOT/'public'/r['path'];digest=hashlib.sha256(source.read_bytes()).hexdigest()
        if digest!=r['sha256']:raise ValueError('Audio hash mismatch: '+r['id'])
        target=out/(r['id']+'.json')
        if target.exists() and json.loads(target.read_text())['sourceSha256']==digest:continue
        with tempfile.TemporaryDirectory(prefix='guardian-') as tmp:
            tmp=pathlib.Path(tmp);wav=tmp/'voice.wav';transcript=tmp/'dialog.txt';raw=tmp/'cues.json'
            subprocess.run([args.ffmpeg,'-v','error','-y','-i',str(source),'-ac','1','-ar','16000','-c:a','pcm_s16le',str(wav)],check=True)
            with wave.open(str(wav)) as f:duration=f.getnframes()/f.getframerate()
            transcript.write_text(r['text'],encoding='utf8')
            recognizer='pocketSphinx' if r['language']=='en' else 'phonetic'
            command=[args.rhubarb,'-r',recognizer,'-f','json','--extendedShapes','GHX','--threads','2','-o',str(raw),str(wav)]
            if r['language']=='en':command.extend(['--dialogFile',str(transcript)])
            subprocess.run(command,check=True,capture_output=True)
            data=json.loads(raw.read_text());cues=data['mouthCues'];previous=0
            for cue in cues:
                if cue['value'] not in 'ABCDEFGHX' or cue['start']<previous-.011 or cue['end']<cue['start'] or cue['end']>duration+.03:raise ValueError(r['id']+' invalid cue')
                previous=cue['end']
            result={'id':r['id'],'language':r['language'],'audio':r['path'],'sourceSha256':digest,'duration':duration,'recognizer':recognizer,'rhubarbVersion':version,'text':r['text'],'mouthCues':cues,'reviewStatus':'automatic-unreviewed'}
            target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
            print(r['id'],round(duration,2),len(cues),flush=True)
    index=[{'id':r['id'],'language':r['language'],'audio':r['path'],'cues':'content/guardian/lipsync/'+r['id']+'.json','text':r['text']} for r in records]
    (out.parent/'voices.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if __name__=='__main__':run()
