"""Extract the exact narration from the supplied source document.

This is a reproducible authoring aid, not a runtime dependency. Pass the DOCX path.
"""

import json
import re
import sys
from pathlib import Path

from docx import Document


ART = [
    "Kintu sits beside his red long-horned cow under an acacia as Nambi descends from luminous clouds",
    "Ggulu blesses Kintu and Nambi amid baskets of seed and animals at the heavenly threshold",
    "Nambi turns back for bird feed; Walumbe follows unseen through a gap between cloud and earth",
    "Kayikuzi pursues Walumbe across open ground toward deep black holes in the earth",
    "Kintu and Nambi mourn together, then press seed into fresh furrows at dawn",
    "centuries later, a drought-stricken village, dry granaries, one seed in a palm",
    "villagers debate the single seed; an elderly woman asks to plant it",
    "the elder waters the planted seed with the last water from her clay vessel",
    "a green sprout emerges; neighbors shade and water it; seed heads develop",
    "rain returns and the entire village sows new fields together",
    "a black-eyed hyena is caught in thorny village wall at night",
    "a child kneels near the wounded hyena while villagers hesitate and a tiny guardian spirit appears",
    "the guardian spirit lights the hyena and dark mist coils out of its eyes",
    "freed hyena sniffs the child's hand before walking toward the savanna",
    "a peaceful hyena pack passes the village; the healed hyena looks back",
    "five communities arrive carrying different seeds, tools, textiles and house-building materials",
    "the five groups argue beside the river and higher ground, each pointing toward a proposed field",
    "a violent storm breaks the riverbank, walls and cultivated fields",
    "five groups cooperate: shelter, redirect floodwater and rescue seed baskets",
    "at sunrise one resilient shared village stands beside receding water",
    "animals gather unusually around an old half-buried river stone at night",
    "black mist leaks from the stone; animals circle it; the tiny guardian spirit hears a call",
    "villagers excavate a carved stone showing a luminous pursuer and a descending shadow",
    "guardian spirit touches the carved stone; a burst of golden light expels the mist",
    "peaceful animals depart; Kayikuzi's name appears as a carved inscription on stone",
    "tiny guardian spirit dreams of a celestial guardian above a sleeping village",
    "dream vision: Kayikuzi pursues Walumbe, then kneels in sorrow beside the earth",
    "Kayikuzi leaves a hidden spark of his own light beneath roots and stones",
    "the spark sleeps through centuries under tree roots, then wakes to a village's cries",
    "the little spirit sees Kayikuzi's promise in itself at dawn and stands with new resolve",
    "hundreds of animals stand frozen in black mist across a steep gorge",
    "the villagers discover an ancient dark echo of Walumbe feeding on fear in the gorge",
    "the little spirit descends into the gorge and its glow nearly vanishes inside the shadow",
    "villagers ring the gorge with torches and sing; the guardian breaks the dark prison",
    "freed animals rush to the savanna; the gorge is quiet beneath a starry sky",
    "after the rescue the guardian's hands turn transparent over the village crops",
    "the elder listens as the fading spirit explains the cost of sealing the shadow",
    "the child cries and holds out both hands to the little guardian with the village behind her",
    "villagers place small oil lamps around crops and sit vigil with the guardian at night",
    "at sunrise the spirit's light is faint but steady; it smiles beside its friends",
    "a ring of dead earth surrounds the last refuge, with darkness threading across it",
    "the elder recalls the last seed and proposes reviving the dead earth",
    "villagers plant, water and rebuild; the tired spirit lends light to buried roots",
    "on the ninetieth night first plants emerge and a golden band pushes the darkness back",
    "the village is now enclosed by living fields and people look toward the final night",
    "on the hundredth night giant shadow rises above fields; animals converge; villagers defend crops",
    "cursed animals awaken when they touch the restored fields and golden harvest light",
    "the little guardian rises high over the village and releases all its light to seal the shadow",
    "dawn after the battle: animals return home; villagers stand in calm fields",
    "the child finds a tiny living light among new shoots and hears the familiar guardian's voice",
]


def main(docx_path: str) -> None:
    paragraphs = [p.text for p in Document(docx_path).paragraphs]
    acts = []
    scene_index = 0
    current = None
    for raw_line in paragraphs:
        line = raw_line.strip()
        match = re.match(r"ACTO ([IVX]+)\s*[—–-]\s*(.+)", line)
        if match:
            current = {"number": len(acts) + 1, "roman": match.group(1), "title": match.group(2), "afterNight": (len(acts) + 1) * 10, "scenes": []}
            acts.append(current)
            continue
        match = re.match(r"([1-5])\.\s+(.+)", line)
        if match and current:
            assert scene_index < len(ART)
            current["scenes"].append({
                "id": f"{scene_index + 1:02d}",
                "act": current["number"],
                "scene": int(match.group(1)),
                "durationSeconds": 10,
                "narrationRaw": raw_line,
                "narration": match.group(2),
                "artDirection": ART[scene_index],
                "image": f"assets/scene-{scene_index + 1:02d}.webp",
                "camera": {
                    "panXPercent": [-0.65, 0.5, -0.35, 0.7, -0.4][scene_index % 5],
                    "panYPercent": [-0.2, 0.25, 0.15, -0.3, 0.2][scene_index % 5],
                    "zoom": [1.045, 1.035, 1.05, 1.04, 1.035][scene_index % 5],
                },
                "layers": [],
            })
            scene_index += 1
        if line.startswith("CIERRE NARRATIVO") and current:
            current["closingRaw"] = raw_line
            current["closingNote"] = line.removeprefix("CIERRE NARRATIVO").strip()
    assert len(acts) == 10 and scene_index == 50
    assert all(len(a["scenes"]) == 5 for a in acts)
    for act in acts:
        for scene in act["scenes"]:
            scene_id = scene["id"]
            scene["layers"] = [
                {"image": f"layers/scene-{scene_id}-background.webp", "depth": 0, "role": "fondo reconstruido"},
            ]
            if scene_id == "01":
                scene["layers"] += [
                    {"image": "layers/scene-01-kintu-cow.webp", "depth": 0.45, "role": "Kintu y vaca, recorte alfa"},
                    {"image": "layers/scene-01-nambi.webp", "depth": 0.9, "role": "Nambi, recorte alfa"},
                ]
            else:
                scene["layers"].append({"image": f"layers/scene-{scene_id}-foreground.webp", "depth": 0.9, "role": "sujeto focal, recorte alfa"})
    manifest = {
        "title": "Wild Guardians: La promesa de los guardianes",
        "source": "Guion narrativo — Segunda versión episódica, octubre de 2026",
        "sourceNote": paragraphs[6],
        "referenceImage": "2-12867.jpg (Kintu, Nambi y vaca; referencia visual)",
        "actCount": 10,
        "sceneCount": 50,
        "acts": acts,
    }
    target = Path(__file__).with_name("cinematics-manifest.json")
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {target}: {scene_index} scenes")


if __name__ == "__main__":
    main(sys.argv[1])
