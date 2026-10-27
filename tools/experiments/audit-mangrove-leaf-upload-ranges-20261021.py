from pathlib import Path
import json,numpy as np
root=Path("docs/qa/global-visual-lab/mangrove-leaf-upload-ranges-20261021/performance");data=json.loads((root/"benchmarks.json").read_text());out=[]
assert len(data["records"])==8
for r in data["records"]:
 g,c=r["gpu"],r["cadence"];t=g["gpu"]
 assert t["supported"] and len(t["samples"])==90 and len(c["frames"])==90
 for k in ["disjointEvents","discarded","overflowSkipped","foreignQuerySkipped","allocationFailures","unresolvedAtDispose","pending"]:assert not t[k],k
 assert not t["contextLost"] and not g["glError"] and not c["glError"] and g["stateUnchanged"] and c["stateUnchanged"]
 ms=[s["ms"] for s in t["samples"]];assert all(0<x<1000 for x in ms)
 cpu=[f["cpuMs"] for f in c["frames"]];dt=[f["intervalMs"] for f in c["frames"]]
 selection=[f["selectionMs"] for f in c["frames"]];build=[f["buildMs"] for f in c["frames"]]
 out.append(dict(selectionMean=float(np.mean(selection)),selectionP95=float(np.percentile(selection,95)),buildTotal=float(sum(build)),phase=r["phase"],mode=r["mode"],gpuMean=float(np.mean(ms)),gpuP95=float(np.percentile(ms,95)),cpuMean=float(np.mean(cpu)),cpuP95=float(np.percentile(cpu,95)),intervalMean=float(np.mean(dt)),intervalP95=float(np.percentile(dt,95)),calls=sorted(set(f["calls"] for f in c["frames"])),triangles=sorted(set(f["triangles"] for f in c["frames"])),memory=c["memory"],device=g["device"]))
(root/"summary.json").write_text(json.dumps(out,indent=2)+"\n",encoding="utf-8",newline="\n")
for r in out:print(r["phase"],r["mode"],*[round(r[k],3) for k in ["gpuMean","cpuMean","intervalMean","intervalP95"]],"selection",round(r["selectionMean"],3),"p95",round(r["selectionP95"],3),"build",round(r["buildTotal"],3))

for phase in ["day","night"]:
 group=[r for r in data["records"] if r["phase"]==phase]
 for sampleType in ["gpu","cadence"]:
  control=[f["camera"] for f in group[0][sampleType]["frames"]]
  for r in group[1:]:assert [f["camera"] for f in r[sampleType]["frames"]]==control

for phase in ["day","night"]:
 group=[r for r in data["records"] if r["phase"]==phase]
 for sampleType in ["gpu","cadence"]:
  expected=[(f["calls"],f["triangles"]) for f in group[0][sampleType]["frames"]]
  for r in group[1:]:assert [(f["calls"],f["triangles"]) for f in r[sampleType]["frames"]]==expected
