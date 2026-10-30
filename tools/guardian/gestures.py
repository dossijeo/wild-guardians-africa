"""Derive conservative phrase gestures from transcripts and Rhubarb pause boundaries.
These are approximate phrase anchors, not claimed word-level forced alignment.
"""
import pathlib,json,re
ROOT=pathlib.Path(__file__).resolve().parents[2]
for p in (ROOT/'public/content/guardian/lipsync').glob('*.json'):
 d=json.loads(p.read_text(encoding='utf8'));clauses=[s.strip() for s in re.split(r'(?<=[.!?;:])\s+',d['text']) if s.strip()];total=sum(len(s.split()) for s in clauses);count=0;events=[]
 pauses=[c for c in d['mouthCues'] if c['value']=='X' and c['end']-c['start']>=.14]
 for sentence in clauses:
  estimate=d['duration']*count/max(1,total);count+=len(sentence.split());nearest=min(pauses,key=lambda c:abs(c['end']-estimate),default=None)
  start=nearest['end'] if nearest and abs(nearest['end']-estimate)<1.0 else estimate
  if re.search(r'peligro|maldici|ataq|amenaz|cuidado|reserva|no prometas|danger|curse|attack|threat|careful|reserve|do not',sentence,re.I):clip='Warning';expression='focus'
  elif re.search(r'bien|promesa|gracias|crecer|raíces|welcome|well done|promise|thank|grow|roots',sentence,re.I):clip='Enthusiasm';expression='joy'
  else:clip='Explain';expression='surprise'
  events.append({'start':round(start,3),'end':round(min(d['duration'],start+min(3.6,max(1.5,len(sentence.split())*.16))),3),'clip':clip,'expression':expression,'text':sentence,'alignment':'estimated-transcript-with-pause-snap'})
 d['gestures']=events;d['pauses']=[{'start':c['start'],'end':c['end']} for c in pauses];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('54 transcript gesture tracks generated')
