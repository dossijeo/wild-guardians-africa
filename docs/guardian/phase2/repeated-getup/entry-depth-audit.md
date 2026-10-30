# Entry depth stress audit

This audit deliberately raises a planar floor under the installed rhino standing snapshot by 2, 5, 10 and 20 cm. It exercises AuthoredBeastRecovery at 120, 60, 30 and 10 updates/s. It is synthetic: it does not establish that native falls enter recovery at these depths, and measures the lowest sampled surface envelope, not hip speed or anatomical motion.

All 16 cases converge to +1 cm sampled clearance by the end of entry. The endpoint is cadence independent; the maximum visible step is not. With a 20 cm initial overlap and 100 ms updates, the support envelope advances 15.56 cm in one update. With 2 cm initial overlap the corresponding step is 2.22 cm. At 30 updates/s the 20 cm case still advances 6.81 cm in one update.

The existing 150 ms correction is appropriate only as a short exit from small residual solver overlap; this evidence does not justify treating it as a general deep-penetration solution. Extending its duration would keep the animal inside the terrain longer. No production timing was changed on this synthetic evidence. Further work should measure actual physical-to-recovery entry depths beside terrain/solids and correct collider support if large overlaps occur, rather than hide them with a longer animation transition.

Reproduce: node tools/guardian/audit-recovery-entry-depth.mjs
Raw results: entry-depth-audit.json. No graphical or performance acceptance is claimed by this diagnostic.
