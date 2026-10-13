"""Isolated OpenCL QA kernel on terrain samples from a real perimeter proof.

Uses float32 because the available Intel UHD OpenCL device has no fp64. The
caller may replay a result only after exact comparison with native CPU output.
"""
import gzip
import json
import math
import os
import sys
import time
from pathlib import Path

import numpy as np
import pyopencl as cl

source_path, result_path, report_path = map(Path, sys.argv[1:4])
with gzip.open(source_path, "rt", encoding="utf-8") as stream:
    samples = json.load(stream)
heights = np.asarray([item["heights"] for item in samples], dtype=np.float32)
cpu_start = time.perf_counter()
cpu_flags = []
for item in samples:
    h = item["heights"]
    cpu_flags.append(all(math.hypot(h[k] - h[k + 1], h[k + 2] - h[k + 3]) / 1.6 <= 0.5 for k in range(0, 20, 4)))
cpu_ms = (time.perf_counter() - cpu_start) * 1000
assert all(a == bool(b) for a, b in zip(cpu_flags, (item["cpuSlopeValid"] for item in samples)))
try:
    platforms = cl.get_platforms()
except cl.LogicError:
    platforms = []
platform = next((p for p in platforms if any(d.type & cl.device_type.GPU for d in p.get_devices())), None)
device = next((d for d in platform.get_devices() if d.type & cl.device_type.GPU), None) if platform else None
if os.environ.get("OPENCL_QA_FORCE_CPU") == "1" or device is None:
    results = [{"key": item["key"], "value": value, "accepted": value == item["nativeResult"]}
               for item, value in zip(samples, cpu_flags)]
    result_path.write_text(json.dumps(results, separators=(",", ":")), encoding="utf-8")
    report = {"backend": "cpu-fallback", "device": device.name if device else None,
              "sampleCount": len(samples), "cpuSlopeMs": cpu_ms,
              "replayAccepted": sum(item["accepted"] for item in results),
              "note": "No OpenCL GPU required; unmatched terrain conditions use the full native CPU path."}
    report_path.write_bytes((json.dumps(report, indent=2) + "\n").encode("utf-8"))
    print(json.dumps(report))
    sys.exit(0)
context = cl.Context([device])
queue = cl.CommandQueue(context, properties=cl.command_queue_properties.PROFILING_ENABLE)
program = cl.Program(context, r"""
__kernel void slope5(__global const float *h, __global uchar *out) {
  int i = get_global_id(0);
  int base = i * 20;
  uchar valid = 1;
  for (int j = 0; j < 5; ++j) {
    int k = base + j * 4;
    float dx = h[k] - h[k + 1];
    float dz = h[k + 2] - h[k + 3];
    if (sqrt(dx * dx + dz * dz) / 1.6f > 0.5f) valid = 0;
  }
  out[i] = valid;
}
""").build()
kernel_function = cl.Kernel(program, "slope5")
flags = np.empty(len(samples), dtype=np.uint8)
input_buffer = cl.Buffer(context, cl.mem_flags.READ_ONLY, heights.nbytes)
output_buffer = cl.Buffer(context, cl.mem_flags.WRITE_ONLY, flags.nbytes)
kernel_function.set_args(input_buffer, output_buffer)

def gpu_pass():
    start = time.perf_counter()
    upload = cl.enqueue_copy(queue, input_buffer, heights)
    kernel = cl.enqueue_nd_range_kernel(queue, kernel_function, (len(samples),), None, wait_for=[upload])
    download = cl.enqueue_copy(queue, flags, output_buffer, wait_for=[kernel])
    download.wait()
    return {
        "totalMs": (time.perf_counter() - start) * 1000,
        "uploadMs": (upload.profile.end - upload.profile.start) / 1e6,
        "kernelMs": (kernel.profile.end - kernel.profile.start) / 1e6,
        "downloadMs": (download.profile.end - download.profile.start) / 1e6,
    }

measurements = [gpu_pass() for _ in range(7)]
results = []
for item, gpu_value, cpu_value in zip(samples, flags, cpu_flags):
    exact = bool(gpu_value) == cpu_value == item["nativeResult"]
    results.append({"key": item["key"], "value": bool(gpu_value), "accepted": exact})
result_path.write_text(json.dumps(results, separators=(",", ":")), encoding="utf-8")
report = {
    "device": device.name, "platform": platform.name, "fp64Supported": bool(device.double_fp_config),
    "sampleCount": len(samples), "inputBytes": int(heights.nbytes), "outputBytes": int(flags.nbytes),
    "cpuSlopeMs": cpu_ms, "gpuPasses": measurements,
    "gpuVsCpuSlopeMismatches": sum(bool(v) != c for v, c in zip(flags, cpu_flags)),
    "gpuVsNativeTerrainMismatches": sum(bool(v) != item["nativeResult"] for v, item in zip(flags, samples)),
    "replayAccepted": sum(item["accepted"] for item in results),
    "note": "The CPU has already generated 20 float64 heights per point. This measures only batched slope reduction and transfer, not terrain generation, colliders, pathfinding, or a production GPU acceleration. Rejected points use native CPU fallback."
}
report_path.write_bytes((json.dumps(report, indent=2) + "\n").encode("utf-8"))
print(json.dumps({k: report[k] for k in ("device", "sampleCount", "cpuSlopeMs", "gpuVsCpuSlopeMismatches", "gpuVsNativeTerrainMismatches", "replayAccepted")}))
