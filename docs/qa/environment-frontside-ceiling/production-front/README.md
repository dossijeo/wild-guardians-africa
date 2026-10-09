# Production activation — 9 October 2026

The user reviewed the paired images, accepted their appearance, and explicitly
authorized production activation for all biomes. Commit `5e51cf45` enables
FrontSide color and shadowSide on all native biome prop materials and the private
solid prop-shadow material. This covers trees, shrubs, grass, rocks and debris;
terrain, buildings, actors and the separately integrating V4 crops are unchanged.
No geometry, texture, shader recipe, placement, navigation or save format changes.

37 directed tests pass, including all 120 materials / 360 original LODs,
shadow lifecycle/cache and alpha/depth/volcanic recipes. Inline syntax checks pass
for 157 tracked QA pages / 152 scripts. The native smoke test visits all six
biomes and records original production material sides plus actual color/shadow
Front/BACK/CCW draw witnesses, screenshots, consoles and released contexts.
Run `node docs/qa/environment-frontside-ceiling/production-front/verify.mjs`.
This daytime fixed-view smoke coverage does not imply exhaustive all-angle/night
visual acceptance or new performance measurements in the four other biomes.

Local builds failed twice before packaging finished: the final closeBundle
cleanup reported ENOENT for a missing copied GLB. Disk inspection showed only
~200 MB free against ~980 MB of public source assets, later down to ~24–43 MB.
The incomplete copy cannot be treated as a passed build. Automatic approval
review rejected deleting root's regenerable `dist` / `.cache/web-assets-qa`,
including an exact verified absolute `dist` path, with only a policy-block reason.
Nothing was deleted and no alternative deletion mechanism was attempted.
After external disk space became available, root completed the local build on
`e20bf93a`: terminal exit 0, 12.19 seconds, with the existing large-bundle warning.
The web package check passed: 702 files, 403,054,709 bytes, 859 relative links
and 20 runtime GLBs. `python tools/package_itch.py` then completed with exit 0:
353,076,406-byte ZIP, CRCs verified. This closes the local build/package gate;
CI and the separate crop/loading feature acceptance remain independent.

Original unrepaired AB/BA reports and six visual pairs remain unchanged in the
parent directory; their `productionActivation:false` receipt records the scope
of that earlier experiment, not the subsequent authorized activation.
