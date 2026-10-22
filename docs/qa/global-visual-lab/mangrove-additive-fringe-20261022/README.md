# Additive fringe, first attempt

QA-only threshold extension in continuous-grass; original pigment, geometry and all original accepted roots retained. Deterministic noise raises permitted root wear from .25 to at most .40, and footprint wear from .27 to at most .42. Water, object and high-wear exclusions remain. New roots use effective shader wear .06, original roots unchanged. No simulation/mask bytes changed.

24 captures, 12 pose/time/origin matched pairs, no errors or overflow. Full far backgrounds, media, seed712. Close/day, normal/day, close/night inspected. Visible leaf presence is retained, but additions form disconnected bands because the original fringe still shrinks while new roots start near full size. Do not select this form. Follow-up connected fringe remaps effective wear consistently for existing and new roots, without shrinking original leaves.

Run capture-mangrove-additive-fringe-20261022.mjs and compare-mangrove-additive-fringe-20261022.py. Added instances/triangles recorded per pair in comparison.json. No performance claim; no native integration. Existing paths have narrower visual shoulders, requiring gameplay-view review for any accepted successor.
