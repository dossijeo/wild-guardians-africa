import json
from pathlib import Path
from PIL import Image, ImageChops
p=Path("docs/qa/global-visual-lab/fern-projected-size-audit-20261023")
b=Path("docs/qa/global-visual-lab/fern-prelit-far-review-20261023")
d=json.loads((p/"captures.json").read_text()); baseline=json.loads((b/"captures.json").read_text()); rows=[]
for r in d["records"]:
 old=next(x for x in baseline["records"] if x["treatment"]=="native" and x["phase"]==r["phase"])
 assert not r["errors"]
 for f,o in zip(r["frames"],old["frames"]):
  assert all(f[k]==o[k] for k in ["camera","target","time","origin","calls","triangles"])
  assert all(f["coverage"][k]==o["coverage"][k] for k in ["near","far"])
  assert not f["glError"]
  rel=Path("native")/f"manglares-media-native-{r['phase']}"/f"{f['i']:04}.png"
  delta=ImageChops.difference(Image.open(p/rel).convert("RGB"),Image.open(b/rel).convert("RGB"))
  rows.append(dict(phase=r["phase"],view=f["i"],rgbExact=delta.getbbox() is None,near=f["coverage"]["near"],far=f["coverage"]["far"],projection=f["coverage"]["projectedAudit"]))
(p/"audit.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf8")
print(json.dumps([{k:v for k,v in r.items() if k!="projection"} for r in rows],indent=2))
