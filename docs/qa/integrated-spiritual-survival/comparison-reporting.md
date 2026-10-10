# Native campaign comparison artifacts

`tools/plot_native_campaign_comparison.py` reads retained native reports without executing, advancing or altering campaigns. It produces JSON summary, daily CSV, PNG and SVG for money, living crops, cumulative destruction and actual paid walls/repairs. Source hashes, seed, biome, culture, labour policy and rule-policy settings must match; incomplete receipts, truncated daily evidence and unreconciled ledgers are rejected. It refuses to overwrite existing artifacts. Seven integrity tests pass.

Reproduction example:

```powershell
python tools/plot_native_campaign_comparison.py --out docs/qa/integrated-spiritual-survival/FRESH_NAME docs/qa/integrated-spiritual-survival/pilot-v10-bad-sabana-712-fourteen docs/qa/integrated-spiritual-survival/pilot-v10-no-shield-sabana-712-fourteen
python tests/test_native_campaign_comparison.py
```

Matplotlib is a QA-only local dependency, not included in the game build. Existing reports and snapshots are the authoritative inputs. The seven-night v9 chart and fourteen-night v10 control chart were inspected as rendered PNGs; chart QA does not constitute game visual QA or a performance benchmark. The v2 control chart uses a zero baseline for zero defensive spending; the original exploratory chart remains retained locally. It does not change any campaign values.

## Fourteen-night control evidence

- Bad management: 35 coins, 217 live crops, 176 crops destroyed cumulatively. No native defeat has occurred yet.
- Productive agriculture without walls or shield: 1,315 coins, 276 live crops, 202 crops destroyed cumulatively. The farm remains economically viable through night fourteen.

Both observed horizons are terminal and exactly reconciled. They use identical source hashes. The paired protected campaign is still running when this report is recorded and is not included in these completed-control artifacts. Do not infer its final result from an intermediate day or restart its process on a polling timeout. These results do not approve 100-night balance, postgame pricing or the less-than-25% manual inactivity target. The control with good production still makes money without defenses, which must be examined in the next calibration stage after the protected run and further short-horizon evidence.
