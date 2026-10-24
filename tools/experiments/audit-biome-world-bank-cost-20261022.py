import json,statistics,os
from pathlib import Path
r=Path(os.environ.get("WG_BENCH_OUT","docs/qa/global-visual-lab/biome-world-bank-cost-20261022"))
d=json.loads((r/"benchmarks.json").read_text(encoding="utf-8"));out=[];reference={}
def stats(xs):
 xs=sorted(xs);return dict(mean=statistics.mean(xs),p95=xs[int((len(xs)-1)*.95)])
for b in d["records"]:
 assert not b["errors"]
 for mode in ["gpu","cadence"]:
  m=b[mode];assert m["stateUnchanged"] and not m["glError"];assert len(m["frames"])==90
  sig=[(f["camera"],f["calls"],f["triangles"]) for f in m["frames"]]
  key=(b["biome"],b["phase"],mode)
  if key in reference:assert reference[key]==sig
  else:reference[key]=sig
 g=b["gpu"]["gpu"];assert g["supported"] and len(g["samples"])==90
 for k in ["disjointEvents","discarded","overflowSkipped","foreignQuerySkipped","allocationFailures","unresolvedAtDispose","contextLost","pending"]:assert not g[k],k
 out.append(dict(biome=b["biome"],variant=b["variant"],phase=b["phase"],gpu=stats([s["ms"] for s in g["samples"]]),cpu=stats([f["cpuMs"] for f in b["cadence"]["frames"]]),interval=stats([f["intervalMs"] for f in b["cadence"]["frames"]]),device=b["gpu"]["device"]))
assert len(out)==16
(r/"summary.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
print(json.dumps(out,indent=2))
