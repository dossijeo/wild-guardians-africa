# Root review of frozen maize partition design

Reviewed source `ccd88f5cccde9f2bc3bede09f7bdf41818a122c1`. The original proposal, inventory, scripts and receipt are archived unchanged. Root ran `verify.py` in that clean candidate checkout: PASS, reproducing the inventory and checking its input hashes. This is an offline byte inventory, not GPU, memory or loading-time evidence.

The diorama selects maize after parsing full crop libraries. Existing payload totals 40,844,796 bytes; maize geometry and its required images account for 7,382,788 bytes before rebuilt container metadata. Adding a maize subset alongside the full files duplicates resources. A maize/remainder partition with explicit shared texture ownership is the next isolated candidate; it must preserve all 40 states, 32 bridges and full-world readiness gates.

An attempted verifier run from main failed inventory equality because three rendering source hashes differ from the experimental Windows checkout (`loading-diorama.js`, `assets.js`, `scene.js`). All asset inventories and other inputs matched. The verifier regenerates inventory in place; root restored the exact frozen inventory afterward. Reproduction requires the stated candidate checkout, not main. This archive does not promote those experimental runtime changes.

Authorized next work is reproducible offline partition generation and bit-for-bit decoded geometry/attribute validation, with originals retained. Runtime integration, new native CI measurements and promotion require a further review of that evidence. No speed improvement is claimed.
