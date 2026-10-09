# Young FrontSide growth continuity candidate

The new fixture is separate from the frozen static viewer8ebe used for925–927.
It uses the same Blender payload and shared reverse geometry as those views,
with original native bridges retained. The four batches are original Double,
indexed original Double, forward derived Double and shared reverse Front. Only
the young native phase receives the geometry override. Shadow depth remains
DoubleSide, isolated from colour culling for this phase.

Run each fixed seam separately:

`http://127.0.0.1:5284/tests/browser/frontside-crop-young-leaf-front-continuous.html?seam=0&mode=closeup&night=0`

`http://127.0.0.1:5284/tests/browser/frontside-crop-young-leaf-front-continuous.html?seam=1&mode=closeup&night=0`

After `#run` is enabled, click once to prepare and play16 seconds. Observe the
actual live playback if documenting motion; a filmstrip alone only supports its
five saved moments. `#stop` cancels and cleans up. The fixed camera cannot be
controlled by scrolling. This is a nine-plant QA plot with native material,
wind, sky and shadows over a simple receiver, not complete gameplay WorldScene.

Incoming seam0 crosses source stage0→bridge→young; outgoing seam1 crosses
young→source bridge→stage2. CPU runtime inputs were checked over66 updates in
`front-runtime-contract.json`, but that does not prove native GPU upload. Wind
clock advances with native elapsed playback time. Source geometry phase labels
remain `original` for the derived active young stage; actual target activity,
resources and colour witnesses identify the override.

Two preparation rows retain original/original and original/forwardDouble
controls. For seam0 the young override is inactive during those initial controls;
they must not be presented as a visible Double derivative comparison. The next
five rows retain requested growth landmarks and actual elapsed growth state.
Both columns use the same logical input. Numeric policy2 remains diagnostic;
policy3 requires perceptually convincing leaves/form/growth without visible
defects. Root AI observation is not human-user acceptance.

The fixture collects GL culling state only during the five saved growth frames.
When the young target is active, all three colour groups must report FrontSide,
BACK culling and the explicit source DoubleSide shader definition. When a source
bridge or another stage is active, no young target colour draw is expected. GL
state reads are diagnostic instrumentation, not included in any timing campaign.
Shadow draw witnesses and colour witnesses are separate.

POST `/__frontside_report` writes a distinct prefix per seam/mode/night:
`crop-young-leaf-front-continuous-seam0-closeup-day-selection.json` and its
`-last-frame.png`, with corresponding seam1 files. Retain receipts before repeat
captures. The full atlas is1280×5040, two preparation rows plus five moments;
its last row is the last requested landmark, not the16-second final frame.

The export preflight uses synthetic placeholders to validate transport only; it
does not create a context, draw or write native artifacts. This freeze has no
native Front continuity acceptance yet, no Front shadow acceptance, no young
resident-resource approval and no young netGPU benefit. Mature maize gain is not
inherited. Original assets remain unchanged and no category/PR is approved.
