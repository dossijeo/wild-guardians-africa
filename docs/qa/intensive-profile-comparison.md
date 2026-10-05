# Intensive comparison of ordinary worker hiring choices

Run `node tools/check_intensive_profiles.mjs 20 OUTPUT_DIRECTORY` to compare the
four approved worker profiles on Sabana/Mapungubwe, seed 712, mixed crops, with
ordinary proportional daytime hiring. The comparisons run sequentially in a
single Node process so all four use the same loaded gameplay modules. The
existing biome/culture campaign tests and their default strategy are unchanged.

Every profile uses the normal seed purchases, FIFO tasks, watering, physical
harvest transport, wages, spells, terrain, damage and random generator. The
existing labour and maintenance reserves remain enabled. No gameplay parameter
is overridden. Changes in worker choice naturally change subsequent decisions
and random-number consumption; this is not an identical-raid causal experiment.

The command preserves source hashes, per-day progress, report, complete state
and economic/crop/activity summary for each profile. It audits actual deliveries
and integer ledger conservation. A failure remains recorded with its snapshot,
sets a nonzero exit status and does not stop the remaining comparisons. An
existing comparison directory is rejected rather than overwritten. Twenty
nights are a diagnosis, not evidence of hundred-night campaign victory.

The one-night command check completed with all four profiles and physical
deliveries; refusal to overwrite that same directory was also verified. The
twenty-night comparisons are pending. Their purpose is to inform labour cost,
expansion, expensive crop losses and time without actions before changing the
game economy, not to replace the original failed or ongoing campaign evidence.
