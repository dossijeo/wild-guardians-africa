# Protected2026: cash growth does not imply stable crop inventory

The new read-only census audit reconciles the retained snapshot with native
aggregate CropPlaced, CropPicked, CropDestroyed and CrateDelivered counts.
Every crate has one unique harvested source plant. Daily picked counts are
derived from population conservation and reconciled with the whole-campaign
native pickup total; they are explicitly labeled as inferred daily counts.
No cash, growth, attack or campaign state is changed.

| Terminal horizon | Coins | Living | Seed replacement cost | Base harvest potential |
| ---: | ---: | ---: | ---: | ---: |
| 14 | 574 | 192 | 1,128 | 2,616 |
| 21 | 683 | 101 | 561 | 1,279 |

Replacement cost and base harvest potential are inventory descriptions, not
spendable money, guaranteed income or ledger credits. Between15 and21 the
farm plants933 new crops, picks801 and loses223 to real attacks. Thus
192+933−801−223=101. Every one of those801 crates is actually delivered;
no missing delivery backlog explains the population decline.

Cash rises109 while live seed replacement value falls567. Their combined
reference value decreases458. This is not a formal profit statement or a
claim that crops can be sold for seed value. It demonstrates why cash alone
would misrepresent the retained production base.

Terminal crop mix is2,278 millet purchases and53 cassava purchases. Millet:
93 alive,1,829 picked,356 destroyed. Cassava:8 alive,44 picked,1 destroyed.
These lifetime counts are not exposure-normalized species vulnerability rates.
The current cashflow policy therefore mostly tests millet, not equally mixed
use of all eight crops or every possible productive player policy.

Before weakening attacks, investigate actual wall breaches/maintenance and
labor/crop choices. A useful one-factor follow-up is existing empalizada
instead of zarzas:20 versus10 cost,200 versus100 HP,120 versus60 gate HP.
Those are unchanged production prices/resistances, not newly tuned values.
The proposed follow-up must use actual paid purchases and the identical
generator, magic, worker profile and other decisions. No defense multiplier,
free upgrade, crop quota or damage reduction is authorized by this diagnostic.

Evidence is `pilot-v32-plant-census-audit.json` and the reproducible
`tools/audit-native-plant-census.mjs`. The same audit also passes four native
defeat snapshots, checking zero living populations and paid-delivery accounting.
Do not approve100/180 nights from the short census reconciliation.
