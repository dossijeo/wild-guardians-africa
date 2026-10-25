"""Transfer a village texture between audited UV layouts, preserving 2048² size."""
from pathlib import Path
import sys

import cv2
import numpy as np
from scipy.ndimage import distance_transform_edt


source_path, transfer_path, output_path = map(Path, sys.argv[1:4])
source = cv2.imread(str(source_path), cv2.IMREAD_COLOR)
if source is None:
    raise RuntimeError(f"Cannot read {source_path}")
transfer = np.load(transfer_path)
size = 2048
target = np.zeros((size, size, 3), dtype=np.uint8)
coverage = np.zeros((size, size), dtype=np.uint8)


def image_uv(uv):
    # Assets.texture() uses flipY=false: UV v=0 addresses the atlas top row.
    return np.column_stack((uv[:, 0] * (size - 1), uv[:, 1] * (size - 1))).astype(np.float32)


source_uv = image_uv(transfer["source_uv"])
target_uv = image_uv(transfer["target_uv"])
for triangle in transfer["triangles"]:
    source_tri, target_tri = source_uv[triangle], target_uv[triangle]
    sx, sy, sw, sh = cv2.boundingRect(source_tri)
    dx, dy, dw, dh = cv2.boundingRect(target_tri)
    if min(sw, sh, dw, dh) <= 0:
        continue
    sx, sy, dx, dy = max(sx, 0), max(sy, 0), max(dx, 0), max(dy, 0)
    sw, sh = min(sw, size - sx), min(sh, size - sy)
    dw, dh = min(dw, size - dx), min(dh, size - dy)
    if min(sw, sh, dw, dh) <= 0:
        continue
    matrix = cv2.getAffineTransform((source_tri - [sx, sy]).astype(np.float32), (target_tri - [dx, dy]).astype(np.float32))
    pixels = cv2.warpAffine(source[sy:sy + sh, sx:sx + sw], matrix, (dw, dh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    mask = np.zeros((dh, dw), dtype=np.uint8)
    cv2.fillConvexPoly(mask, np.rint(target_tri - [dx, dy]).astype(np.int32), 255)
    target_slice = target[dy:dy + dh, dx:dx + dw]
    target_slice[mask > 0] = pixels[mask > 0]
    coverage[dy:dy + dh, dx:dx + dw][mask > 0] = 255
for _ in range(4):
    grown = cv2.dilate(coverage, np.ones((3, 3), np.uint8))
    expanded = cv2.dilate(target, np.ones((3, 3), np.uint8))
    target[(grown > 0) & (coverage == 0)] = expanded[(grown > 0) & (coverage == 0)]
    coverage = grown
# Thousands of tiny islands are heavily minified in game. A black atlas
# background otherwise bleeds through mipmaps even when triangle centers match.
missing = coverage == 0
nearest = distance_transform_edt(missing, return_distances=False, return_indices=True)
target[missing] = target[nearest[0][missing], nearest[1][missing]]
cv2.imwrite(str(output_path), target, [cv2.IMWRITE_WEBP_QUALITY, 95])
print(f"Rasterized {output_path}; covered={np.count_nonzero(coverage)} pixels")
