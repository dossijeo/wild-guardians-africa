import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

spec = importlib.util.spec_from_file_location('extractor', Path(__file__).resolve().parents[1] / 'tools/extract_loading_visual_evidence.py')
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


PNG = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\x00\xff\xff\xff\xff')) + chunk(b'IEND', b'')


class ExtractionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'report.json'
        self.output = Path(self.temp.name) / 'frames'
        self.frame = dict(label='initial', width=1, height=1, progress=.12, night=True, plants=[], png='data:image/png;base64,' + base64.b64encode(PNG).decode())

    def write(self, frames):
        self.source.write_text(json.dumps({'ok': False, 'errors': ['World not ready'], 'checks': {'loadingVisual': {'frames': frames, 'errors': [], 'cancelled': True}}}), encoding='utf-8')

    def test_preserves_bytes_failure_and_scope(self):
        self.write([self.frame])
        original = self.source.read_bytes()
        receipt = extractor.extract(self.source, self.output)
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual((self.output / 'initial.png').read_bytes(), PNG)
        self.assertEqual(receipt['sourceSha256'], hashlib.sha256(original).hexdigest())
        self.assertFalse(receipt['sourceOk'])
        self.assertEqual(receipt['sourceErrors'], ['World not ready'])
        self.assertNotIn('png', receipt['frames'][0])
        self.assertIn('excludes HTML UI', receipt['scope'])
        with self.assertRaises(FileExistsError):
            extractor.extract(self.source, self.output)

    def test_invalid_frames_leave_no_output(self):
        for frames in ([], [self.frame, self.frame], [{**self.frame, 'label': '../escape'}], [{**self.frame, 'width': 2}], [{**self.frame, 'png': 'data:image/png;base64,broken'}]):
            with self.subTest(frames=frames):
                self.write(frames)
                with self.assertRaises(ValueError):
                    extractor.extract(self.source, self.output)
                self.assertFalse(self.output.exists())

    def test_crc_corruption_rejected(self):
        broken = bytearray(PNG)
        broken[20] ^= 1
        with self.assertRaisesRegex(ValueError, 'CRC'):
            extractor.png_dimensions(broken)


if __name__ == '__main__':
    unittest.main()
