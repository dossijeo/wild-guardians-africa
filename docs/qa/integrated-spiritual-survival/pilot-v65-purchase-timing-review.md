# Native passive replant timing replay

The seven-night seed-712 passive replay uses the same runtime hashes as v64.
Every full daily row matches exactly. The only added source is a read-only
callback wrapper buffering post-decision scalar observations on days 6 and 7.
No action, price, damage, RNG, task or worker behavior changes.

## Observed cause

Day 6 starts after a paid 210-coin contract with 2 coins and a 1,000-coin
unfinished defensive contour. Its strategy purchases 540 coins of real walls
that day. At no daylight decision does post-decision cash cover wages, the
remaining wall reserve and one five-coin seed together.

Day 7 starts with 77 coins and 460 coins of remaining wall construction.
The contour finishes during the day. The strategy replants eleven crops.
At approximately time 140 its balance is 211, just below the protected
210-coin payroll plus a five-coin seed. It remains there through time 279.
At time 290 cash is 244, but the strategy's last-twenty-shift-seconds buying
cutoff has already taken effect. At time 299 cash is 299 and two crops remain.
The final horizon has 332 coins and zero crops after actual deliveries.

All eight daylight observations before time 280 with sufficient post-decision
funding have reason `active`; none have reason `budget`. This does not prove
every historical placement point was valid, but the trace provides no evidence
of a funded idle buying decision. The terminal read-only probe independently
finds legal replant access. The empty field is therefore explained by paid
defensive investment, protected payroll and the strategy's planting cutoff,
not demonstrated native insolvency or unreachable plots.

The trace does not measure GPU/CPU performance or human activity. It does not
approve magic dependence, a balanced passive strategy, or hundred-night survival.

Next pilot: existing Q12/Q10 empty-field forecast, with the same elder profile,
prices, military configuration, crop policy, defenses and no agricultural magic.
It can choose an affordable native crew at dawn using available cash and paid
repair obligations; no money, crop, worker or time is fabricated. Compare the
first seven days before interpreting recovery after the empty-field snapshot.
