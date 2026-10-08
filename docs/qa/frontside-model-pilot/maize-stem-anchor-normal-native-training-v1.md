# Native anchor-normal restoration rejection

Status: **REJECTED before FrontSide**, one TRAINING sample of frozen `fa4a03bd`, native tab 780 closed after export. Original/indexed controls are exact. The attribute-restoration archive is `1a0b22844303e38748162a03c2cdb333e671caccd092de68cd3926e78262a8e8`; no original asset changed.

Both derived DoubleSide arms fail with the same alpha changes as the preceding 658 derivative: 55 missing, 193 added, 13 missing and 149 added beyond one pixel. RGB MAE is 0.0021154398879 (one group) / 0.0021150753851 (two groups); maximum tile MAE is 0.1414755117135 and the largest RGB region contains 1268 pixels. The previous 658 field had MAE 0.00224052745 and tile 0.14401417527. This small improvement does not satisfy the gates, repair the silhouette or prove a general cause of the remaining differences.

Three original controls and indexed-original arm pass exactly. Quantitative thresholds, source policy and the source pose are unchanged. Soil/leaves, P/UV, forward winding and topology remain the original 658 candidate values; only 1738 unique-anchor normals changed. Four ambiguous and 232 unmapped corners still retain that candidate field. No FrontSide draw, bridge repair, held-out acceptance or GPU benefit is claimed.

Root reports console warning/error lists empty. Its complete suite ended 3153 PASS; four campaigns 20024/49032/41320/41304 remained in the pre-draw inventory. No timing was measured. Report, comparison PNG, browser screenshot and contract analysis are retained separately, preserving prior 658 and .75 negatives.
