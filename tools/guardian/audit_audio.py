"""Conservative offline silence audit; preserve Rhubarb output and record every change."""
import pathlib,json,subprocess,array,math
ROOT=pathlib.Path(__file__).resolve().parents[2]
report=[]
for path in sorted((ROOT/'public/content/guardian/lipsync').glob('*.json')):
 d=json.loads(path.read_text(encoding='utf8'));pcm=subprocess.run(['ffmpeg','-v','error','-i',str(ROOT/'public'/d['audio']),'-ac','1','-ar','16000','-f','f32le','-'],check=True,capture_output=True).stdout
 samples=array.array('f');samples.frombytes(pcm);hop=320;silent=[];start=None
 for i in range(0,len(samples),hop):
  chunk=samples[i:i+hop];rms=math.sqrt(sum(x*x for x in chunk)/max(1,len(chunk)));quiet=rms<10**(-48/20)
  if quiet and start is None:start=i/16000
  if not quiet and start is not None:
   end=i/16000
   if end-start>=.18:silent.append((start+.03,end-.03))
   start=None
 if start is not None and d['duration']-start>=.18:silent.append((start+.03,d['duration']))
 raw=d.get('rhubarbMouthCues',d['mouthCues']);corrected=[];changes=[]
 for cue in raw:
  cuts=sorted({cue['start'],cue['end']}|{round(t,3) for interval in silent for t in interval if cue['start']<t<cue['end']})
  for a,b in zip(cuts,cuts[1:]):
   value='X' if any(lo<=(a+b)/2<=hi for lo,hi in silent) else cue['value']
   if value!=cue['value']:changes.append({'start':a,'end':b,'from':cue['value'],'to':value,'reason':'PCM RMS below -48 dBFS for at least 180 ms; 30 ms boundary guard'})
   if corrected and corrected[-1]['value']==value and abs(corrected[-1]['end']-a)<.001:corrected[-1]['end']=b
   else:corrected.append({'start':a,'end':b,'value':value})
 d['rhubarbMouthCues']=raw;d['mouthCues']=corrected;d['corrections']=changes;d['reviewStatus']='timing-and-silence-checked; phonetic-perception-not-certified'
 path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 report.append({'id':d['id'],'duration':d['duration'],'silences':len(silent),'corrections':len(changes),'longNonRestCues':[c for c in corrected if c['value']!='X' and c['end']-c['start']>1.0]})
(ROOT/'docs/guardian/audio-audit.json').write_text(json.dumps(report,indent=2)+'\n');print('Audited',len(report),'clips;',sum(r['corrections'] for r in report),'documented silence corrections')
