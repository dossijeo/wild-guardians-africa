# Lower mantle edge inspection

Rendered the current editable source with Idle, Float and Mantle_Breeze enabled at frame 13. The camera targets the evaluated midpoint of vertices 98 and 10610, the maximum sampled Idle edge in ../current-edge-details.json. Source SHA-256: 19c20eca661bbab8c605557a151e9cf4d70d9c6c5e06d5c400379ddf303225df.

Inspected front.png, side.png and back.png individually. This region is the lower hem, not the torso attachment. No visible opening or torn surface appears in these three views at this pose. The thick, rounded hem remains visually prominent; this inspection does not establish that it reads as light cloth in motion. The measured 27.14-to-41.89 mm edge extension is real, but these images do not justify a blind weight smoothing change. No production model, weights or animation changed.

Reproduce from the repository root with Blender in background mode and tools/guardian/render_guardian_mantle_review.py. It opens the source independently for each camera and renders without saving it. These are offline close-ups, not browser validation, an intersection audit or continuous-motion acceptance. Review the moving silhouette and cloth phase offsets in the installed model before deciding whether to modify hem geometry or animation.
