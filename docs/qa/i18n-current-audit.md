# Current gameplay translation audit

Reviewed on 2026-10-04 against main after 0d8f2c5.

The regenerated source inventory contains 3,280 presentation candidates. Candidates include identifiers and internal metadata; their count is not a claim that every literal is a player-facing sentence. The reviewed TSV contains 1,553 English/Spanish entries and matches the generated catalog.

All current tutorial messages, including Shield/Growth/Multiply reminders, have complete entries. Current hiring explanations use 30/40 coins; optional purchases reserve 30. The acceptance audit's current override fields now record 30; older narrative evidence retains its historical values.

`node --test tests/i18n.test.js`: 12/12 passed. Added coverage translates the actual hiring dialog's wage paragraph and all eight rendered hiring stepper labels, plus damaged-wall refund amounts and the current reserve warning. Existing checks cover tutorial completeness, agricultural notices, interpolation, singular/plural, language detection and catalog generation.

No missing gameplay translation was identified in the current source audit. The partial source fragments `Eliminar muralla · +` and `una` are translated as parts of their complete dynamic messages; internal balance provenance strings do not appear in gameplay. This source/domain audit does not certify visual fit of every English screen or embedded text in illustrations.
