# Cache bypass diagnostic

One sequential pair, not ABAB. Cache-on reused2/1694 attempts; bypass0/1734. CPU World.render P95 fell18.90 to15.58ms, P9923.925 to21.175ms. GPU P9527.064 to26.809ms. Presentation P95 about49.87ms and P99 about66.4ms in both. No demonstrated global benefit. Shadows remain rendered; bypass only disables snapshot/cache comparison. Next repeat A/B/A/B before designing an adaptive policy. Permanent disablement would penalize static scenes and is not proposed.
