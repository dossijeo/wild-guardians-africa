"""Read-only strike-consumer attribution; no simulation or current-runtime imports."""
import argparse, base64, collections, gzip, hashlib, json
from pathlib import Path

def digest(b): return hashlib.sha256(b).hexdigest()
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def zipped(p): return json.loads(gzip.decompress(p.read_bytes()))
def audit(base, frozen_root=None):
    manifest=read(base/"archive-manifest.json")
    for name,m in manifest["files"].items():
        raw=(base/name).read_bytes()
        assert len(raw)==m["bytes"] and digest(raw)==m["sha256"], name
    provenance=read(base/"native-original/provenance.json")
    frozen=zipped(base/"frozen-source-files.json.gz")
    assert frozen["gitHead"]==provenance["gitHead"]
    assert len(frozen["files"])==len(provenance["sourceHashes"])==394
    for name,m in frozen["files"].items():
        assert digest(base64.b64decode(m["base64"]))==m["sha256"]==provenance["sourceHashes"][name], name
    if frozen_root is not None:
        for name,m in frozen["files"].items():
            assert digest((frozen_root/name).read_bytes())==m["sha256"], name
    result={"frozenRuntimePath":str(frozen_root) if frozen_root else None,"scope":"Original twenty-night strike and presentation observations, not replay or complete trajectories", "source":provenance["gitHead"], "sourceCount":394, "arms":[]}
    for arm in ["responsible","neglect"]:
        d=base/"native-original"/arm
        r=zipped(d/"report.json.gz"); facts=r["raidFacts"]
        assert len(set(e["id"] for e in facts))==len(facts)
        indexes={e["id"]:e for e in facts}
        totals=collections.Counter(); raids=[]
        for raid in r["raids"]:
            actors=[]; budget=r["gates"]["strikeEvidence"]["raids"]
            budget=next(x for x in budget if x["raidId"]==raid["id"])
            for a in budget["actors"]:
                ev=[e for e in facts if e.get("raidId")==raid["id"] and e.get("animalId")==a["id"] and e["type"] in ["AnimalLogicalHit","AnimalLogicalMiss","WorkerHit","WorkerIncapacitated"]]
                assert {e["id"] for e in ev}=={e["id"] for e in a["events"]}
                assert len(ev)==a["spent"]==a["hitsAllocated"]-a["hitsRemaining"]
                c=collections.Counter(); targets=collections.Counter()
                for e in ev:
                    t=e["type"]
                    if t=="AnimalLogicalHit":
                        target=e["presentation"]["target"]
                        kind=target.get("kind") or ("crop" if e["targetId"].startswith("plant-") else "unclassified")
                        category=("shielded-" if e["presentation"]["shield"] else "unshielded-")+kind
                        targets[e["targetId"]]+=1
                    elif t=="AnimalLogicalMiss": category="miss:"+e.get("reason","unspecified")
                    else: category=t
                    c[category]+=1; totals[category]+=1
                actors.append({"id":a["id"],"species":a["species"],"allocated":a["hitsAllocated"],"remaining":a["hitsRemaining"],"consumers":dict(c),"targets":dict(targets),"eventIds":[e["id"] for e in ev]})
            terminal=raid["terminalActors"]
            assert all(a["status"]=="gone" and a["hitsRemaining"]==0 and a["exitDistance"]==0 for a in terminal)
            raids.append({"id":raid["id"],"day":raid["day"],"duration":raid["endElapsed"]-raid["spawnElapsed"],"actors":actors})
        assert totals["unshielded-crop"]==r["counts"]["CropHit"]
        assert sum(totals.values())==r["gates"]["spentStrikes"]
        result["arms"].append({"arm":arm,"reportSHA256":digest(gzip.decompress((d/"report.json.gz").read_bytes())),"consumerTotals":dict(totals),"spent":sum(totals.values()),"allocated":sum(a["allocated"] for raid in raids for a in raid["actors"]),"destroyedCrops":r["counts"]["CropDestroyed"],"planted":r["counts"]["CropPlaced"],"delivered":r["counts"]["CrateDelivered"],"structureHits":r["counts"].get("StructureHit",0),"shieldCommands":sum(c["kind"]=="shield" for c in r["commands"]),"raids":raids,"limitations":["No initial spawn coordinates or full actor paths retained", "No historical crossing of a gap or gate established", "Crop damage is nonzero; lack of negligent defeat is not absence of attack", "Both arms cast shields; neglect omits paid structures/repairs, not all protection", "Event accounting cannot predict a hundred-night outcome"]})
    return result
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("archive",type=Path);p.add_argument("output",type=Path);p.add_argument("--frozen-root",type=Path);args=p.parse_args()
    result=audit(args.archive,args.frozen_root);args.output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps([{k:a[k] for k in ["arm","consumerTotals","allocated","destroyedCrops","planted","delivered","shieldCommands"]} for a in result["arms"]],indent=2))
