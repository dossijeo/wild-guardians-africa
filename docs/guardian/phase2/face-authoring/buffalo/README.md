# Buffalo facial authoring baseline

Active source: `public/assets/0c77a268cc0a7d22c66dedb7a471a66a414437f39e6bdfbc60c75dc36acf7920.glb`. No buffalo geometry or catalog entry has been edited yet.

The head and mouth directories contain four actual Blender inspection views each. Front and side mouth views were inspected. The lip seam is immediately below the muzzle, above the pointed beard; the beard tip and necklace teeth must not define the incision. No exposed oral teeth are visible in these closed-mouth views. Preserve the white muzzle markings and distinguish them from actual teeth. The collar teeth belong to the necklace and must remain independent of jaw opening.

`landmark-requests.json` records provisional image picks; `landmarks.json` raycasts those exact pixels onto the original mesh. The initial mouth seam samples are around world Blender Z 1.677–1.680 m, Y -0.460 to -0.383 m. These are initial anchors, not a complete incision curve. Refine the commissures against the mouth close-ups before cutting.

Topology differs substantially from the warthog: the imported mesh has 46,976 split vertices, while a disposable weld produces 7,889 vertices in one connected component. A whole-component jaw selection would therefore deform unrelated body and accessories. Author a local surface mask and inspect articulation/biconnected regions before assigning deformation. The production mesh was not welded.

Only 436 imported vertices exceed 0.7 Head weight, making the automatic head-weight inspection frame too tight (the `original` directory records this). The explicit head frame and mouth frame supersede it for anatomical inspection. Do not infer the complete facial skin weights from that count; inspect them before binding lids or jaw.

The inspection helper now resolves its output directory absolutely before assigning Blender render paths, preventing relative render paths from escaping the requested workspace directory. All images in this report are copied/saved in the repository.
