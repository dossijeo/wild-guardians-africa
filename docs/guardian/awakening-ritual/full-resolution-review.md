# Full-resolution tower review and planning cost — 2026-10-29

The eight-view QA sheet now retains original 1600x900 arrival frames. Click a column to inspect its day/night image, click the detail to return; reload to reset the inspection. It also measures 20 planning calls after one discarded call per view. This is a warm sequential microbenchmark, not paired before/after frame-performance evidence. PNG encoding and rendering occur outside the measured call; no production instrumentation is added.

Full-resolution [day](tower-detail-day.png) and [night](tower-detail-night.png) inspection confirms that the lateral fallback leaves the entire Guardian silhouette separate from the roof at the sampled 0.9s pose. Earlier miniature-only uncertainty is resolved for this pose. The target itself remains behind the building in this fixed QA camera; no claim that every part of the ritual is visible, or that animation transitions have been reviewed. The six other arrival samples and all eight disappearance checks remain clean.

[Raw timings and UI](planning-timings-ui.txt). Easy-view planning median ranges 0.05–0.30ms. Tower-view median is 7.675ms day / 4.95ms night, p95 10.605 / 7.735ms, maxima 11.225 / 8.13ms. Differences between day/night runs are not attributed to lighting: order, warmup and scheduling are uncontrolled. These costs motivate pruning of elevated-candidate visibility queries; global performance remains unaccepted. Baseline engine work remains outside this task.

Syntax/whitespace checks pass. This commit changes only the browser inspection tool and evidence, not production behavior. Next work: reduce emergency planning cost while preserving selected positions and verify with comparable component measurements.
