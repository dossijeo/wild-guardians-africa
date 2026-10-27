# Active quality transition check

Manglares, original daytime fixture, 720p, pthreads, scheduler, actor residency enabled. Four transitions: media/baja/media/baja during a 144 m, 240-frame camera traversal.

```json
{
  "active": {
    "travelWallMs": 11304.15499997139,
    "settledWallMs": 14949.689999938011,
    "postTravelWaitMs": 3645.5349999666214,
    "timingScope": "Wall time includes existing quality correctness diagnostics; no GPU/CPU attribution. Same 240-frame travel protocol.",
    "initialElapsed": 119.99999999999746,
    "elapsed": 134.61818999999863,
    "travelFrame": 240,
    "advancingFrames": 240,
    "pausedFrames": 0,
    "pauseReasons": {},
    "created": 15,
    "stream": {
      "created": 40,
      "discarded": 0,
      "failed": 0,
      "fallbacks": 0,
      "worker": false,
      "asyncPreparation": true,
      "queued": 0,
      "busy": false,
      "preparing": 0,
      "stale": 0,
      "epoch": 0
    }
  },
  "transitions": [
    {
      "quality": "media",
      "transitionMs": 800.4250000715256,
      "maximumRafIntervalMs": 239.9449999332428,
      "diagnosticGetErrorMs": 146.00999999046326
    },
    {
      "quality": "baja",
      "transitionMs": 594.3400000333786,
      "maximumRafIntervalMs": 61.75499999523163,
      "diagnosticGetErrorMs": 124.75
    },
    {
      "quality": "media",
      "transitionMs": 13041.879999995232,
      "maximumRafIntervalMs": 140.35000002384186,
      "diagnosticGetErrorMs": 78.87999999523163
    },
    {
      "quality": "baja",
      "transitionMs": 318.27999997138977,
      "maximumRafIntervalMs": 45.0349999666214,
      "diagnosticGetErrorMs": 54.06499993801117
    }
  ],
  "residency": {
    "enabled": true,
    "demand": 2,
    "retained": [
      "1,0",
      "2,0"
    ],
    "graphicsKeys": [
      "3,0",
      "3,1",
      "3,-1",
      "3,2",
      "4,0",
      "4,1",
      "4,-1",
      "4,2",
      "3,3",
      "4,3",
      "5,0",
      "5,1",
      "5,-1",
      "5,2",
      "6,0",
      "6,1",
      "6,-1",
      "6,2",
      "7,0",
      "7,1",
      "5,3",
      "7,2",
      "7,-1",
      "6,3",
      "7,3"
    ],
    "native": {
      "memoryBytes": 16777216,
      "loadedChunks": 27,
      "residentPropRecords": 341,
      "residentVisiblePropRecords": 7332,
      "loadedSectors": 432,
      "sectorSlots": 432,
      "sectorUpdates": 1184,
      "haloProps": 8
    }
  }
}
```

No unexpected console errors or simulation pauses were recorded. Two native-only chunks remained resident independently of graphical chunks. This is a single correctness run, not an A/B performance comparison. Notice the remaining long presentation intervals and the synchronous diagnostic getError costs; neither should be interpreted as GPU execution time. Transition duration includes asynchronous streaming waits, not continuous main-thread blocking. Production enablement and overhead validation remain pending.
