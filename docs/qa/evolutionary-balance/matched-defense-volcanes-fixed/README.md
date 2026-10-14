# Volcanes/907 continuous replay with live-centre raid-view patch

This is an isolated diagnostic branch based on evolutionary lab `7a3df5c4` plus the runner patch cherry-picked from `84ce9f10` as `4b7d39ca`. Only the `matched-no-walls-current-magic` arm was replayed from day 1 with frozen default v2 genes and a 60 s daily `Game.tick` cost ceiling. The source hash and inputs are in `stamp.json`. The report is `no-walls-shield.json.gz` (SHA-256 `a0331e33b8134545a0a5ef9495e0828e0fb73ed6c00fdfc752edce93451144de`).

Days 1–9 reproduced the prior cash, living plants, and losses exactly. Day 10 still returned `Native raid entry failed`, despite the live-centre view patch and a passing isolated entry fixture. This remains a **technical failure**, not an economic/military defeat. The result means the fixture alone does not validate a continuous campaign fix; no balance or genes were changed, and the patch must not be credited with resolving this case yet.
