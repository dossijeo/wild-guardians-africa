# Native depth preparation attribution, fe1097da

A single existing fixture run used phase-attribution and measurement, without frame-slack or GPU queries. All raw intervals are retained. Initialization took 11,533.2 ms and controls 15,582.0 ms; 849 RAF intervals include maximum 132.8 ms, four over 50 ms and one over 100 ms. Errors and warning/error console were empty. Logical and camera checks passed; renderer disposed with context loss, tab closed and browser inventory empty. No causal before/after or performance acceptance is claimed.

The 24 unchanged depth batches submitted 54.5 ms of synchronous work in total (maximum 8.6 ms), awaited programs for 79.3 ms (maximum 23.6 ms), and awaited their existing frame barriers for 326.0 ms (maximum 16.8 ms). Program and frame elapsed waits are not exclusive CPU; nested observations must not be summed twice. This identifies frame delivery cost but does not authorize removing barriers or promoting adaptive scheduling. The final hardware fence remains separate.

Diorama preparation recorded sky 169.5 ms, catalogues 29.3 ms, maize model 242.4 ms, soil texture 49.7 ms, crop construction 194.1 ms, shader recipes 32.1/11.7/12.1 ms, maize/soil upload 70.4 ms, mist upload 2.0 ms, day/night sky warm 6.6 ms and final fence 30.0 ms. The fixture starts preparation at Run, so it cannot establish overlap with the real menu animation. Actual parent menu lifecycle receipts are available for a subsequent integrated observation; they are not an iframe click timestamp or permission to subtract preparation from total player wait.

The historical current-main strict readiness around 7.2 seconds remains materially lower. The regression gate stays open. Frame-slack and zero-vertices remain opt-in QA experiments.
