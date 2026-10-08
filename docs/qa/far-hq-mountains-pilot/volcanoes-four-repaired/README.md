# Repaired volcano silhouettes — candidate

Four built-in imagegen edits preserve the reviewed palette/central peaks and replace detached horizontal flank tongues with continuous illustrated scree slopes. Originals and exact prompts remain in assets-source/far-backdrops-hq; the prior four-cell contract is preserved as volcanoes-four-v1-negative-export-contract.json. No public game assets have changed.

D is 2171×724; one transparent column is added on the right, then all four sources are cropped to 2172×543 from top181 and uniformly resized to960×240. Every original D pixel is preserved before resizing. Sharp schedules extract before extend in a single pipeline: padding is deliberately materialized before extraction.

Run node tools/prepare_mountain_arc_four.mjs .cache/hq-arc-four-volcanoes volcanoes, then repeat into a second directory. Pinned Sharp0.35.5/vips8.18.7/WebP1.6.0 and source/output hashes are verified before writes. Two independent exports are byte-exact: 718398bytes, SHA256 ce51252c27c05f7446edf83e039c9163b753f044eddb94f42608aa5ce1670d5b. Texture remains2048×512 (estimated5.33MiB RGBA8+mips active), one sampler/one mesh; no additional night texture.

20 directed tests pass (backdrop datum, source framing, strict contracts and executable byte-exact export). Source alpha≥90 diagnostics find no clipped peaks or saturated fringes. CPU mip provenance remains a diagnostic with high-LOD inter-cell mixing, not driver sampling proof; color audit does not replace native silhouette/contact review. Four repaired sources reach lower image edges more broadly, so native day/night/yaw/movement review is still required. Do not promote these candidates solely on CPU audit.
