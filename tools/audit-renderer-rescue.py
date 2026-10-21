"""Summarize every measurement block; never trim samples or add CPU to GPU."""
import gzip, json, sys, statistics
from pathlib import Path

def stats(values):
    values = sorted(x for x in values if x is not None)
    if not values: return None
    def percentile(p):
        i = (len(values)-1)*p
        lo = int(i)
        return values[lo] + (values[min(lo+1,len(values)-1)]-values[lo])*(i-lo)
    return dict(n=len(values), mean=statistics.fmean(values), p50=percentile(.5), p95=percentile(.95), p99=percentile(.99))

path=Path(sys.argv[1]); data=json.loads(gzip.decompress(path.read_bytes()).decode('utf-8') if path.suffix=='.gz' else path.read_text(encoding='utf-8'))
rows=[]
for item in data['rows']:
    row={key:item.get(key) for key in ['biome','quality','variant','phase','diagnostic','groupCapacityBytes','collectedHeap','jsHeap','memory','resolution','glError','errors']}
    if 'cadence' not in item:
        row.update({key:item.get(key) for key in ['pose','difference','name','colorCount']})
    else:
        for block in ['gpu','cadence']:
            frames=item[block]['frames']
            row[block]={key:stats([frame.get(key) for frame in frames]) for key in ['cpuMs','groupCpuMs','intervalMs','uploads','calls','triangles']}
            if frames and frames[0].get('traffic'):
                row[block]['traffic']={key:stats([f['traffic'][key] for f in frames]) for key in frames[0]['traffic'] if frames[0]['traffic'][key] is not None}
        report=item['gpu']['gpu'];row['timer']={key:value for key,value in report.items() if key!='samples'}
        row['gpuMs']=stats([sample['ms'] for sample in report['samples']])
        if item['errors'] or item['glError']: raise ValueError('Invalid block')
    rows.append(row)
summary={'config':data['config'],'rows':rows}
output=path.with_name('summary.json')
output.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
for row in rows:
    if 'cadence' in row:
        print(row['variant'],row['phase'], 'CPU',round(row['cadence']['cpuMs']['mean'],3),'p95',round(row['cadence']['cpuMs']['p95'],3),'groups',round(row['cadence']['groupCpuMs']['mean'],3),'GPU',round(row['gpuMs']['mean'],3) if row['gpuMs'] else None,'interval',round(row['cadence']['intervalMs']['mean'],3),'p95',round(row['cadence']['intervalMs']['p95'],3),'triangles',round(row['cadence']['triangles']['mean']),'uploads',round(row['cadence']['uploads']['mean'],2))
    else: print(row['biome'],row['quality'],row['phase'],row['pose'],row['variant'],row['difference'])
