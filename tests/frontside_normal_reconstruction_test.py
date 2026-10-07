"""Meaningful synthetic geometry checks for the conservative normal proposer."""
import sys,unittest
from pathlib import Path
import numpy as np
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from frontside_normal_reconstruction import reconstruct,prune_repeated_position_fans

class ReconstructionTests(unittest.TestCase):
    def test_defined_normal_bits_and_nonzero_area_direction(self):
        p=np.array([[0,0,0],[1,0,0],[0,1,0]],np.float32);n=np.array([[0,0,0],[0,0,1],[0,0,1]],np.float32)
        out,changes,blocked=reconstruct(p,n,np.array([[0,1,2]]))
        self.assertEqual(blocked,[]);self.assertEqual(len(changes),1)
        np.testing.assert_array_equal(out,np.array([[0,0,1],[0,0,1],[0,0,1]],np.float32))
    def test_isolated_exact_duplicate_has_verified_support(self):
        p=np.array([[0,0,0],[1,0,0],[0,1,0],[0,0,0]],np.float32);n=np.array([[0,0,1]]*3+[[0,0,0]],np.float32)
        out,changes,blocked=reconstruct(p,n,np.array([[0,1,2],[0,3,3]]))
        self.assertFalse(blocked);self.assertEqual(changes[0]['method'],'exact-position-area-support');self.assertEqual(out[3].tolist(),[0,0,1])
    def test_conflicting_hard_corner_and_no_axis_fallback(self):
        p=np.array([[0,0,0],[1,0,0],[0,1,0],[0,0,1],[9,9,9]],np.float32);n=np.zeros((5,3),np.float32)
        out,changes,blocked=reconstruct(p,n,np.array([[0,1,2],[0,3,1]]))
        self.assertTrue(any(r['vertex']==0 and r['maximumDisagreementDegrees']>15 for r in blocked))
        self.assertTrue(any(r['vertex']==4 and r['reason']=='No geometric direction' for r in blocked))
        self.assertEqual(out[0].tolist(),[0,0,0]);self.assertEqual(out[4].tolist(),[0,0,0])
    def test_exact_degenerate_cleanup_preserves_every_drawn_corner(self):
        p=np.array([[0,0,0],[0,0,0],[1,0,0],[0,1,0]],np.float32);ix=np.array([[0,1,2],[1,2,3]])
        new,vertices,faces,dropped=prune_repeated_position_fans(p,ix,[0])
        self.assertEqual(dropped.tolist(),[0]);self.assertEqual(faces.tolist(),[1]);self.assertEqual(vertices.tolist(),[1,2,3])
        np.testing.assert_array_equal(p[vertices][new],p[ix[1:]])
    def test_near_duplicate_and_collinear_distinct_points_never_prune(self):
        p=np.array([[0,0,0],[1e-9,0,0],[1,0,0]],np.float32)
        with self.assertRaises(ValueError):prune_repeated_position_fans(p,np.array([[0,1,2]]),[0])
    def test_nonfinite_input_is_rejected(self):
        p=np.array([[np.nan,0,0],[1,0,0],[0,1,0]],np.float32)
        with self.assertRaises(ValueError):reconstruct(p,np.zeros((3,3),np.float32),np.array([[0,1,2]]))

if __name__=='__main__':unittest.main()
