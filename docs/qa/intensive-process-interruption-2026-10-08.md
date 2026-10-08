# Intensive campaign process revalidation

During the next goal continuation after main `8b8afc6e`, Win32_Process and
Get-Process no longer identified the four previously monitored intensive node
commands (41304, 41320, 48904, 49032). A first Get-Process snapshot showed a
49032 handle with only 0.02 CPU seconds; a subsequent Win32_Process lookup did
not return that handle. It is not evidence of the historical campaign still
running. The filtered inventory contained no node intensive/check_intensive
command. The Vite/QA servers remained live.

No automatic restart was performed on an observation timeout: these are
authoritative missing process handles. The reason for exit is not established.
The frozen status files must remain historical raw evidence, including any
stale `running` field; none becomes completed just because its process vanished.

In particular, the Gran Río/Etíope frozen matrix status still names PID 48904
and reports its last completed day as 58: money 245258, 1223 living plants,
98 staff, result null. This is an interrupted partial campaign, not victory
or a 100-night acceptance. Existing completed culture results remain separate.

Next campaign work must inspect preserved logs/state/source compatibility and
choose a documented checkpoint continuation or fresh run, retaining these
partial records. Revalidate the responsible farming strategy, current domain
hashes, all 100 nights and the user-approved strictly-below-25% activity metric;
do not infer current-source campaign acceptance from rendering smoke tests.
