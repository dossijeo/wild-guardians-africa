# Runner evidence retention repair (not a campaign rerun)

The original incomplete pilot remains frozen in this directory. Its missing
terminal state and strike/repair details cannot be reconstructed. No subsequent
campaign or neglect arm has been executed.

`retainHordeCase` now persists native-report/native-state gzip payloads before
invoking the auditors. A post-simulation exception keeps the result already
returned. A simulation exception keeps its partialReport when available, and a
pre-state exception remains explicitly incomplete without manufacturing state.
Final report/status are annotated after source-hash checks so a changed source
cannot leave a contradictory successful report. Hashes cover raw and annotated
payloads. CLI policy and simulation are unchanged; controlled dependencies are
only an exported evidence-boundary test seam.

Five bounded tests use actual paid native opening states, not a campaign:

- post-simulation strict-audit failure preserves pre-audit bytes and state;
- simulation failure preserves original partial state and error;
- pre-state exception produces no state payload;
- source change retains its preceding audit failure and incomplete status;
- successful auditing with false gates preserves the false gates.

Command: `node --test tests/horde-defense-evidence-retention.test.js`.
Observed 5/5 PASS, exit 0, suite 1234.959 ms. A later unused import removal has
no behavioural effect and is explicitly recorded rather than relabelling the
executed source hash. No GPU/frame-time/performance acceptance is claimed.

Strike auditing, economic parameters, original simulation/policy, FIFO,
reservations, navigation, quotas and clock have not changed in this repair.
Worker encounter strike consumption is a separate source-grounded diagnostic
and must be reviewed/tested in a separate change. It does not establish the
numeric discrepancy of the lost original report.
